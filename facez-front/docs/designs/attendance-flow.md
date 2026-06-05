# Tài liệu Luồng Xử Lý Chấm Công (Attendance Processing)

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Luồng Xác thực Thiết bị](#2-luồng-xác-thực-thiết-bị)
3. [Luồng Chấm công Thời gian Thực](#3-luồng-chấm-công-thời-gian-thực)
4. [Luồng Chấm công Hàng loạt (Batch)](#4-luồng-chấm-công-hàng-loạt-batch)
5. [Luồng Bù dữ liệu Tự động (Scheduled)](#5-luồng-bù-dữ-liệu-tự-động-scheduled)
6. [Luồng Tính toán Công](#6-luồng-tính-toán-công)
7. [Luồng Đóng Kỳ Chấm công](#7-luồng-đóng-kỳ-chấm-công)
8. [Biểu đồ Trạng thái Bản ghi Chấm công](#8-biểu-đồ-trạng-thái-bản-ghi-chấm-công)

---

## 1. Tổng quan hệ thống

```mermaid
graph TB
    subgraph Devices["Thiết bị Chấm công"]
        RT[Thiết bị Online<br/>Real-time]
        OF[Thiết bị Offline<br/>Batch Upload]
    end

    subgraph API["API Layer"]
        CLC[CheckinLogController<br/>/api/checkin-logs]
        ATC[AttendanceController<br/>/api/attendances]
        PHC[PublicHolidayController<br/>/api/public-holidays]
    end

    subgraph Services["Service Layer"]
        CLS[CheckinLogService]
        ATS[AttendanceService]
        PCS[PeriodCloseService]
        PHS[PublicHolidayService]
        SCF[SystemConfig<br/>WorkStart / HoursPerDay]
    end

    subgraph Scheduler["Scheduled Tasks"]
        SCH[AttendanceSchedule<br/>Cron: 00:00 daily]
    end

    subgraph DB["Database"]
        CL[(CheckinLog)]
        AT[(Attendance)]
        PH[(PublicHoliday)]
        PC[(AttendancePeriodClose)]
        AK[(ApiKey)]
    end

    subgraph Events["Spring Events"]
        EVT[CheckinProcessedEvent]
    end

    RT -->|POST /api/checkin-logs| CLC
    OF -->|POST /api/checkin-logs/batch| CLC
    CLC --> CLS
    CLS -->|Save| CL
    CLS -->|Publish| EVT
    EVT -->|TransactionalEventListener AFTER_COMMIT| ATS
    ATS -->|Save/Update| AT
    ATS -->|Read| PH
    ATS -->|Read Config| SCF

    SCH -->|Daily backfill| ATS
    SCH -->|Read logs| CL

    ATC --> ATS
    ATC --> PCS
    PHC --> PHS
    PHS -->|Save/Delete| PH
    PCS -->|Read/Write| PC
    PCS -->|Read| AT
```

---

## 2. Luồng Xác thực Thiết bị

### 2.1 Tạo API Key cho Thiết bị

```mermaid
flowchart TD
    A([HR Admin]) -->|POST /api/devices/deviceId/api-key| B[DeviceController]
    B --> C{Device tồn tại?}
    C -->|Không| D[Throw ResourceNotFoundException]
    C -->|Có| E[ApiKeyService.generateApiKey]
    E --> F[Deactivate các API Key cũ<br/>của device này]
    F --> G[Tạo 32 bytes ngẫu nhiên<br/>SecureRandom]
    G --> H[Encode Base64 → rawKey]
    H --> I[Hash SHA-256 → keyHash]
    I --> J[Lưu ApiKey vào DB<br/>active=true, chỉ lưu keyHash]
    J --> K[Trả về ApiKeyResponse<br/>rawKey hiển thị 1 lần duy nhất]
    K --> L([HR Admin nhận rawKey<br/>cấu hình vào thiết bị])
```

### 2.2 Xác thực Thiết bị khi Gửi Checkin

```mermaid
sequenceDiagram
    participant DEV as Thiết bị
    participant DKAF as DeviceApiKeyFilter
    participant JWTF as JwtAuthFilter
    participant CTL as CheckinLogController
    participant DB as Database (ApiKey)

    DEV->>DKAF: POST /api/checkin-logs<br/>Header: X-Device-API-Key: {rawKey}
    activate DKAF
    DKAF->>DKAF: Extract rawKey từ header
    DKAF->>DKAF: Hash SHA-256(rawKey) → keyHash
    DKAF->>DB: findByKeyHashAndActiveTrue(keyHash)
    DB-->>DKAF: ApiKey record
    alt Key không tồn tại hoặc inactive
        DKAF-->>DEV: 401 Unauthorized
    else Key hợp lệ
        DKAF->>DKAF: Set SecurityContext<br/>principal="device:{deviceId}"<br/>authority=DEVICE_CHECKIN
        DKAF->>JWTF: Bỏ qua JwtAuthFilter
        DKAF->>CTL: Forward request
        CTL-->>DEV: 200 OK
    end
    deactivate DKAF
```

---

## 3. Luồng Chấm công Thời gian Thực

### 3.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Thiết bị gửi Checkin]) -->|POST /api/checkin-logs\nX-Device-API-Key header| B[DeviceApiKeyFilter\nXác thực thiết bị]
    B --> C{API Key hợp lệ?}
    C -->|Không| D[401 Unauthorized]
    C -->|Có| E[CheckinLogController]
    E --> F[CheckinLogService.processRealTime]
    F --> G[Validate: Employee tồn tại?]
    G -->|Không| H[Throw ResourceNotFoundException]
    G -->|Có| I[Validate: Device tồn tại?]
    I -->|Không| H
    I -->|Có| J[Tạo CheckinLog entity]
    J --> K[Save CheckinLog vào DB]
    K --> L[Publish CheckinProcessedEvent]
    L --> M[Trả về CheckinLogResponse<br/>cho thiết bị]

    L -->|AFTER_COMMIT| N[AttendanceService\n.onCheckinProcessed]
    N --> O{LogType = IN?}
    O -->|Có| P[processCheckinForAttendance\nlogType=IN]
    O -->|Không| Q[processCheckinForAttendance\nlogType=OUT]

    P --> R{Attendance hôm nay\nđã tồn tại?}
    R -->|Có| S[Bỏ qua / idempotent]
    R -->|Không| T[Tạo Attendance mới\ncheckIn = logTime]
    T --> U[computeAndApply\ntính lateHour]
    U --> V[Save Attendance]

    Q --> W[Tìm Attendance mở\ncheckOut IS NULL]
    W -->|Không tìm thấy| X[Log warning, bỏ qua]
    W -->|Tìm thấy| Y[Set checkOut = logTime]
    Y --> Z[computeAndApply\ntính workingHour, paidHour]
    Z --> AA[Save Attendance]
```

### 3.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant DEV as Thiết bị
    participant DKAF as DeviceApiKeyFilter
    participant CTL as CheckinLogController
    participant CLS as CheckinLogService
    participant ATS as AttendanceService
    participant DB as Database
    participant EVT as Spring EventBus

    DEV->>DKAF: POST /api/checkin-logs {employeeId, deviceId, logTime, logType}
    DKAF->>DB: Validate API Key (SHA-256 hash)
    DB-->>DKAF: ApiKey valid
    DKAF->>CTL: Forward (DEVICE_CHECKIN authority)

    CTL->>CLS: processRealTime(request)
    activate CLS

    CLS->>DB: findEmployee(employeeId)
    DB-->>CLS: EmployeeInfo
    CLS->>DB: findDevice(deviceId)
    DB-->>CLS: Device

    CLS->>CLS: Build CheckinLog entity
    CLS->>DB: save(checkinLog)
    DB-->>CLS: saved CheckinLog

    CLS->>EVT: publish(CheckinProcessedEvent)
    CLS-->>CTL: CheckinLogResponse
    CTL-->>DEV: 200 OK {logId, employeeName, logTime, logType}
    deactivate CLS

    Note over EVT,ATS: Sau khi transaction commit (AFTER_COMMIT)
    EVT->>ATS: onCheckinProcessed(event)
    activate ATS

    alt logType = IN
        ATS->>DB: findFirstByEmployeeAndDate (idempotency check)
        DB-->>ATS: null (không tồn tại)
        ATS->>ATS: buildAttendance(employee, logs, date)
        ATS->>ATS: computeAndApply(attendance, workStart, hoursPerDay)
        ATS->>DB: save(attendance) — checkIn set, lateHour tính
    else logType = OUT
        ATS->>DB: findOpenAttendance (checkOut IS NULL)
        DB-->>ATS: Attendance record
        ATS->>ATS: Set checkOut = logTime
        ATS->>ATS: computeAndApply(attendance, workStart, hoursPerDay)
        ATS->>DB: save(attendance) — checkOut, workingHour, paidHour updated
    end
    deactivate ATS
```

---

## 4. Luồng Chấm công Hàng loạt (Batch)

### 4.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Thiết bị Offline]) -->|POST /api/checkin-logs/batch\nList CheckinLogRequest| B[CheckinLogController]
    B --> C[CheckinLogService.processBatch]
    C --> D[Khởi tạo results list]
    D --> E{Duyệt từng log\ntrong danh sách}
    E --> F[processRealTime cho log i]
    F --> G{Thành công?}
    G -->|Có| H[Thêm BatchCheckinItem\nsuccess=true, index=i]
    G -->|Không - Exception| I[Thêm BatchCheckinItem\nsuccess=false\nerrorMessage=ex.message]
    H --> J{Còn log tiếp theo?}
    I --> J
    J -->|Có| E
    J -->|Không| K[Tổng hợp kết quả\ntotal, success, failed counts]
    K --> L[Trả về BatchCheckinResponse]
    L --> M([Thiết bị nhận\nbáo cáo từng bản ghi])
```

### 4.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant DEV as Thiết bị Offline
    participant CTL as CheckinLogController
    participant CLS as CheckinLogService
    participant ATS as AttendanceService
    participant DB as Database

    DEV->>CTL: POST /api/checkin-logs/batch [{log1}, {log2}, ..., {logN}]
    CTL->>CLS: processBatch(requests)
    activate CLS

    loop Mỗi log trong danh sách
        CLS->>CLS: processRealTime(log[i])
        CLS->>DB: save(checkinLog[i])

        alt Thành công
            CLS->>CLS: results[i] = {success: true, data: response}
            Note over CLS,ATS: Publish event → AttendanceService xử lý độc lập
        else Exception
            CLS->>CLS: results[i] = {success: false, error: message}
            Note over CLS: Tiếp tục log kế tiếp, không dừng
        end
    end

    CLS-->>CTL: BatchCheckinResponse {total, success, failed, results[]}
    deactivate CLS
    CTL-->>DEV: 200 OK (ngay cả khi có lỗi từng phần)

    Note over ATS: Xử lý bất đồng bộ sau commit<br/>cho từng log thành công
    ATS->>DB: Create/Update Attendance records
```

---

## 5. Luồng Bù dữ liệu Tự động (Scheduled)

### 5.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Cron Job: 00:00 hằng ngày]) --> B[AttendanceSchedule\n.processAttendanceForYesterday]
    B --> C[Tính ngày hôm qua\nLocalDate.now - 1]
    C --> D[Load tất cả CheckinLog\ncủa ngày hôm qua từ DB]
    D --> E{Có log nào không?}
    E -->|Không| F([Kết thúc - Không có log])
    E -->|Có| G[Nhóm logs theo\nemployeeId]
    G --> H{Duyệt từng\n nhóm employee}
    H --> I[buildAttendance\nemployee, logs, date]
    I --> J{Attendance ngày đó\nđã tồn tại?}
    J -->|Có| K[Cập nhật Attendance\nhiện có]
    J -->|Không| L[Tạo Attendance mới]
    K --> M[computeAndApply\nTính toán các chỉ số]
    L --> M
    M --> N[Save Attendance]
    N --> O{Còn nhóm\ntiếp theo?}
    O -->|Có| H
    O -->|Không| P([Kết thúc - Đã xử lý\ntất cả attendance])
```

### 5.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant CRON as Cron Scheduler
    participant SCH as AttendanceSchedule
    participant CLR as CheckinLogRepository
    participant ATS as AttendanceService
    participant ATR as AttendanceRepository
    participant DB as Database

    Note over CRON: Mỗi ngày lúc 00:00:00
    CRON->>SCH: processAttendanceForYesterday()
    activate SCH

    SCH->>SCH: yesterday = LocalDate.now().minusDays(1)
    SCH->>CLR: findByCheckinDateWithEmployee(yesterday)
    CLR->>DB: SELECT * FROM checkin_logs JOIN employees WHERE date = yesterday
    DB-->>CLR: List<CheckinLog>
    CLR-->>SCH: logs

    SCH->>SCH: Group logs by employeeId<br/>Map<employeeId, List<CheckinLog>>

    loop Mỗi employee có log
        SCH->>ATS: buildAttendance(employee, logs, yesterday)
        ATS->>ATS: Xác định checkIn (log IN đầu tiên)<br/>Xác định checkOut (log OUT cuối)
        ATS->>ATS: computeAndApply(attendance)

        ATS->>ATR: findFirstByEmployeeAndDate (idempotency)
        ATR->>DB: SELECT attendance WHERE employee=X AND date=yesterday
        DB-->>ATR: existing record (or null)
        ATR-->>ATS: Attendance | null

        alt Chưa có bản ghi
            ATS->>DB: INSERT attendance
        else Đã có bản ghi
            ATS->>DB: UPDATE attendance
        end
    end

    deactivate SCH
    Note over SCH: Backfill hoàn tất
```

---

## 6. Luồng Tính toán Công

### 6.1 Biểu đồ Luồng Tính toán (Flowchart)

```mermaid
flowchart TD
    A[computeAndApply\nAttendance, workStart, hoursPerDay] --> B{Có checkIn?}
    B -->|Không| C[Bỏ qua tính toán]
    B -->|Có| D[Tính lateMinutes\n= checkIn - workStart\nNếu > 0 → trễ]
    D --> E[lateHour = lateMinutes / 60\nLàm tròn 2 chữ số thập phân]
    E --> F{Có checkOut?}
    F -->|Không| G[workingHour = 0\nviolate = true\nThiếu checkout]
    F -->|Có| H[workingMinutes\n= checkOut - checkIn]
    H --> I[workingHour\n= workingMinutes / 60]
    I --> J[paidHour\n= workingHour - lateHour\nMin = 0]
    J --> K[workingDay\n= workingHour / hoursPerDay]
    K --> L[paidDay\n= paidHour / hoursPerDay]
    L --> M{lateHour > 0\nhoặc không có checkOut?}
    M -->|Có| N[violate = true]
    M -->|Không| O[violate = false]
    N --> P[Gán các giá trị\nvào Attendance entity]
    O --> P
    G --> P

    subgraph Config["Cấu hình từ SystemConfig"]
        WS[workStart: 08:00 mặc định]
        HPD[hoursPerDay: 8 mặc định]
    end
    Config -.-> A
```

### 6.2 Ví dụ Tính toán Thực tế

```mermaid
flowchart LR
    subgraph Input
        CI["checkIn: 08:15"]
        CO["checkOut: 17:30"]
        WS["workStart: 08:00"]
        HPD["hoursPerDay: 8"]
    end
    subgraph Calculation
        L["lateMinutes = 15 phút\nlateHour = 0.25h"]
        W["workingMinutes = 555 phút\nworkingHour = 9.25h"]
        P["paidHour = 9.25 - 0.25 = 9.0h"]
        WD["workingDay = 9.25 / 8 = 1.156"]
        PD["paidDay = 9.0 / 8 = 1.125"]
        V["violate = true (trễ)"]
    end
    subgraph Output
        ATT["Attendance:\nlateHour=0.25\nworkingHour=9.25\npaidHour=9.0\nworkingDay=1.156\npaidDay=1.125\nviolate=true"]
    end
    Input --> Calculation --> Output
```

---

## 7. Luồng Đóng Kỳ Chấm công

### 7.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([HR Admin]) -->|POST /api/attendances/close-period\nyear, month, notes, forceClose| B[AttendanceController]
    B --> C[PeriodCloseService.closePeriod]
    C --> D{Kỳ đã đóng\ntrước đó chưa?}
    D -->|Đã đóng| E[Throw BadRequestException\n'Period already closed']
    D -->|Chưa| F[Load tất cả nhân viên active]
    F --> G[Load tất cả ngày công\ntrong tháng từ DB]
    G --> H[checkForUnexplainedAbsences]
    H --> I[Xác định các ngày làm việc\nThứ 2 - Thứ 6 trong tháng]
    I --> J[Loại bỏ ngày Lễ/Nghỉ\ntừ PublicHoliday]
    J --> K{Duyệt từng\nnhân viên}
    K --> L[Ngày vắng\n= workingDays - attendance dates]
    L --> M[Load LeaveRequest đã duyệt\ncủa nhân viên trong tháng]
    M --> N[Ngày vắng không giải trình\n= vắng - ngày nghỉ phép hợp lệ]
    N --> O{Còn nhân viên\ntiếp theo?}
    O -->|Có| K
    O -->|Không| P{Có vắng\nkhông giải trình?}
    P -->|Có và forceClose=false| Q[Trả về PeriodCloseResponse\nclosed=false\nunexplainedAbsences=list]
    P -->|Không có| R[Tạo AttendancePeriodClose\nclosedBy=username\nclosedAt=now]
    P -->|Có và forceClose=true| S[Ghi chú vắng không phép\nvào notes]
    S --> R
    R --> T[Save vào DB]
    T --> U[Trả về PeriodCloseResponse\nclosed=true]
    Q --> V([HR Admin xem danh sách\nvắng không phép])
    U --> W([Kỳ đã khóa\nPhục vụ tính lương])
```

### 7.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant HR as HR Admin
    participant CTL as AttendanceController
    participant PCS as PeriodCloseService
    participant ATR as AttendanceRepository
    participant PHR as PublicHolidayRepository
    participant LVR as LeaveRequestRepository
    participant PCR as PeriodCloseRepository
    participant DB as Database

    HR->>CTL: POST /api/attendances/close-period {year:2025, month:4, forceClose:false}
    CTL->>PCS: closePeriod(request, username)
    activate PCS

    PCS->>PCR: existsByCloseYearAndCloseMonth(2025, 4)
    PCR-->>PCS: false

    PCS->>DB: Load all active employees
    DB-->>PCS: List<EmployeeInfo>

    PCS->>PHR: findHolidayDatesBetween(firstDay, lastDay)
    PHR-->>PCS: Set<LocalDate> holidays

    PCS->>PCS: workingDays = Mon-Fri minus holidays

    PCS->>ATR: findByEmployeeIdsAndDateRange(employeeIds, firstDay, lastDay)
    ATR-->>PCS: Map<employeeId, List<Attendance>>

    loop Mỗi nhân viên
        PCS->>PCS: absentDays = workingDays - attendanceDates(employee)

        alt absentDays không rỗng
            PCS->>LVR: findApprovedLeaveInRange(employeeId, firstDay, lastDay)
            LVR-->>PCS: List<LeaveRequest>
            PCS->>PCS: leaveDates = expand leave date ranges
            PCS->>PCS: unexplained = absentDays - leaveDates
            PCS->>PCS: Thêm vào UnexplainedAbsenceDto nếu unexplained không rỗng
        end
    end

    alt Có vắng không giải trình và forceClose=false
        PCS-->>CTL: PeriodCloseResponse {closed:false, unexplainedAbsences:[...]}
        CTL-->>HR: 200 OK — Chưa đóng, cần xử lý vắng phép
    else forceClose=true hoặc không có vắng không giải trình
        PCS->>PCR: save(AttendancePeriodClose {year, month, closedBy, closedAt, notes})
        PCR->>DB: INSERT period_close
        PCS-->>CTL: PeriodCloseResponse {closed:true}
        CTL-->>HR: 200 OK — Kỳ đã đóng thành công
    end
    deactivate PCS
```

---

## 8. Biểu đồ Trạng thái Bản ghi Chấm công

```mermaid
stateDiagram-v2
    [*] --> CheckIn_Only : LogType=IN\n(check-in sáng)

    CheckIn_Only : Attendance\n● checkIn: set\n● checkOut: null\n● lateHour: tính\n● workingHour: 0\n● violate: true (chưa checkout)

    CheckIn_Only --> Complete : LogType=OUT\n(check-out chiều)

    Complete : Attendance\n● checkIn: set\n● checkOut: set\n● lateHour: tính\n● workingHour: tính\n● paidHour: tính\n● workingDay / paidDay: tính\n● violate: true/false

    Complete --> ManualUpdate : HR Admin\nPUT /api/attendances/{id}

    ManualUpdate : Attendance (Cập nhật thủ công)\n● Tính lại toàn bộ chỉ số\n● updatedBy = HR username

    ManualUpdate --> Complete

    Complete --> SoftDeleted : HR Admin\nDELETE /api/attendances/{id}

    SoftDeleted : Attendance\n● deleteFlag = true\n● deletedAt = timestamp

    CheckIn_Only --> SoftDeleted : HR Admin xóa

    Complete --> PeriodLocked : HR Admin\nclose-period

    PeriodLocked : Kỳ đã khóa\n● AttendancePeriodClose record\n● Phục vụ tính lương\n● Không thể sửa
```

---

## Tóm tắt Các Điểm Quan trọng

| Khía cạnh | Chi tiết |
|---|---|
| **Idempotency** | Check-in `IN` sẽ bị bỏ qua nếu Attendance trong ngày đã tồn tại |
| **Async Processing** | Xử lý Attendance chạy sau khi transaction CheckinLog commit (`AFTER_COMMIT`) |
| **Soft Delete** | Xóa chỉ set `deleteFlag=true`, không xóa vật lý |
| **Xác thực thiết bị** | SHA-256 hash, không lưu raw key, 1 key active/device |
| **Cấu hình động** | `workStart` và `hoursPerDay` đọc từ `SystemConfig` (PostgreSQL jsonb) |
| **Batch chịu lỗi** | Lỗi từng log trong batch không làm dừng toàn bộ; trả về kết quả từng phần |
| **Ngày nghỉ lễ** | Loại khỏi tính ngày công và kiểm tra vắng mặt khi đóng kỳ |
| **Đóng kỳ có bảo vệ** | Phải xử lý vắng không phép trước khi đóng (trừ khi `forceClose=true`) |
