# Tài liệu Luồng Tính lương (Payroll Flow) — v2

> **Thay đổi so với v1:** Ghi rõ in-memory job store mất dữ liệu khi restart; document luồng xử lý sau REJECTED (payroll bị reject không thể xóa — là gap); thêm note về single-instance config cache; ghi rõ không có timeout batch; bổ sung giả định infrastructure.

## Mục lục

1. [Tổng quan Module Lương & Giả định](#1-tổng-quan-module-lương--giả-định)
2. [Luồng Tính lương Đơn lẻ](#2-luồng-tính-lương-đơn-lẻ)
3. [Luồng Tính lương Hàng loạt Bất đồng bộ](#3-luồng-tính-lương-hàng-loạt-bất-đồng-bộ)
4. [Luồng Phê duyệt Bảng lương](#4-luồng-phê-duyệt-bảng-lương)
5. [Luồng Tính lương Tự động (Scheduler)](#5-luồng-tính-lương-tự-động-scheduler)
6. [Công thức Tính lương Chi tiết](#6-công-thức-tính-lương-chi-tiết)
7. [Luồng Cấu hình Hệ thống (SystemConfig)](#7-luồng-cấu-hình-hệ-thống-systemconfig)
8. [Biểu đồ Trạng thái Payroll](#8-biểu-đồ-trạng-thái-payroll)
9. [Giới hạn Đã biết](#9-giới-hạn-đã-biết)

---

## 1. Tổng quan Module Lương & Giả định

```mermaid
graph TB
    subgraph Input["Dữ liệu đầu vào"]
        EMP[EmployeeInfo]
        CTR[Contract\nbaseSalary, positionCode, insuranceBase]
        ATT[Attendance Records\npaidDay, violation]
        OTR[OTRequest Approved\nstartTime, endTime]
        PHD[PublicHoliday\nDanh sách ngày lễ]
    end

    subgraph Config["SystemConfig (PostgreSQL JSONB)\nIn-memory cache — single-instance"]
        SG[SALARY_GRADE]
        AL[ALLOWANCE]
        PT[PIT]
        IN[INSURANCE]
    end

    subgraph Engine["PayrollCalculationEngine\nPure computation — no DB, no side effects\nDễ unit test độc lập"]
        CALC[buildPayroll]
    end

    subgraph Services["Services"]
        PS[PayrollService\nSingle employee]
        PBS[PayrollBatchService\nBulk async]
        PCS["PayrollConfigService\nIn-memory cache\n⚠ Single-instance only"]
    end

    subgraph Output["Kết quả"]
        PAY[Payroll DRAFT → DB]
    end

    subgraph JobTracking["Job Tracking\n⚠ In-memory ConcurrentHashMap\nMất khi JVM restart"]
        JB[PayrollJobStore]
        JR[PayrollJobRecord\nAtomicInteger + volatile]
    end

    Input --> Engine
    Config --> PCS
    PCS -->|Cache| Engine
    Engine --> PS
    Engine --> PBS
    PS --> PAY
    PBS --> PAY
    PBS --> JB
    JB --> JR
```

> **Giả định Infrastructure:**
> - **Single-instance deployment.** `PayrollConfigService` cache in-memory — khi activate SystemConfig mới, chỉ instance nhận request mới reload cache. Instances khác dùng config cũ đến khi restart.
> - **Job history không persistent.** `PayrollJobStore` là `ConcurrentHashMap` in-memory. Server restart → mất toàn bộ job history. Finance Admin không thể tra cứu batch cũ sau restart.
> - **Scheduler tự động không có override.** Cron ngày 1 hàng tháng trigger batch tự động. Không có cơ chế pause/skip từ UI.

---

## 2. Luồng Tính lương Đơn lẻ

### 2.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Finance Admin]) -->|POST /api/payrolls/calculate\nPayrollCalculateRequest| B[PayrollController]
    B --> C[PayrollService.calculate]
    C --> D[Load Employee + Contract từ DB]
    D --> E{Contract hợp lệ\ncurrent=true?}
    E -->|Không| F[400 Bad Request\nNo active contract]
    E -->|Có| G[Load Attendance, OT APPROVED\nPublicHoliday trong kỳ]
    G --> H{Đã có Payroll\ncùng employee/tháng/năm?}
    H -->|Có| I[400 Bad Request\nUnique constraint violation]
    H -->|Không| J[PayrollCalculationEngine.buildPayroll\nTất cả dữ liệu truyền vào — no DB]
    J --> K[Save Payroll\nstatus = DRAFT]
    K --> L[200 OK PayrollResponse]
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

    SVC->>DB: findEmployee, findActiveContract, findAttendance, findApprovedOT, findHolidays
    SVC->>DB: existsByEmployeeAndPeriod(employeeId, 2025, 4)

    alt Đã tồn tại
        SVC-->>CTL: BadRequestException — unique constraint
        CTL-->>FA: 400 Bad Request
    else Chưa tồn tại
        SVC->>ENG: buildPayroll(employee, contract, attendances, otRequests, holidays, req)
        activate ENG
        ENG->>CFG: getPositionCoefficient / getLivingAllowance / calculatePit / ...
        Note over CFG: Đọc từ in-memory cache\nReload khi SystemConfig được activate
        ENG->>ENG: computeKpi / computeOtPay / computeInsurance
        ENG-->>SVC: Payroll (unsaved DRAFT, no side effects)
        deactivate ENG

        SVC->>DB: save(payroll) {status: DRAFT}
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
    A([Finance Admin]) -->|POST /api/payrolls/batch-calculate\nyear, month| B[PayrollController]
    B --> C["PayrollBatchService.triggerBatch\nHTTP thread — trả về ngay"]
    C --> D["PayrollJobStore.createJob\njobId = UUID, state = PENDING\n⚠ In-memory — mất khi restart"]
    D --> E[Gọi batchService.runBatch\ntrên INJECTED bean qua Spring proxy]
    E --> F[202 Accepted\njobId trả về ngay]
    F --> G([Finance Admin polling\nGET /api/payrolls/jobs/jobId])

    E -->|"@Async payrollExecutor\nThread pool riêng"| H[PayrollBatchService.runBatch]
    H --> I[job.state = RUNNING\nstartedAt = now]
    I --> J[Load all ACTIVE employees — 1 query]
    J --> K{Có nhân viên?}
    K -->|Không| L[job.state = COMPLETED]
    K -->|Có| M[Load IDs đã tính — 1 query]
    M --> N[Bulk load contracts, attendance, OT, holidays — 4 queries]
    N --> O{Duyệt từng nhân viên\nin-memory — 0 DB calls}
    O --> P{Đã tính lương?}
    P -->|Có| Q[skipped++]
    P -->|Không| R{Contract OK?}
    R -->|Không| S[failed++\nerrors.add]
    R -->|Có| T[buildPayroll — no DB]
    T --> U{Exception?}
    U -->|Có| S
    U -->|Không| V[payrolls.add\nsucceeded++]
    Q --> W{Còn?}
    S --> W
    V --> W
    W -->|Có| O
    W -->|Không| X[saveAll — 1 batch insert]
    X --> Y[job.state = COMPLETED\ncompletedAt = now]

    H -->|"Exception uncaught\n⚠ Không có timeout"| Z[job.state = FAILED\nfailureReason = message]
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
    CTL->>PBS: triggerBatch(2025, 4, 26) — HTTP thread
    activate PBS

    PBS->>JBS: createJob(2025, 4, 26)
    JBS-->>PBS: jobId (stored in ConcurrentHashMap)

    Note over PBS: Gọi qua INJECTED bean proxy — bắt buộc để @Async hoạt động
    PBS->>PBS: injectedBean.runBatch(jobId, ...)
    Note over PBS: @Async → Spring proxy gửi lên thread pool "payrollExecutor"
    PBS-->>CTL: (returns immediately)
    deactivate PBS

    CTL-->>FA: 202 Accepted {jobId, state:PENDING}

    Note over PBS,DB: Async thread pool — song song với HTTP threads
    activate PBS
    PBS->>JBS: job.state = RUNNING

    PBS->>DB: 6 bulk queries để load toàn bộ dữ liệu
    Note over PBS: 0 DB calls trong loop bên dưới

    loop Mỗi nhân viên
        alt alreadyProcessed → skipped++
        else no contract → failed++, errors.add
        else OK
            PBS->>ENG: buildPayroll(...)
            ENG-->>PBS: Payroll DRAFT
            PBS->>JBS: succeeded++
        end
    end

    PBS->>DB: payrollRepository.saveAll(payrolls)
    PBS->>JBS: job.state = COMPLETED, completedAt = now
    deactivate PBS

    FA->>CTL: GET /api/payrolls/jobs/{jobId}
    CTL->>JBS: get(jobId)
    JBS-->>FA: {state:COMPLETED, total:150, succeeded:148, skipped:1, failed:1}
    Note over FA: ⚠ Nếu server restart sau khi job COMPLETED\njob record này sẽ mất
```

### 3.3 Thread Safety của Job Record

```mermaid
graph LR
    subgraph HTTP_Thread["HTTP Thread (polling)"]
        POLL[GET /api/payrolls/jobs/jobId\nĐọc snapshot]
    end

    subgraph Async_Thread["Async Thread (payrollExecutor)"]
        WRITE[Ghi state và counters]
    end

    subgraph JobRecord["PayrollJobRecord (shared — in-memory)"]
        VOL["volatile:\nstate JobState\nstartedAt\ncompletedAt\nfailureReason\n→ Write visible across threads ngay lập tức"]
        ATM["AtomicInteger:\ntotal / succeeded / skipped / failed\n→ Lock-free increment"]
        CWA["CopyOnWriteArrayList:\nerrors\n→ Thread-safe append"]
    end

    HTTP_Thread -->|Read| VOL
    HTTP_Thread -->|get| ATM
    HTTP_Thread -->|iterate| CWA
    Async_Thread -->|write volatile| VOL
    Async_Thread -->|incrementAndGet| ATM
    Async_Thread -->|add| CWA
```

---

## 4. Luồng Phê duyệt Bảng lương

### 4.1 Biểu đồ Trạng thái + Xử lý sau REJECTED

```mermaid
flowchart TD
    A[DRAFT] -->|Finance Admin\nPATCH /submit| B[PENDING_APPROVAL]
    B -->|Director\nPATCH /approve| C[APPROVED]
    B -->|Director / Admin\nPATCH /reject reason| D[REJECTED]
    C -->|Finance Admin\nPATCH /mark-paid| E[PAID]
    A -->|Finance Admin\nDELETE\nChỉ DRAFT mới xóa được| F[Xóa khỏi DB]

    C -->|AFTER_COMMIT| G[Publish PayrollApprovedEvent\nNotification → nhân viên]

    D --> H["⚠ Luồng xử lý sau REJECTED\nPayroll REJECTED không thể xóa\nUnique constraint employee+year+month\nFinance Admin KHÔNG thể tính lại\ncho cùng kỳ này"]
    H --> I{Cần tính lại?}
    I --> J["Finance Admin liên hệ System Admin\nhoặc xóa thủ công record REJECTED\ntrước khi gọi /calculate lại"]
```

> **Lưu ý:** Khi Payroll bị `REJECTED`, Finance Admin không có đường dùng API bình thường để tính lại:
> - `DELETE /api/payrolls/{id}` chỉ được phép nếu status = `DRAFT`.
> - `POST /api/payrolls/calculate` sẽ fail vì unique constraint `(employee_id, payroll_year, payroll_month)` đã tồn tại record `REJECTED`.
> - Cần xóa record `REJECTED` trực tiếp hoặc cần thêm endpoint `recalculate` để override.

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
    PS-->>FA: 200 OK

    DIR->>PS: PATCH /api/payrolls/{id}/approve
    PS->>DB: UPDATE status=APPROVED
    PS->>EVT: publish(PayrollApprovedEvent {employeeId, 2025, 4})
    PS-->>DIR: 200 OK

    Note over EVT,NTF: Async AFTER_COMMIT
    EVT->>NTF: onPayrollApproved
    NTF->>DB: INSERT notification

    FA->>PS: PATCH /api/payrolls/{id}/mark-paid
    PS->>DB: UPDATE status=PAID
    PS-->>FA: 200 OK

    Note over FA,PS: Luồng REJECTED
    DIR->>PS: PATCH /api/payrolls/{id}/reject {reason: "Sai KPI"}
    PS->>DB: UPDATE status=REJECTED, rejectionReason=reason
    PS-->>DIR: 200 OK

    FA->>PS: DELETE /api/payrolls/{id}
    PS->>DB: SELECT payroll {status: REJECTED}
    Note over PS: ⚠ status != DRAFT → không cho xóa
    PS-->>FA: 400 Bad Request — only DRAFT can be deleted
```

---

## 5. Luồng Tính lương Tự động (Scheduler)

```mermaid
flowchart TD
    A([Cron: ngày 1 hàng tháng]) --> B[PayrollScheduler\n.runMonthlyPayroll]
    B --> C[Tính year và month tháng trước\nvd: 1/5 → tháng 4/2025]
    C --> D["PayrollBatchService.triggerBatch\nyear, month, nt=null=default 26\n⚠ Tự động — Finance Admin không can thiệp được\nKhông có cơ chế pause/skip"]
    D --> E[Job PENDING → Async batch chạy]
    E --> F[Log INFO: Auto-triggered payroll batch]
    F --> G(["Job bất đồng bộ\nXem luồng Batch\n⚠ Nếu fail, không có alert tự động\nFinance Admin cần tự kiểm tra kết quả"])
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
        K2 -->|Không — auto từ Attendance| K2A{Có violation\ntrong tháng?}
        K2A -->|Có| KV[KPI2 = 1.00]
        K2A -->|Không| K2U{Có ngày\nUNPAID leave?}
        K2U -->|Có| KU[KPI2 = 1.02]
        K2U -->|Không| KP[KPI2 = 1.04]
        K1 --> KAVG[KPItb = KPI1 + KPI2 / 2]
        K2M --> KAVG
        KV --> KAVG
        KU --> KAVG
        KP --> KAVG
    end

    subgraph Allowances["Phụ cấp HTi — từ SystemConfig ALLOWANCE"]
        HT2[HT2 = Living Allowance theo Employee Level]
        HT1[HT1 = Japanese Allowance N1/N2]
        HT3[HT3 = ODC Project Allowance từ request]
        HTI[HTi = HT2 + HT1 + HT3]
    end

    subgraph Gross["Công thức Gross Base"]
        LHQ[Lhq = Contract.baseSalary]
        LI[Li = SystemConfig SALARY_GRADE\npositionCode + salaryStep]
        NCTT[NCtt = COUNT attendance WHERE paidDay gt 0]
        NT[Nt = standardWorkingDays default 26]
        GB["GrossBase = Lhq x KPItb + Li + HTi x NCtt / Nt"]
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
    A[OTRequest APPROVED trong kỳ] --> B{Duyệt từng OT}
    B --> C[HourlyWage = Lhq / Nt x 8]
    C --> D{Loại ngày?}
    D -->|Ngày lễ PublicHoliday| E[baseRate = 3.0x]
    D -->|Cuối tuần Sat/Sun| F[baseRate = 2.0x]
    D -->|Ngày thường| G[baseRate = 1.5x]
    E --> H[Tính nightMinutes trong 22:00 - 06:00]
    F --> H
    G --> H
    H --> I[dayMinutes = total - nightMinutes]
    I --> J["OT_Pay += HourlyWage/60 x\ndayMinutes x baseRate\n+ nightMinutes x baseRate+0.3 bù ca đêm"]
    J --> K{Còn?}
    K -->|Có| B
    K -->|Không| L[Total OT_Pay — làm tròn VND]
```

### 6.3 Công thức Bảo hiểm & Thuế TNCN

```mermaid
flowchart TD
    subgraph Insurance["Bảo hiểm xã hội — SystemConfig INSURANCE"]
        IB["InsuranceBase = min\ncontract.insuranceBase, 20 x MinWage\nCap: 46.8M VND — Nghị định 293/2025"]
        BHXH_E[BHXH nhân viên = IB x 8%]
        BHYT_E[BHYT nhân viên = IB x 1.5%]
        BHTN_E[BHTN nhân viên = IB x 1%]
    end

    subgraph PIT["Thuế TNCN lũy tiến — SystemConfig PIT"]
        TI["TaxableIncome = TotalGross\n- BHXH - BHYT - BHTN\n- PersonalRelief 15.5M/tháng\n- DependentRelief 6.2M x dependents\nClamp >= 0"]
        PITC["PIT = biểu thuế lũy tiến\nMỗi bậc: income x rate - quick_deduction"]
    end

    subgraph Net["Lương thực nhận"]
        NET[NetSalary = TotalGross - BHXH - BHYT - BHTN - PIT]
    end

    subgraph Employer["Chi phí chủ lao động — không khấu trừ NV"]
        BHXH_ER[BHXH chủ = IB x 17%]
        BHYT_ER[BHYT chủ = IB x 3%]
        BHTN_ER[BHTN chủ = IB x 1%]
        ACCI[Bảo hiểm TNLĐ = IB / 200]
        TOTAL_COST[TotalEmploymentCost = TotalGross + TotalEmployerContrib]
    end

    IB --> BHXH_E
    IB --> BHYT_E
    IB --> BHTN_E
    TI --> PITC --> NET
    IB --> BHXH_ER
    IB --> BHYT_ER
    IB --> BHTN_ER
    IB --> ACCI
```

---

## 7. Luồng Cấu hình Hệ thống (SystemConfig)

```mermaid
sequenceDiagram
    participant FA as Finance Admin
    participant CTL as SystemConfigController
    participant SCS as SystemConfigService
    participant PCS as PayrollConfigService
    participant DB as PostgreSQL

    FA->>CTL: POST /api/system-configs {configType:PIT, version:"2026", configData:{...}}
    CTL->>SCS: create(req, username)
    SCS->>DB: INSERT system_config {active=false}
    SCS-->>FA: 200 OK {id, active:false}

    FA->>CTL: PATCH /api/system-configs/{id}/activate
    CTL->>SCS: activate(id, username)
    SCS->>DB: UPDATE SET active=false WHERE configType=PIT AND active=true
    SCS->>DB: UPDATE SET active=true WHERE id=?

    SCS->>PCS: reload()
    PCS->>DB: findByConfigTypeAndActiveTrue(PIT)
    DB-->>PCS: SystemConfig {configData}
    PCS->>PCS: Parse + cache in-memory

    Note over PCS: ⚠ Chỉ instance này reload\nCác instance khác vẫn dùng cache cũ

    SCS-->>FA: 200 OK {active:true, version:"2026"}
```

---

## 8. Biểu đồ Trạng thái Payroll

```mermaid
stateDiagram-v2
    [*] --> DRAFT : calculate / batch-calculate

    DRAFT : DRAFT\n● Vừa tính xong\n● Có thể xóa DELETE\n● Finance Admin xem/kiểm tra

    DRAFT --> PENDING_APPROVAL : Finance Admin\nPATCH /submit

    PENDING_APPROVAL : PENDING_APPROVAL\n● Chờ Director duyệt

    PENDING_APPROVAL --> APPROVED : Director\nPATCH /approve\n→ PayrollApprovedEvent\n→ Nhân viên nhận notification

    PENDING_APPROVAL --> REJECTED : Director / Admin\nPATCH /reject {reason}

    APPROVED : APPROVED\n● Nhân viên xem payslip\n● Tính vào báo cáo lương

    APPROVED --> PAID : Finance Admin\nPATCH /mark-paid

    PAID : PAID\n● Trạng thái cuối\n● Đã chuyển khoản

    REJECTED : REJECTED\n● Lý do bị từ chối lưu lại\n● ⚠ Không thể DELETE qua API\n● ⚠ Không thể tính lại cùng kỳ\n● Cần xóa thủ công rồi recalculate

    DRAFT --> DELETED : DELETE /api/payrolls/{id}\nChỉ DRAFT
```

---

## 9. Giới hạn Đã biết

| Giới hạn | Mô tả | Mức độ ảnh hưởng |
|---|---|---|
| **Job tracking in-memory mất khi restart** | `PayrollJobStore` là `ConcurrentHashMap` trong JVM heap. Restart server mất toàn bộ job history. Finance Admin không tra cứu được batch cũ. | Trung bình — Chấp nhận được nếu có log đầy đủ. Nâng cấp: persist job record vào DB hoặc Redis. |
| **Không có timeout cho batch job** | Không có watchdog/timeout mechanism. Nếu batch bị treo (deadlock, OOM), job.state = RUNNING mãi mãi. Finance Admin không biết job treo hay đang chạy bình thường. | Trung bình — Cần thêm timeout hoặc heartbeat check. |
| **Scheduler tự động không có override** | Cron ngày 1 trigger batch tự động. Không có API để pause/skip/reschedule. Nếu cần hoãn tháng đó (nghỉ lễ, sự cố), phải can thiệp kỹ thuật (disable cron tạm thời). | Thấp — Tháng nào cũng cần tính lương, ít khi cần skip. |
| **Config cache không nhất quán khi multi-instance** | Khi activate SystemConfig mới, chỉ instance nhận request gọi `PCS.reload()`. Các instance khác vẫn dùng config cũ cho đến khi restart. | Cao nếu scale horizontally — Cần distributed cache (Redis) hoặc broadcast invalidation. |
| **REJECTED payroll không thể tính lại qua API** | `DELETE` chỉ cho phép status `DRAFT`. Unique constraint `(employee_id, year, month)` block `calculate` lại. Finance Admin phải yêu cầu xóa thủ công record `REJECTED` trước. | Cao về UX — Cần thêm endpoint `PATCH /api/payrolls/{id}/recalculate` hoặc cho phép `DELETE` status `REJECTED`. |
| **Batch scheduler fail không có alert** | Nếu cron tháng 1 fail (exception, DB down), không có alert tự động. Finance Admin phải chủ động poll job status để biết kết quả. | Trung bình — Cần thêm monitoring/alerting cho scheduled jobs. |
