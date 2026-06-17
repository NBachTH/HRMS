# Tài liệu Luồng Thông báo (Notification Flow)

## Mục lục

1. [Tổng quan Hệ thống Thông báo](#1-tổng-quan-hệ-thống-thông-báo)
2. [Luồng Gửi Thông báo qua Spring Events](#2-luồng-gửi-thông-báo-qua-spring-events)
3. [Luồng Xem & Đánh dấu Đã đọc](#3-luồng-xem--đánh-dấu-đã-đọc)
4. [Biểu đồ Trình tự cho từng Event](#4-biểu-đồ-trình-tự-cho-từng-event)
5. [Biểu đồ Trạng thái Thông báo](#5-biểu-đồ-trạng-thái-thông-báo)

---

## 1. Tổng quan Hệ thống Thông báo

```mermaid
graph TB
    subgraph Publishers["Nguồn phát Events"]
        LS[LeaveService\nLeaveRequestSubmittedEvent]
        PS[PayrollService\nPayrollApprovedEvent]
        CS[ContractExpiryScheduler\nContractExpiringEvent]
        CLS[CheckinLogService\nCheckinProcessedEvent]
    end

    subgraph EventBus["Spring Application Event Bus"]
        EVT[ApplicationEventPublisher]
    end

    subgraph Listener["NotificationEventListener\n@Async"]
        NEL[onLeaveSubmitted\nonPayrollApproved\nonContractExpiring]
        ATL[AttendanceService\nonCheckinProcessed]
    end

    subgraph Service["NotificationService"]
        NS[send\ngetMyNotifications\nmarkRead\nmarkAllRead\ncountUnread]
    end

    subgraph DB["Database"]
        NDB[(notification)]
    end

    subgraph API["REST API /api/notifications"]
        GET[GET /\nGET /unread-count]
        PATCH[PATCH /id/read\nPATCH /read-all]
    end

    LS -->|publish| EVT
    PS -->|publish| EVT
    CS -->|publish| EVT
    CLS -->|publish| EVT

    EVT -->|AFTER_COMMIT async| NEL
    EVT -->|AFTER_COMMIT async| ATL

    NEL --> NS
    NS --> NDB

    API --> NS
    NS --> NDB
```

---

## 2. Luồng Gửi Thông báo qua Spring Events

### 2.1 Biểu đồ Luồng tổng quát (Flowchart)

```mermaid
flowchart TD
    A[Business Action\nvd: tạo đơn nghỉ phép] --> B[Service xử lý\n+ Publish ApplicationEvent]
    B --> C[ApplicationEventPublisher.publishEvent\nevent object]
    C --> D{Transaction\nPhase?}
    D -->|AFTER_COMMIT\nLeave, Payroll, Checkin| E[Sau khi transaction commit\nmới xử lý event]
    D -->|@EventListener mặc định\nContract| F[Xử lý ngay trong thread\nScheduler không có transaction]
    E --> G[NotificationEventListener\n@Async - chạy trên thread pool riêng]
    F --> G
    G --> H[NotificationService.send\nemployeeId, title, message, type]
    H --> I[Tạo Notification entity\nnotificationId = UUID\nread = false]
    I --> J[Save vào DB]
```

### 2.2 Bảng Event và Thông báo tương ứng

| Event | Publisher | Trigger | Loại Listener | Thông báo |
|---|---|---|---|---|
| `LeaveRequestSubmittedEvent` | LeaveService | Nhân viên tạo đơn nghỉ | `@TransactionalEventListener(AFTER_COMMIT)` | "Your [type] leave request has been submitted and is pending approval." |
| `PayrollApprovedEvent` | PayrollService | DIRECTOR approve payroll | `@TransactionalEventListener(AFTER_COMMIT)` | "Your payroll for [year]/[month] has been approved. Your payslip is now available." |
| `ContractExpiringEvent` | ContractExpiryScheduler | Cron hàng ngày 08:00 | `@EventListener` | "Your employment contract expires on [date]. Please contact HR to discuss renewal." |
| `CheckinProcessedEvent` | CheckinLogService | Thiết bị gửi check-in | `@TransactionalEventListener(AFTER_COMMIT)` | Xử lý Attendance (không tạo notification) |

---

## 3. Luồng Xem & Đánh dấu Đã đọc

### 3.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Nhân viên]) -->|GET /api/notifications\nJWT Bearer| B[NotificationController]
    B --> C[Extract username\ntừ SecurityContext]
    C --> D[NotificationService.getMyNotifications\nemployeeId, pageable]
    D --> E[SELECT notifications WHERE employeeId\nORDER BY createdAt DESC\nPAGINATED]
    E --> F[200 OK PageResponse\nList NotificationResponse]

    G([Nhân viên]) -->|GET /api/notifications/unread-count| H[NotificationService.countUnread]
    H --> I[COUNT WHERE employeeId AND read=false]
    I --> J[200 OK count]

    K([Nhân viên]) -->|PATCH /api/notifications/id/read| L[NotificationService.markRead\nid, username]
    L --> M[Load notification]
    M --> N{Notification thuộc\nvề user này?}
    N -->|Không| O[403 Forbidden]
    N -->|Có| P[notification.read = true\nSave]
    P --> Q[200 OK NotificationResponse]

    R([Nhân viên]) -->|PATCH /api/notifications/read-all| S[NotificationService.markAllRead\nemployeeId]
    S --> T[UPDATE SET read=true\nWHERE employeeId AND read=false\nBatch query]
    T --> U[200 OK]
```

### 3.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant EMP as Nhân viên
    participant CTL as NotificationController
    participant SVC as NotificationService
    participant DB as PostgreSQL

    EMP->>CTL: GET /api/notifications?page=0&size=20
    CTL->>CTL: Extract username từ SecurityContext
    CTL->>SVC: getMyNotifications(employeeId, pageable)
    SVC->>DB: SELECT * FROM notification WHERE employee_id=? ORDER BY created_at DESC LIMIT 20
    DB-->>SVC: Page<Notification>
    SVC-->>CTL: PageResponse<NotificationResponse>
    CTL-->>EMP: 200 OK {content: [...], totalElements, totalPages}

    EMP->>CTL: GET /api/notifications/unread-count
    CTL->>SVC: countUnread(employeeId)
    SVC->>DB: SELECT COUNT(*) WHERE employee_id=? AND read=false
    DB-->>SVC: count
    CTL-->>EMP: 200 OK {data: 5}

    EMP->>CTL: PATCH /api/notifications/{id}/read
    CTL->>SVC: markRead(id, username)
    SVC->>DB: SELECT notification WHERE id=?
    DB-->>SVC: Notification {employeeId, read=false}
    SVC->>SVC: Validate notification.employee.username == username
    SVC->>DB: UPDATE notification SET read=true WHERE id=?
    CTL-->>EMP: 200 OK NotificationResponse {read: true}

    EMP->>CTL: PATCH /api/notifications/read-all
    CTL->>SVC: markAllRead(employeeId)
    SVC->>DB: UPDATE notification SET read=true WHERE employee_id=? AND read=false
    DB-->>SVC: rows affected
    CTL-->>EMP: 200 OK
```

---

## 4. Biểu đồ Trình tự cho từng Event

### 4.1 LeaveRequestSubmittedEvent

```mermaid
sequenceDiagram
    participant EMP as Nhân viên
    participant LS as LeaveService
    participant EVT as Spring EventBus
    participant NEL as NotificationEventListener
    participant NTF as NotificationService
    participant DB as PostgreSQL

    EMP->>LS: POST /api/leaves (tạo đơn nghỉ phép)
    LS->>DB: INSERT leave_request {status: TO_APPROVE}
    LS->>EVT: publish(LeaveRequestSubmittedEvent {employeeId, leaveType, leaveRequestId})

    Note over LS,EMP: Trả về ngay cho client
    LS-->>EMP: 201 Created

    Note over EVT,NTF: Sau khi transaction commit — async thread pool
    EVT->>NEL: onLeaveSubmitted(event)
    NEL->>NTF: send(employeeId, title="Leave Request Submitted",\nmessage="Your ANNUAL leave request...", type="LEAVE_SUBMITTED")
    NTF->>DB: INSERT notification {read=false}
```

### 4.2 PayrollApprovedEvent

```mermaid
sequenceDiagram
    participant DIR as Director
    participant PS as PayrollService
    participant EVT as Spring EventBus
    participant NEL as NotificationEventListener
    participant NTF as NotificationService
    participant DB as PostgreSQL

    DIR->>PS: PATCH /api/payrolls/{id}/approve
    PS->>DB: SELECT payroll WHERE id=? AND status=PENDING_APPROVAL
    PS->>DB: UPDATE payroll SET status=APPROVED
    PS->>EVT: publish(PayrollApprovedEvent {employeeId, payrollYear, payrollMonth})

    PS-->>DIR: 200 OK PayrollResponse {status: APPROVED}

    Note over EVT,NTF: Sau AFTER_COMMIT — async
    EVT->>NEL: onPayrollApproved(event)
    NEL->>NTF: send(employeeId, "Payroll Approved",\n"Your payroll for 2025/4 has been approved...", "PAYROLL_APPROVED")
    NTF->>DB: INSERT notification {read=false}
```

### 4.3 ContractExpiringEvent

```mermaid
sequenceDiagram
    participant CRON as Cron 08:00
    participant SCH as ContractExpiryScheduler
    participant EVT as Spring EventBus
    participant NEL as NotificationEventListener
    participant NTF as NotificationService
    participant DB as PostgreSQL

    CRON->>SCH: checkExpiringContracts()
    SCH->>DB: SELECT contracts expiring in next 30 days
    DB-->>SCH: List<Contract>

    loop Mỗi hợp đồng sắp hết hạn
        SCH->>EVT: publish(ContractExpiringEvent {employeeId, employeeName, endDate})
        Note over NEL: @EventListener (không cần transaction commit)\n@Async
        EVT->>NEL: onContractExpiring(event)
        NEL->>NTF: send(employeeId, "Contract Expiring",\n"Your contract expires on [date]...", "CONTRACT_EXPIRING")
        NTF->>DB: INSERT notification
    end
```

---

## 5. Biểu đồ Trạng thái Thông báo

```mermaid
stateDiagram-v2
    [*] --> Unread : Event xảy ra\nNotificationService.send()

    Unread : Thông báo chưa đọc\n● read = false\n● Hiển thị trong danh sách\n● Tính vào unread-count

    Unread --> Read : PATCH /notifications/{id}/read\nhoặc PATCH /notifications/read-all

    Read : Thông báo đã đọc\n● read = true\n● Vẫn hiển thị trong danh sách\n● Không tính unread-count
```
