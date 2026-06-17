# Tài liệu Luồng Thông báo (Notification Flow) — v2

> **Thay đổi so với v1:** Bổ sung ghi chú khoảng trắng notification cho approver; làm rõ vai trò `CheckinProcessedEvent` (không tạo notification); ghi rõ mô hình pull-only và không có TTL/cleanup; bảng event được mở rộng với trạng thái đầy đủ của approval workflow.

## Mục lục

1. [Tổng quan Hệ thống Thông báo](#1-tổng-quan-hệ-thống-thông-báo)
2. [Luồng Gửi Thông báo qua Spring Events](#2-luồng-gửi-thông-báo-qua-spring-events)
3. [Luồng Xem & Đánh dấu Đã đọc](#3-luồng-xem--đánh-dấu-đã-đọc)
4. [Biểu đồ Trình tự cho từng Event](#4-biểu-đồ-trình-tự-cho-từng-event)
5. [Biểu đồ Trạng thái Thông báo](#5-biểu-đồ-trạng-thái-thông-báo)
6. [Giới hạn Đã biết](#6-giới-hạn-đã-biết)

---

## 1. Tổng quan Hệ thống Thông báo

```mermaid
graph TB
    subgraph Publishers["Nguồn phát Events"]
        LS[LeaveService\nLeaveRequestSubmittedEvent]
        PS[PayrollService\nPayrollApprovedEvent]
        CS[ContractExpiryScheduler\nContractExpiringEvent]
        CLS["CheckinLogService\nCheckinProcessedEvent\n— Chỉ dùng cho AttendanceService\nKhông tạo notification"]
    end

    subgraph EventBus["Spring Application Event Bus"]
        EVT[ApplicationEventPublisher]
    end

    subgraph Listener["Event Listeners"]
        NEL["NotificationEventListener @Async\nonLeaveSubmitted\nonPayrollApproved\nonContractExpiring"]
        ATL["AttendanceService\nonCheckinProcessed\n— Xử lý Attendance record\nKhông tạo notification"]
    end

    subgraph Service["NotificationService"]
        NS[send\ngetMyNotifications\nmarkRead\nmarkAllRead\ncountUnread]
    end

    subgraph DB["Database"]
        NDB["(notification)\n⚠ Không có TTL\nKhông tự động xóa bản ghi cũ"]
    end

    subgraph API["REST API /api/notifications\nPull-only — không có WebSocket/SSE"]
        GET[GET /\nGET /unread-count]
        PATCH[PATCH /id/read\nPATCH /read-all]
    end

    subgraph Gap["⚠ Khoảng trắng Notification hiện tại"]
        G1[LEADER không nhận notification\nkhi có đơn Leave/OT mới cần duyệt]
        G2[Nhân viên không nhận notification\nkhi đơn được duyệt/từ chối]
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
```

---

## 2. Luồng Gửi Thông báo qua Spring Events

### 2.1 Biểu đồ Luồng tổng quát (Flowchart)

```mermaid
flowchart TD
    A[Business Action\nvd: tạo đơn nghỉ phép] --> B[Service xử lý\n+ Publish ApplicationEvent]
    B --> C[ApplicationEventPublisher.publishEvent]
    C --> D{Transaction\nPhase của Publisher?}
    D -->|AFTER_COMMIT\nLeave, Payroll, Checkin| E[Sau khi transaction commit\nmới dispatch event — đảm bảo data đã persist]
    D -->|@EventListener mặc định\nContract Scheduler| F[Dispatch ngay\nScheduler không có transaction context]
    E --> G[NotificationEventListener\n@Async — chạy trên thread pool riêng\nException trong listener không rollback publisher]
    F --> G
    G --> H[NotificationService.send\nemployeeId, title, message, type]
    H --> I[Tạo Notification entity\nnotificationId = UUID\nread = false]
    I --> J[Save vào DB\nKhông có dedup/TTL]
```

### 2.2 Bảng Event, Thông báo, và Khoảng trắng

| Event | Publisher | Trigger | Listener Type | Recipient | Nội dung | Khoảng trắng |
|---|---|---|---|---|---|---|
| `LeaveRequestSubmittedEvent` | LeaveService | Nhân viên tạo đơn | `@TransactionalEventListener(AFTER_COMMIT)` | Nhân viên tạo đơn | "Your [type] leave request has been submitted..." | **LEADER không biết có đơn mới** |
| `PayrollApprovedEvent` | PayrollService | DIRECTOR approve | `@TransactionalEventListener(AFTER_COMMIT)` | Nhân viên được tính lương | "Your payroll for [y]/[m] has been approved..." | — |
| `ContractExpiringEvent` | ContractExpiryScheduler | Cron 08:00 daily | `@EventListener` | Nhân viên có hợp đồng hết hạn | "Your contract expires on [date]..." | **Duplicate mỗi ngày** |
| `CheckinProcessedEvent` | CheckinLogService | Thiết bị gửi log | `@TransactionalEventListener(AFTER_COMMIT)` | AttendanceService | _(xử lý Attendance, không phải notification)_ | Dùng Event Bus để decoupling — không tạo notification |

> **Khoảng trắng trong approval workflow:** Các sự kiện sau hiện **không có notification**:
> - Nhân viên nộp đơn → LEADER không được thông báo
> - LEADER approve → MANAGER không được thông báo
> - MANAGER approve → HR_ADMIN không được thông báo
> - HR_ADMIN approve/reject → Nhân viên không được thông báo kết quả

---

## 3. Luồng Xem & Đánh dấu Đã đọc

### 3.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Nhân viên\nPolling để kiểm tra]) -->|GET /api/notifications\nJWT Bearer| B[NotificationController]
    B --> C[Extract username\ntừ SecurityContext]
    C --> D[NotificationService.getMyNotifications\nemployeeId, pageable]
    D --> E[SELECT notifications WHERE employeeId\nORDER BY createdAt DESC\nPAGINATED]
    E --> F[200 OK PageResponse\nList NotificationResponse]

    G([Nhân viên]) -->|GET /api/notifications/unread-count| H[NotificationService.countUnread]
    H --> I[COUNT WHERE employeeId AND read=false]
    I --> J[200 OK count\nClient dùng để hiển thị badge]

    K([Nhân viên]) -->|PATCH /api/notifications/id/read| L[NotificationService.markRead\nid, username]
    L --> M[Load notification]
    M --> N{Notification thuộc\nvề user này?}
    N -->|Không| O[403 Forbidden\nOwnership check]
    N -->|Có| P[notification.read = true\nSave]
    P --> Q[200 OK NotificationResponse]

    R([Nhân viên]) -->|PATCH /api/notifications/read-all| S[NotificationService.markAllRead\nemployeeId]
    S --> T[UPDATE SET read=true\nWHERE employeeId AND read=false\nBatch UPDATE — không load từng record]
    T --> U[200 OK]
```

### 3.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant EMP as Nhân viên
    participant CTL as NotificationController
    participant SVC as NotificationService
    participant DB as PostgreSQL

    Note over EMP: Pull-only — client phải chủ động polling\nKhông có WebSocket hay SSE

    EMP->>CTL: GET /api/notifications?page=0&size=20
    CTL->>CTL: Extract username từ SecurityContext
    CTL->>SVC: getMyNotifications(employeeId, pageable)
    SVC->>DB: SELECT * FROM notification WHERE employee_id=? ORDER BY created_at DESC LIMIT 20
    DB-->>SVC: Page<Notification>
    SVC-->>CTL: PageResponse<NotificationResponse>
    CTL-->>EMP: 200 OK {content, totalElements, totalPages}

    EMP->>CTL: GET /api/notifications/unread-count
    CTL->>SVC: countUnread(employeeId)
    SVC->>DB: SELECT COUNT(*) WHERE employee_id=? AND read=false
    DB-->>SVC: count
    CTL-->>EMP: 200 OK {data: 5}

    EMP->>CTL: PATCH /api/notifications/{id}/read
    CTL->>SVC: markRead(id, username)
    SVC->>DB: SELECT notification WHERE id=?
    DB-->>SVC: Notification {employeeId, read=false}
    SVC->>SVC: Validate: notification.employee.username == username (403 nếu không khớp)
    SVC->>DB: UPDATE notification SET read=true WHERE id=?
    CTL-->>EMP: 200 OK {read: true}

    EMP->>CTL: PATCH /api/notifications/read-all
    CTL->>SVC: markAllRead(employeeId)
    SVC->>DB: UPDATE notification SET read=true WHERE employee_id=? AND read=false
    DB-->>SVC: rows updated
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

    EMP->>LS: POST /api/leaves
    LS->>DB: INSERT leave_request {status: TO_APPROVE}
    LS->>EVT: publish(LeaveRequestSubmittedEvent)

    LS-->>EMP: 201 Created

    Note over EVT,NTF: AFTER_COMMIT — async thread pool
    EVT->>NEL: onLeaveSubmitted(event)
    NEL->>NTF: send(employeeId, "Leave Request Submitted", msg, LEAVE_SUBMITTED)
    NTF->>DB: INSERT notification {recipient=employee, read=false}

    Note over NTF: ⚠ LEADER không nhận notification\nPhải tự vào hệ thống poll đơn chờ duyệt
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
    PS->>DB: UPDATE payroll SET status=APPROVED
    PS->>EVT: publish(PayrollApprovedEvent {employeeId, year, month})

    PS-->>DIR: 200 OK

    Note over EVT,NTF: AFTER_COMMIT — async
    EVT->>NEL: onPayrollApproved(event)
    NEL->>NTF: send(employeeId, "Payroll Approved", "...payslip available", PAYROLL_APPROVED)
    NTF->>DB: INSERT notification
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

    loop Mỗi hợp đồng
        SCH->>EVT: publish(ContractExpiringEvent)
        Note over SCH,DB: ⚠ Ngày hôm sau cron chạy lại\nContract chưa gia hạn → event publish lại\n→ notification duplicate
        EVT->>NEL: onContractExpiring (@EventListener — không cần transaction)
        NEL->>NTF: send(employeeId, "Contract Expiring", msg, CONTRACT_EXPIRING)
        NTF->>DB: INSERT notification (không check duplicate)
    end
```

---

## 5. Biểu đồ Trạng thái Thông báo

```mermaid
stateDiagram-v2
    [*] --> Unread : Event xảy ra\nNotificationService.send()\nread=false

    Unread : Thông báo chưa đọc\n● read = false\n● Hiển thị trong danh sách\n● Tính vào unread-count\n● Không có TTL — tồn tại mãi mãi

    Unread --> Read : PATCH /notifications/{id}/read\nhoặc PATCH /notifications/read-all

    Read : Thông báo đã đọc\n● read = true\n● Vẫn hiển thị trong danh sách\n● Không tính unread-count\n● Không tự động xóa
```

---

## 6. Giới hạn Đã biết

| Giới hạn | Mô tả | Mức độ ảnh hưởng |
|---|---|---|
| **Không có notification cho người phê duyệt** | LEADER/MANAGER/HR không nhận notification khi có đơn Leave/OT cần duyệt ở cấp của mình. Phải chủ động poll hệ thống. Ngược lại, nhân viên cũng không biết đơn được duyệt hay từ chối mà không tự kiểm tra. | Cao về UX — Workflow phê duyệt thiếu push notification ở cả hai chiều. |
| **Không có TTL / retention policy** | Notification không bao giờ bị xóa. Bảng tích lũy theo thời gian. Với 200 nhân viên và vài event/ngày, sau 3 năm có thể có hàng trăm nghìn records. | Trung bình — Cần định kỳ archive hoặc xóa notification đã đọc sau N ngày (ví dụ: 90 ngày). |
| **Pull-only model** | Client phải polling `GET /api/notifications/unread-count` để biết có notification mới. Không có WebSocket hay Server-Sent Events (SSE). | Trung bình UX — Delay giữa event xảy ra và user thấy notification phụ thuộc vào tần suất polling. |
| **CheckinProcessedEvent qua EventBus không tạo notification** | Event này chỉ dùng để trigger `AttendanceService` (xử lý bản ghi công). Không tạo notification. Dùng Event Bus để decoupling `CheckinLogService` và `AttendanceService` — tránh circular dependency và đảm bảo xử lý Attendance sau khi CheckinLog commit xong. | Thấp — Thiết kế đúng về kỹ thuật. Cần ghi chú để không nhầm là "thiếu notification". |
| **Exception trong async listener không propagate** | Nếu `NotificationEventListener` throw exception (DB down, v.v.), exception bị nuốt trong async thread pool. Notification không được tạo nhưng caller không biết. Không có retry, dead letter hay alert. | Trung bình — Cần add error logging ít nhất. Xem xét alert nếu notification là critical. |
