# Tài liệu Luồng Tính lương (Payroll Flow)

## Mục lục

1. [Tổng quan Module Lương](#1-tổng-quan-module-lương)
2. [Luồng Tính lương Đơn lẻ](#2-luồng-tính-lương-đơn-lẻ)
3. [Luồng Tính lương Hàng loạt Bất đồng bộ](#3-luồng-tính-lương-hàng-loạt-bất-đồng-bộ)
4. [Luồng Phê duyệt Bảng lương](#4-luồng-phê-duyệt-bảng-lương)
5. [Luồng Tính lương Tự động (Scheduler)](#5-luồng-tính-lương-tự-động-scheduler)
6. [Công thức Tính lương Chi tiết](#6-công-thức-tính-lương-chi-tiết)
7. [Luồng Cấu hình Hệ thống (SystemConfig)](#7-luồng-cấu-hình-hệ-thống-systemconfig)
8. [Biểu đồ Trạng thái Payroll](#8-biểu-đồ-trạng-thái-payroll)

---

## 1. Tổng quan Module Lương

```mermaid
graph TB
    subgraph Input["Dữ liệu đầu vào"]
        EMP[EmployeeInfo]
        CTR[Contract\nbaseSalary, positionCode, insuranceBase]
        ATT[Attendance Records\npaidDay, violation]
        OTR[OTRequest Approved\nstartTime, endTime]
        PHD[PublicHoliday\nDanh sách ngày lễ]
    end

    subgraph Config["SystemConfig (PostgreSQL JSONB)"]
        SG[SALARY_GRADE\nHệ số vị trí]
        AL[ALLOWANCE\nPhụ cấp HT2, HT1]
        PT[PIT\nBiểu thuế TNCN]
        IN[INSURANCE\nTỷ lệ BHXH/BHYT/BHTN]
    end

    subgraph Engine["PayrollCalculationEngine\nPure computation, no DB"]
        CALC[buildPayroll\nTính toán không có DB access]
    end

    subgraph Services["Services"]
        PS[PayrollService\nSingle employee]
        PBS[PayrollBatchService\nBulk async]
        PCS[PayrollConfigService\nIn-memory cache]
    end

    subgraph Output["Kết quả"]
        PAY[Payroll entity\nDRAFT status\nSave vào DB]
    end

    subgraph JobTracking["Job Tracking (In-memory)"]
        JB[PayrollJobStore\nConcurrentHashMap]
        JR[PayrollJobRecord\nAtomicInteger counters\nvolatile state]
    end

    Input --> Engine
    Config --> PCS
    PCS -->|In-memory cache| Engine
    Engine --> PS
    Engine --> PBS
    PS --> PAY
    PBS --> PAY
    PBS --> JB
    JB --> JR
```

---

## 2. Luồng Tính lương Đơn lẻ

### 2.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Finance Admin]) -->|POST /api/payrolls/calculate\nPayrollCalculateRequest| B[PayrollController]
    B --> C[PayrollService.calculate]
    C --> D[Load Employee + Contract\ntừ DB]
    D --> E{Contract hợp lệ\n= current=true?}
    E -->|Không| F[400 Bad Request\nNo active contract]
    E -->|Có| G[Load Attendance records\ntrong kỳ tính lương]
    G --> H[Load OTRequest APPROVED\ntrong kỳ tính lương]
    H --> I[Load PublicHoliday\ntrong kỳ]
    I --> J[PayrollCalculationEngine.buildPayroll\nTất cả dữ liệu đã load]
    J --> K{Đã có bản lương\ncùng tháng/năm?}
    K -->|Có| L[400 Bad Request\nĐã tính lương tháng này]
    K -->|Không| M[Save Payroll\nstatus = DRAFT]
    M --> N[200 OK PayrollResponse]
```

### 2.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant FA as Finance Admin
    participant CTL as PayrollController
    participant SVC as PayrollService
    participant ENG as PayrollCalculationEngine
    participant CFG as PayrollConfigService
    participant DB as PostgreSQL

    FA->>CTL: POST /api/payrolls/calculate {employeeId, year:2025, month:4, kpi1:A}
    CTL->>SVC: calculate(req)
    activate SVC

    SVC->>DB: findEmployee(employeeId)
    SVC->>DB: findActiveContract(employeeId)
    SVC->>DB: findAttendance(employeeId, year, month)
    SVC->>DB: findApprovedOT(employeeId, year, month)
    SVC->>DB: findPublicHolidays(year, month)

    SVC->>DB: existsByEmployeeAndPeriod(employeeId, 2025, 4)
    alt Đã tồn tại
        SVC-->>CTL: BadRequestException
        CTL-->>FA: 400 Bad Request
    else Chưa tồn tại
        SVC->>ENG: buildPayroll(employee, contract, attendances, otRequests, holidays, req)
        activate ENG
        ENG->>CFG: getPositionCoefficient(positionCode, salaryStep)
        ENG->>CFG: getLivingAllowance(employeeLevel)
        ENG->>CFG: getJapaneseAllowance(jlptLevel)
        ENG->>CFG: calculatePit(taxableIncome, year)
        ENG->>ENG: computeKpi(attendance, kpi1, kpi2)
        ENG->>ENG: computeOtPay(otRequests, baseSalary, holidays)
        ENG->>ENG: computeInsurance(contract)
        ENG-->>SVC: Payroll (unsaved DRAFT)
        deactivate ENG

        SVC->>DB: save(payroll)
        SVC-->>CTL: PayrollResponse
        CTL-->>FA: 200 OK {payrollId, status:DRAFT, netSalary, ...}
    end
    deactivate SVC
```

---

## 3. Luồng Tính lương Hàng loạt Bất đồng bộ

### 3.1 Biểu đồ Luồng Tổng thể (Flowchart)

```mermaid
flowchart TD
    A([Finance Admin]) -->|POST /api/payrolls/batch-calculate\nyear, month, standardWorkingDays| B[PayrollController]
    B --> C[PayrollBatchService.triggerBatch\nChạy trên HTTP thread]
    C --> D[PayrollJobStore.createJob\njobId = UUID\nstate = PENDING]
    D --> E[Gọi batchService.runBatch\ntrên INJECTED bean qua proxy]
    E --> F[202 Accepted\njobId trả về ngay]
    F --> G([Finance Admin polling\nGET /api/payrolls/jobs/jobId])

    E -->|@Async payrollExecutor\nThread pool riêng| H[PayrollBatchService.runBatch]
    H --> I[job.state = RUNNING\njob.startedAt = now]
    I --> J[Load tất cả Employee ACTIVE\n1 query]
    J --> K{Có nhân viên?}
    K -->|Không| L[job.state = COMPLETED]
    K -->|Có| M[Load IDs đã tính lương\ntrong tháng - 1 query]
    M --> N[Bulk load tất cả dữ liệu\n4 queries: contracts, attendance, OT, holidays]
    N --> O{Duyệt từng nhân viên\ntrong memory}
    O --> P{Đã tính lương?}
    P -->|Có| Q[job.skipped++]
    P -->|Không| R{Contract hợp lệ?}
    R -->|Không| S[job.failedCount++\njob.errors.add]
    R -->|Có| T[PayrollCalculationEngine.buildPayroll\nno DB call]
    T --> U{Exception?}
    U -->|Có| S
    U -->|Không| V[payrolls.add\njob.succeeded++]
    Q --> W{Còn nhân viên?}
    S --> W
    V --> W
    W -->|Có| O
    W -->|Không| X[payrollRepository.saveAll\n1 batch insert]
    X --> Y[job.state = COMPLETED\njob.completedAt = now]
    Y --> Z([Finance Admin xem kết quả\nGET /api/payrolls/jobs/jobId])
```

### 3.2 Biểu đồ Trình tự Chi tiết (Sequence Diagram)

```mermaid
sequenceDiagram
    participant FA as Finance Admin
    participant CTL as PayrollController
    participant PBS as PayrollBatchService
    participant JBS as PayrollJobStore
    participant ENG as PayrollCalculationEngine
    participant DB as PostgreSQL

    FA->>CTL: POST /api/payrolls/batch-calculate {year:2025, month:4}
    CTL->>PBS: triggerBatch(2025, 4, nt=26) — HTTP thread
    activate PBS

    PBS->>JBS: createJob(2025, 4, 26)
    JBS->>JBS: jobId = UUID\nJobRecord {state:PENDING}
    JBS-->>PBS: jobId

    Note over PBS: Gọi this.runBatch() qua INJECTED bean proxy
    PBS->>PBS: batchService.runBatch(jobId, 2025, 4, 26)
    Note over PBS: @Async → Spring proxy gửi lên thread pool "payrollExecutor"
    PBS-->>CTL: void (returns immediately)
    deactivate PBS

    CTL-->>FA: 202 Accepted {jobId, state:PENDING}

    Note over PBS,DB: Thread pool thực thi bất đồng bộ
    activate PBS
    PBS->>JBS: job.state = RUNNING, startedAt = now

    PBS->>DB: findByStatusAndDeleteFlagFalse(ACTIVE) — all active employees
    DB-->>PBS: List<EmployeeInfo> (N employees)

    PBS->>DB: findEmployeeIdsWithPayrollForPeriod(2025, 4, employeeIds)
    DB-->>PBS: Set<String> alreadyProcessed

    PBS->>DB: findActiveByEmployeeIds(employeeIds) — JOIN FETCH
    PBS->>DB: findByEmployeeIdsAndDateRange(employeeIds, firstDay, lastDay)
    PBS->>DB: findByEmployeeIdsAndStatusAndStartTimeBetween(APPROVED, ...)
    PBS->>DB: findHolidayDatesBetween(firstDay, lastDay)
    Note over PBS: Bulk load — 0 DB calls trong loop

    loop Mỗi nhân viên
        alt alreadyProcessed
            PBS->>JBS: job.skipped.incrementAndGet()
        else Contract không hợp lệ
            PBS->>JBS: job.failedCount++, errors.add("empId: No contract")
        else OK
            PBS->>ENG: buildPayroll(employee, contract, attendances, otList, holidays, nt)
            ENG-->>PBS: Payroll (DRAFT, unsaved)
            PBS->>JBS: job.succeeded.incrementAndGet()
        end
    end

    PBS->>DB: payrollRepository.saveAll(payrolls) — batch insert
    PBS->>JBS: job.state = COMPLETED, completedAt = now
    deactivate PBS

    Note over FA: Polling kết quả
    FA->>CTL: GET /api/payrolls/jobs/{jobId}
    CTL->>JBS: get(jobId)
    JBS-->>FA: PayrollJobResponse {state:COMPLETED, total:150, succeeded:148, skipped:1, failed:1}
```

### 3.3 Thread Safety của Job Record

```mermaid
graph LR
    subgraph HTTP_Thread["HTTP Thread (polling)"]
        POLL[GET /api/payrolls/jobs/jobId\nĐọc snapshot]
    end

    subgraph Async_Thread["Async Thread (payrollExecutor)"]
        WRITE[Ghi counters\nGhi state]
    end

    subgraph JobRecord["PayrollJobRecord (shared state)"]
        VOL[volatile:\nstate\nstartedAt\ncompletedAt\nfailureReason]
        ATM[AtomicInteger:\ntotal\nsucceeded\nskipped\nfailed]
        CWA[CopyOnWriteArrayList:\nerrors]
    end

    HTTP_Thread -->|Read| VOL
    HTTP_Thread -->|Read| ATM
    HTTP_Thread -->|Read| CWA
    Async_Thread -->|Write| VOL
    Async_Thread -->|incrementAndGet| ATM
    Async_Thread -->|add| CWA
```

---

## 4. Luồng Phê duyệt Bảng lương

### 4.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A[DRAFT] -->|Finance Admin\nPATCH /submit| B[PENDING_APPROVAL]
    B -->|Director\nPATCH /approve| C[APPROVED]
    B -->|Director / Admin\nPATCH /reject| D[REJECTED]
    C -->|Finance Admin\nPATCH /mark-paid| E[PAID]
    A -->|Finance Admin\nDELETE| F[Xóa khỏi DB\nChỉ được xóa DRAFT]

    C -->|AFTER_COMMIT| G[Publish PayrollApprovedEvent]
    G --> H[NotificationService\nGửi thông báo nhân viên]
```

### 4.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant FA as Finance Admin
    participant DIR as Director
    participant PS as PayrollService
    participant EVT as Spring EventBus
    participant NTF as NotificationService
    participant DB as PostgreSQL

    FA->>PS: PATCH /api/payrolls/{id}/submit
    PS->>DB: UPDATE status=PENDING_APPROVAL WHERE status=DRAFT
    PS-->>FA: 200 OK {status: PENDING_APPROVAL}

    DIR->>PS: PATCH /api/payrolls/{id}/approve
    PS->>DB: UPDATE status=APPROVED WHERE status=PENDING_APPROVAL
    PS->>EVT: publish(PayrollApprovedEvent {employeeId, 2025, 4})
    PS-->>DIR: 200 OK {status: APPROVED}

    Note over EVT,NTF: Async AFTER_COMMIT
    EVT->>NTF: onPayrollApproved
    NTF->>DB: INSERT notification {type: PAYROLL_APPROVED}

    FA->>PS: PATCH /api/payrolls/{id}/mark-paid
    PS->>DB: UPDATE status=PAID WHERE status=APPROVED
    PS-->>FA: 200 OK {status: PAID}
```

---

## 5. Luồng Tính lương Tự động (Scheduler)

```mermaid
flowchart TD
    A([Cron: ngày 1 hàng tháng]) --> B[PayrollScheduler\n.runMonthlyPayroll]
    B --> C[Tính year và month\ncủa tháng trước\nvd: ngày 1/5 → tháng 4]
    C --> D[PayrollBatchService.triggerBatch\nyear, month, nt=null=default]
    D --> E[Tạo job PENDING\nChạy async trên thread pool]
    E --> F[Log INFO\nAuto-triggered payroll batch for year/month]
    F --> G([Job chạy bất đồng bộ\nXem luồng Batch ở trên])
```

---

## 6. Công thức Tính lương Chi tiết

### 6.1 Công thức Lương Gộp (Gross Salary)

```mermaid
flowchart TD
    subgraph KPI["Tính KPI Trung bình"]
        K1[KPI1 = từ kpi1Score\nA=1.04 / B=1.00 / C=0.98]
        K2{kpi2Score\nprovided?}
        K2 -->|Có| K2M[KPI2 manual\nA=1.04 / B=1.02 / C=1.00]
        K2 -->|Không - auto| K2A{Có violation\ntrong tháng?}
        K2A -->|Có| KV[KPI2 = 1.00]
        K2A -->|Không| K2U{Có nghỉ\nkhông lương?}
        K2U -->|Có| KU[KPI2 = 1.02]
        K2U -->|Không| KP[KPI2 = 1.04 Hoàn hảo]
        K1 --> KAVG[KPItb = KPI1 + KPI2 / 2]
        K2M --> KAVG
        KV --> KAVG
        KU --> KAVG
        KP --> KAVG
    end

    subgraph Allowances["Tính Phụ cấp HTi"]
        HT2[HT2 = Living Allowance\ntheo Employee Level\nconfig ALLOWANCE]
        HT1[HT1 = Japanese Allowance\nN1/N2 level\nconfig ALLOWANCE]
        HT3[HT3 = ODC Project Allowance\ntừ request]
        HTI[HTi = HT2 + HT1 + HT3]
    end

    subgraph Gross["Công thức Gross Base"]
        LHQ[Lhq = baseSalary\ntừ Contract]
        LI[Li = Position Coefficient\npositionCode + salaryStep\nconfig SALARY_GRADE]
        NCTT[NCtt = Số ngày công thực tế\nCOUNT attendance WHERE paidDay gt 0]
        NT[Nt = Số ngày công chuẩn\ndefault 26]
        GB[GrossBase = Lhq x KPItb + Li + HTi x NCtt / Nt]
    end

    KAVG --> GB
    HTI --> GB
    LHQ --> GB
    LI --> GB
    NCTT --> GB
    NT --> GB

    GB --> TGROSS[TotalGross = GrossBase + OT_Pay + Bonus]
```

### 6.2 Công thức Tính lương OT

```mermaid
flowchart TD
    A[Danh sách OTRequest APPROVED\ntrong kỳ] --> B{Duyệt từng\nOT request}
    B --> C[HourlyWage = Lhq / Nt x 8]
    C --> D{Loại ngày?}
    D -->|Ngày lễ| E[baseRate = 3.0x]
    D -->|Cuối tuần Sat/Sun| F[baseRate = 2.0x]
    D -->|Ngày thường| G[baseRate = 1.5x]
    E --> H[Tính nightMinutes\ntrong 22:00 - 06:00]
    F --> H
    G --> H
    H --> I[dayMinutes = total - nightMinutes]
    I --> J[OT_Pay += HourlyWage/60 x\ndayMinutes x baseRate\n+ nightMinutes x baseRate+0.3]
    J --> K{Còn OT\ntiếp theo?}
    K -->|Có| B
    K -->|Không| L[Total OT_Pay\nlàm tròn VND]
```

### 6.3 Công thức Bảo hiểm & Thuế TNCN

```mermaid
flowchart TD
    subgraph Insurance["Bảo hiểm xã hội"]
        IB[InsuranceBase = min\ncontract.insuranceBase, 20 x MinWage\nCap: 46.8M VND Nghị định 293/2025]
        BHXH_E[BHXH nhân viên = IB x 8%]
        BHYT_E[BHYT nhân viên = IB x 1.5%]
        BHTN_E[BHTN nhân viên = IB x 1%]
        TOTAL_EMP_INS[Tổng khấu trừ NV\n= BHXH + BHYT + BHTN]
    end

    subgraph PIT["Thuế Thu nhập Cá nhân"]
        TI[TaxableIncome = TotalGross\n- BHXH - BHYT - BHTN\n- PersonalRelief 15.5M/tháng\n- DependentRelief 6.2M x dependents]
        TIC[Clamp >= 0]
        PITC[PIT = Tính theo biểu thuế lũy tiến\ntừ SystemConfig PIT\nCông thức mỗi bậc:\nincome x rate - quick_deduction]
    end

    subgraph Net["Lương Thực nhận"]
        NET[NetSalary = TotalGross\n- BHXH - BHYT - BHTN\n- PIT]
    end

    subgraph Employer["Chi phí Chủ lao động"]
        BHXH_ER[BHXH chủ = IB x 17%]
        BHYT_ER[BHYT chủ = IB x 3%]
        BHTN_ER[BHTN chủ = IB x 1%]
        ACCI[Bảo hiểm TNLĐ = IB / 200]
        TOTAL_ER[TotalEmployerContrib\n= BHXH + BHYT + BHTN + TNLD]
        TOTAL_COST[TotalEmploymentCost\n= TotalGross + TotalEmployerContrib]
    end

    IB --> BHXH_E
    IB --> BHYT_E
    IB --> BHTN_E
    TOTAL_EMP_INS --> TI
    TI --> TIC --> PITC
    PITC --> NET
    TOTAL_EMP_INS --> NET
    IB --> BHXH_ER
    IB --> BHYT_ER
    IB --> BHTN_ER
    IB --> ACCI
```

---

## 7. Luồng Cấu hình Hệ thống (SystemConfig)

### 7.1 Tổng quan SystemConfig

```mermaid
flowchart TD
    subgraph Types["4 loại cấu hình"]
        SG[SALARY_GRADE\nHệ số lương theo vị trí\nvà bậc lương]
        AL[ALLOWANCE\nPhụ cấp theo cấp bậc\nHT2 ăn ca, HT1 tiếng Nhật]
        PT[PIT\nBiểu thuế TNCN\nGiảm trừ bản thân + phụ thuộc]
        IN[INSURANCE\nTỷ lệ BHXH/BHYT/BHTN\nMức lương tối thiểu vùng]
    end

    subgraph Rules["Quy tắc"]
        R1[Mỗi loại có nhiều version\nChỉ 1 version active=true]
        R2[Activate version mới\ntự động deactivate version cũ]
        R3[PayrollConfigService load\nvào in-memory cache khi activate]
    end

    SG --> R1
    AL --> R1
    PT --> R1
    IN --> R1
```

### 7.2 Luồng Kích hoạt Cấu hình mới

```mermaid
sequenceDiagram
    participant FA as Finance Admin
    participant CTL as SystemConfigController
    participant SCS as SystemConfigService
    participant PCS as PayrollConfigService
    participant DB as PostgreSQL

    FA->>CTL: POST /api/system-configs {configType:PIT, version:"2026", configData:{...}}
    CTL->>SCS: create(req, username)
    SCS->>DB: INSERT system_config {active=false, version="2026"}
    SCS-->>FA: 200 OK {id, active:false}

    FA->>CTL: PATCH /api/system-configs/{id}/activate
    CTL->>SCS: activate(id, username)
    SCS->>DB: UPDATE system_config SET active=false WHERE configType=PIT AND active=true
    SCS->>DB: UPDATE system_config SET active=true WHERE id=?

    SCS->>PCS: reload()
    PCS->>DB: findByConfigTypeAndActiveTrue(PIT)
    DB-->>PCS: SystemConfig {configData: JsonNode}
    PCS->>PCS: Parse + cache PIT brackets in memory
    Note over PCS: Lần tính lương tiếp theo dùng biểu thuế mới

    SCS-->>FA: 200 OK {id, active:true, version:"2026"}
```

---

## 8. Biểu đồ Trạng thái Payroll

```mermaid
stateDiagram-v2
    [*] --> DRAFT : calculate / batch-calculate\nPayrollCalculationEngine

    DRAFT : DRAFT\n● Vừa tính xong\n● Có thể xóa\n● Finance Admin xem

    DRAFT --> PENDING_APPROVAL : Finance Admin\nPATCH /submit

    PENDING_APPROVAL : PENDING_APPROVAL\n● Chờ Director duyệt\n● Finance Admin không sửa được

    PENDING_APPROVAL --> APPROVED : Director\nPATCH /approve\n[Publish PayrollApprovedEvent]

    PENDING_APPROVAL --> REJECTED : Director / Admin\nPATCH /reject {reason}

    APPROVED : APPROVED\n● Nhân viên nhận thông báo\n● Nhân viên xem được payslip\n● Tính vào báo cáo lương

    APPROVED --> PAID : Finance Admin\nPATCH /mark-paid

    PAID : PAID\n● Đã chuyển khoản thực tế\n● Trạng thái cuối

    REJECTED : REJECTED\n● Ghi nhận lý do\n● Cần tính lại từ đầu

    DRAFT --> DELETED : DELETE /api/payrolls/{id}\nChỉ DRAFT mới xóa được
```
