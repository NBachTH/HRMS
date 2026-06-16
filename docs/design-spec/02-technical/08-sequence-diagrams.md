# Sơ đồ Tuần tự (Sequence) — FaceZ HRMS

**Phiên bản:** 1.0 | **Ngày:** 16-06-2026
**Liên quan:** [Security](10-security-design.md) · [Integration](11-integration-design.md) · [Process Flows](../01-business/04-process-flows-bpmn.md)

Sơ đồ tương tác cấp message cho các luồng trải qua nhiều thành phần.

---

## 1. Đăng nhập JWT + Refresh ngầm

```mermaid
sequenceDiagram
    autonumber
    actor U as Trình duyệt
    participant FE as Frontend (apiClient)
    participant AC as AuthController
    participant AS as AuthService
    participant JS as JwtService (Redis)
    participant DB as PostgreSQL

    U->>FE: gửi username/password
    FE->>AC: POST /api/auth/login
    AC->>AS: authenticate(username, pwd)
    AS->>DB: nạp UserAccount
    AS->>AS: BCrypt.matches(pwd, hash)
    AS->>JS: issueAccess(5m) + issueRefresh(14d)
    JS->>Redis: lưu refresh token (key xoay vòng)
    AS-->>AC: {accessToken, user}
    AC-->>FE: 200 + Set-Cookie: refresh (HttpOnly)
    FE->>FE: giữ accessToken trong bộ nhớ
    FE->>AC: GET /api/auth/me (Bearer)
    AC-->>FE: hồ sơ

    Note over FE,AC: ── sau: access token hết hạn ──
    FE->>AC: GET /api/... (Bearer hết hạn)
    AC-->>FE: 401
    FE->>AC: POST /api/auth/refresh (cookie)
    AC->>JS: validate + xoay refresh
    JS->>Redis: thu hồi cũ, lưu mới
    AC-->>FE: 200 accessToken mới + cookie xoay
    FE->>AC: thử lại request gốc (Bearer mới)
    AC-->>FE: 200
```

**Ghi chú:** access token stateless (kiểm tra bằng chữ ký); refresh token có trạng thái trong Redis
(xoay vòng + thu hồi). Refresh bị thu hồi/hết hạn → 401 → frontend đăng xuất. Rate limiter (10/15 phút/IP)
bọc `/login`.

---

## 2. Thu nhận chấm công → Attendance

```mermaid
sequenceDiagram
    autonumber
    participant T as Máy chấm công
    participant DF as DeviceApiKeyFilter
    participant CC as CheckinLogController
    participant CS as CheckinLogService
    participant AS as AttendanceService
    participant DB as PostgreSQL
    participant EV as ApplicationEventPublisher

    T->>DF: POST /api/checkin-logs (X-Device-API-Key)
    DF->>DB: tra ApiKey theo SHA-256(key), active?
    alt không hợp lệ/không hoạt động
        DF-->>T: 401
    else hợp lệ
        DF->>CC: cấp DEVICE_CHECKIN, principal=device:{id}
        CC->>CS: save(log)
        CS->>DB: insert CheckinLog
        CS->>AS: processCheckinForAttendance(log)
        alt logType = IN
            AS->>DB: tìm Attendance(employee, date)
            AS->>DB: nếu chưa có → insert (idempotent)
        else logType = OUT
            AS->>DB: nạp Attendance đang mở
            AS->>AS: tính lateHour, giờ, paidDay, violate
            AS->>DB: update Attendance
        end
        AS->>EV: publish CheckinProcessedEvent
        CS-->>T: 200
    end
```

**Biến thể batch:** `POST /api/checkin-logs/batch` lặp mảng qua cùng đường `save → processCheckinForAttendance`
(dùng sau đệm offline). Cron đêm `AttendanceSchedule` chạy lại backfill ngày hôm trước và tái dựng `WorkDay`.

---

## 3. Lương tháng (đơn + batch)

```mermaid
sequenceDiagram
    autonumber
    actor F as Finance Admin
    participant PC as PayrollController
    participant PS as PayrollService
    participant PB as PayrollBatchService
    participant JST as PayrollJobStore (in-memory)
    participant ENG as PayrollCalculationEngine
    participant CFG as PayrollConfigService
    participant DB as PostgreSQL

    rect rgb(238,242,255)
    Note over F,DB: Một nhân viên
    F->>PC: POST /api/payrolls/calculate
    PC->>PS: calculate(req)
    PS->>DB: nạp Contract, WorkDays, OT đã duyệt
    PS->>ENG: buildPayroll(...đầu vào...)
    ENG->>CFG: hệ số vị trí / phụ cấp / bảo hiểm / PIT (effective_from <= kỳ)
    CFG->>DB: dòng config PUBLISHED mới nhất
    ENG-->>PS: Payroll DRAFT (chưa lưu)
    PS->>DB: upsert (unique employee+year+month)
    PS-->>PC: DRAFT
    end

    rect rgb(240,255,240)
    Note over F,DB: Batch (async)
    F->>PC: POST /api/payrolls/batch-calculate
    PC->>PB: triggerBatch(year, month)
    PB->>JST: tạo job(jobId, RUNNING)
    PB-->>PC: {jobId}
    PC-->>F: 202 {jobId}
    PB->>PB: runBatch() @Async
    loop mỗi nhân viên active
        PB->>ENG: buildPayroll(...)
        PB->>DB: lưu DRAFT
        PB->>JST: progress++
    end
    PB->>JST: status=COMPLETED
    loop poll ~1.5s
        F->>PC: GET /api/payrolls/jobs/{jobId}
        PC->>JST: đọc
        PC-->>F: {state, progress}
    end
    end
```

```mermaid
sequenceDiagram
    autonumber
    actor F as Finance Admin
    actor D as Director
    participant PC as PayrollController
    participant PS as PayrollService
    participant EV as Events
    F->>PC: PATCH /{id}/submit
    PC->>PS: DRAFT → PENDING_APPROVAL
    D->>PC: PATCH /{id}/approve
    PC->>PS: PENDING_APPROVAL → APPROVED
    PS->>EV: publish PayrollApprovedEvent
    EV-->>+Employee: thông báo
    F->>PC: PATCH /{id}/mark-paid
    PC->>PS: APPROVED → PAID
```

**Ghi chú:** engine thuần — mọi đọc DB diễn ra ở service/`PayrollConfigService` *trước* khi gọi engine.
Tra config hiệu lực theo ngày (`effective_from ≤ năm-tháng-01`, `PUBLISHED` mới nhất). Tách bạch trách nhiệm
enforce bằng vai trò ở `submit` (Finance) vs `approve` (Director).

---

## 4. Duyệt nghỉ phép đa cấp (chuyển trạng thái)

```mermaid
sequenceDiagram
    autonumber
    actor E as Nhân viên
    actor L as Leader
    actor M as Manager
    actor H as HR Admin
    participant LC as LeaveController
    participant LS as LeaveService
    participant DB as PostgreSQL
    E->>LC: POST /api/leaves (DRAFT)
    E->>LC: PUT /{id}/submit → TO_APPROVE
    LC->>LS: publish LeaveRequestSubmittedEvent
    L->>LC: PUT /{id}/approve → LEADER_APPROVED
    M->>LC: PUT /{id}/approve → MANAGER_APPROVED
    H->>LC: PUT /{id}/approve
    LC->>LS: kiểm tra LeaveBalance
    alt đủ số dư
        LS->>DB: APPROVED + trừ số dư + đánh dấu WorkDay LEAVE
    else không đủ
        LS-->>H: 400
    end
```
