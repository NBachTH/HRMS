# Tài liệu Luồng Nghỉ phép & Tăng ca (Leave & OT Request Flow)

## Mục lục

1. [Tổng quan Quy trình Phê duyệt](#1-tổng-quan-quy-trình-phê-duyệt)
2. [Luồng Tạo Đơn Nghỉ phép](#2-luồng-tạo-đơn-nghỉ-phép)
3. [Luồng Phê duyệt / Từ chối Đơn Nghỉ phép](#3-luồng-phê-duyệt--từ-chối-đơn-nghỉ-phép)
4. [Luồng Tạo Đơn Tăng ca (OT)](#4-luồng-tạo-đơn-tăng-ca-ot)
5. [Luồng Phê duyệt / Từ chối Đơn Tăng ca](#5-luồng-phê-duyệt--từ-chối-đơn-tăng-ca)
6. [Biểu đồ Trạng thái Chung](#6-biểu-đồ-trạng-thái-chung)
7. [Quản lý Số dư Nghỉ phép](#7-quản-lý-số-dư-nghỉ-phép)

---

## 1. Tổng quan Quy trình Phê duyệt

```mermaid
graph LR
    subgraph Roles["Vai trò phê duyệt"]
        EMP[EMPLOYEE\nNhân viên]
        LDR[LEADER\nTrưởng nhóm]
        MGR[MANAGER\nQuản lý]
        HR[HR_ADMIN\nNhân sự]
    end

    subgraph LeaveStatus["Trạng thái Đơn nghỉ phép / Tăng ca"]
        S1[TO_APPROVE]
        S2[LEADER_APPROVED]
        S3[MANAGER_APPROVED]
        S4[APPROVED]
        S5[REJECTED]
    end

    EMP -->|Tạo đơn| S1
    LDR -->|Approve| S1 --> S2
    LDR -->|Reject| S1 --> S5
    MGR -->|Approve| S2 --> S3
    MGR -->|Reject| S2 --> S5
    HR -->|Approve| S3 --> S4
    HR -->|Reject| S3 --> S5
```

---

## 2. Luồng Tạo Đơn Nghỉ phép

### 2.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Nhân viên]) -->|POST /api/leaves\nemployeeId, leaveType, startTime, endTime, reason| B[LeaveController]
    B --> C[LeaveService.createLeaveRequest]
    C --> D{endTime > startTime?}
    D -->|Không| E[400 Bad Request\nThời gian không hợp lệ]
    D -->|Có| F{leaveType thuộc\nEMPLOYEE_SUBMITTABLE?}
    F -->|Không\nPUBLIC_HOLIDAY, COMPENSATORY| G[400 Bad Request\nLoại nghỉ phép không được phép]
    F -->|Có| H[Tính durationHours\nendTime - startTime]
    H --> I{leaveType\n= ANNUAL?}
    I -->|Không| J[Bỏ qua kiểm tra số dư]
    I -->|Có| K[Tính requestedDays\n= durationHours / 8]
    K --> L[Load LeaveBalance\nnăm hiện tại, type=ANNUAL]
    L --> M{remainingDays\n>= requestedDays?}
    M -->|Không| N[400 Bad Request\nKhông đủ ngày phép]
    M -->|Có| O[Giữ chỗ số dư\npendingDays += days\nremainingDays -= days\nbalanceDeducted = true]
    J --> P[Tạo LeaveRequest\nstatus = TO_APPROVE]
    O --> P
    P --> Q[Save vào DB]
    Q --> R[Publish LeaveRequestSubmittedEvent]
    R --> S[201 Created\nLeaveResponse]
    R -->|Async AFTER_COMMIT| T[NotificationService.send\nGửi thông báo cho nhân viên]
```

### 2.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant EMP as Nhân viên
    participant CTL as LeaveController
    participant SVC as LeaveService
    participant LBR as LeaveBalanceRepository
    participant DB as PostgreSQL
    participant EVT as Spring EventBus
    participant NTF as NotificationService

    EMP->>CTL: POST /api/leaves {employeeId, leaveType:ANNUAL, startTime, endTime, reason}
    CTL->>SVC: createLeaveRequest(req)
    activate SVC

    SVC->>SVC: Validate endTime > startTime
    SVC->>SVC: Validate leaveType in EMPLOYEE_SUBMITTABLE

    SVC->>SVC: durationHours = ChronoUnit.MINUTES.between / 60

    alt leaveType = ANNUAL
        SVC->>LBR: findByEmployeeIdAndYearAndType(employeeId, year, ANNUAL)
        LBR->>DB: SELECT leave_balance WHERE ...
        DB-->>LBR: LeaveBalance
        LBR-->>SVC: LeaveBalance {remainingDays}

        alt remainingDays < requestedDays
            SVC-->>CTL: BadRequestException — không đủ ngày phép
            CTL-->>EMP: 400 Bad Request
        else Đủ số dư
            SVC->>DB: UPDATE leave_balance SET pendingDays+=days, remainingDays-=days
            Note over SVC: balanceDeducted = true
        end
    end

    SVC->>DB: INSERT leave_request {status: TO_APPROVE, ...}
    DB-->>SVC: saved LeaveRequest

    SVC->>EVT: publish(LeaveRequestSubmittedEvent)
    SVC-->>CTL: LeaveResponse
    CTL-->>EMP: 201 Created {leaveRequestId, status: TO_APPROVE, ...}
    deactivate SVC

    Note over EVT,NTF: Async sau AFTER_COMMIT
    EVT->>NTF: onLeaveSubmitted(event)
    NTF->>DB: INSERT notification {type: LEAVE_SUBMITTED, ...}
```

---

## 3. Luồng Phê duyệt / Từ chối Đơn Nghỉ phép

### 3.1 Biểu đồ Luồng Phê duyệt (Flowchart)

```mermaid
flowchart TD
    A([Người phê duyệt]) -->|PUT /api/leaves/id/approve\nJWT với role| B[LeaveController]
    B --> C[Extract role từ JWT\nauthentication.getAuthorities]
    C --> D[LeaveService.approveLeaveRequest\nid, role]
    D --> E[Load LeaveRequest từ DB]
    E --> F{role = LEADER?}
    F -->|Có| G{status =\nTO_APPROVE?}
    G -->|Không| H[400 Bad Request\nSai trạng thái]
    G -->|Có| I[status = LEADER_APPROVED]

    F -->|Không| J{role = MANAGER?}
    J -->|Có| K{status =\nLEADER_APPROVED?}
    K -->|Không| H
    K -->|Có| L[status = MANAGER_APPROVED]

    J -->|Không - HR_ADMIN| M{status =\nMANAGER_APPROVED?}
    M -->|Không| H
    M -->|Có| N{balanceDeducted\n= true và ANNUAL?}
    N -->|Có| O[Xác nhận số dư\npendingDays -= days\nusedDays += days]
    N -->|Không| P[Bỏ qua cập nhật số dư]
    O --> Q[status = APPROVED]
    P --> Q
    I --> R[Save LeaveRequest]
    L --> R
    Q --> R
    R --> S[200 OK LeaveResponse]
```

### 3.2 Biểu đồ Luồng Từ chối (Flowchart)

```mermaid
flowchart TD
    A([Người phê duyệt]) -->|PUT /api/leaves/id/reject| B[LeaveService.rejectLeaveRequest\nid, role]
    B --> C{role = LEADER?}
    C -->|Có| D{status = TO_APPROVE?}
    C -->|Không| E{role = MANAGER?}
    E -->|Có| F{status = LEADER_APPROVED?}
    E -->|Không - HR_ADMIN| G{status = MANAGER_APPROVED?}

    D -->|Không| H[400 Bad Request]
    F -->|Không| H
    G -->|Không| H

    D -->|Có| I[status = REJECTED]
    F -->|Có| I
    G -->|Có| I

    I --> J[releaseBalance\nKhôi phục số dư nếu ANNUAL]
    J --> K{balanceDeducted\n= true?}
    K -->|Có| L[pendingDays -= days\nremainingDays += days]
    K -->|Không| M[Bỏ qua]
    L --> N[Save LeaveRequest + Balance]
    M --> N
    N --> O[200 OK LeaveResponse\nstatus: REJECTED]
```

### 3.3 Biểu đồ Trình tự Phê duyệt 3 cấp (Sequence Diagram)

```mermaid
sequenceDiagram
    participant LDR as LEADER
    participant MGR as MANAGER
    participant HR as HR_ADMIN
    participant SVC as LeaveService
    participant DB as PostgreSQL

    Note over LDR,DB: Cấp 1: LEADER phê duyệt
    LDR->>SVC: PUT /api/leaves/{id}/approve (role=LEADER)
    SVC->>DB: findById(id) — status=TO_APPROVE
    SVC->>DB: UPDATE status=LEADER_APPROVED
    SVC-->>LDR: 200 OK {status: LEADER_APPROVED}

    Note over LDR,DB: Cấp 2: MANAGER phê duyệt
    MGR->>SVC: PUT /api/leaves/{id}/approve (role=MANAGER)
    SVC->>DB: findById(id) — status=LEADER_APPROVED
    SVC->>DB: UPDATE status=MANAGER_APPROVED
    SVC-->>MGR: 200 OK {status: MANAGER_APPROVED}

    Note over LDR,DB: Cấp 3: HR_ADMIN phê duyệt cuối cùng
    HR->>SVC: PUT /api/leaves/{id}/approve (role=HR_ADMIN)
    SVC->>DB: findById(id) — status=MANAGER_APPROVED

    opt balanceDeducted=true và leaveType=ANNUAL
        SVC->>DB: UPDATE leave_balance SET pendingDays-=days, usedDays+=days
        Note over SVC: Pending → Confirmed (used)
    end

    SVC->>DB: UPDATE status=APPROVED
    SVC-->>HR: 200 OK {status: APPROVED}
```

---

## 4. Luồng Tạo Đơn Tăng ca (OT)

### 4.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Nhân viên]) -->|POST /api/ot-requests\nemployeeId, startTime, endTime| B[OTRequestController]
    B --> C[OTRequestService.createOTRequest]
    C --> D{endTime > startTime?}
    D -->|Không| E[400 Bad Request]
    D -->|Có| F[requestedMinutes\n= Duration.between.toMinutes]
    F --> G[Tải tổng OT đã duyệt\ntrong tháng: sumApprovedMinutesForMonth]
    G --> H{monthlyOT + requested\n> 2400 phút\n40 giờ?}
    H -->|Có| I[400 Bad Request\nVượt giới hạn OT tháng\n40 giờ/tháng Bộ Luật LĐ Điều 107]
    H -->|Không| J[Tải tổng OT đã duyệt\ntrong năm: sumApprovedMinutesForYear]
    J --> K{annualOT + requested\n> 12000 phút\n200 giờ?}
    K -->|Có| L[400 Bad Request\nVượt giới hạn OT năm\n200 giờ/năm Bộ Luật LĐ Điều 107]
    K -->|Không| M[Tạo OTRequest\nstatus = TO_APPROVE]
    M --> N[Save vào DB]
    N --> O[201 Created\nOTRequestResponse]
```

### 4.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant EMP as Nhân viên
    participant CTL as OTRequestController
    participant SVC as OTRequestService
    participant OTR as OTRequestRepository
    participant DB as PostgreSQL

    EMP->>CTL: POST /api/ot-requests {employeeId, startTime, endTime}
    CTL->>SVC: createOTRequest(req)
    activate SVC

    SVC->>SVC: Validate endTime > startTime
    SVC->>SVC: requestedMinutes = Duration.between(start, end).toMinutes()

    SVC->>OTR: sumApprovedMinutesForMonth(employeeId, year, month)
    OTR->>DB: SELECT SUM(EPOCH(end-start)/60) WHERE approved AND month=...
    DB-->>SVC: monthlyMinutes

    alt monthlyMinutes + requestedMinutes > 2400
        SVC-->>CTL: BadRequestException — vượt 40h/tháng
        CTL-->>EMP: 400 Bad Request
    else Trong giới hạn tháng
        SVC->>OTR: sumApprovedMinutesForYear(employeeId, year)
        OTR->>DB: SELECT SUM(EPOCH(end-start)/60) WHERE approved AND year=...
        DB-->>SVC: annualMinutes

        alt annualMinutes + requestedMinutes > 12000
            SVC-->>CTL: BadRequestException — vượt 200h/năm
            CTL-->>EMP: 400 Bad Request
        else Trong giới hạn năm
            SVC->>DB: INSERT ot_request {status: TO_APPROVE}
            DB-->>SVC: saved OTRequest
            SVC-->>CTL: OTRequestResponse
            CTL-->>EMP: 201 Created
        end
    end
    deactivate SVC
```

---

## 5. Luồng Phê duyệt / Từ chối Đơn Tăng ca

### 5.1 Biểu đồ Trình tự 3 cấp (Sequence Diagram)

```mermaid
sequenceDiagram
    participant LDR as LEADER
    participant MGR as MANAGER
    participant HR as HR_ADMIN
    participant SVC as OTRequestService
    participant DB as PostgreSQL

    Note over LDR,DB: Cấp 1
    LDR->>SVC: PUT /api/ot-requests/{id}/approve (role=LEADER)
    SVC->>DB: findById — status=TO_APPROVE
    SVC->>DB: UPDATE status=LEADER_APPROVED
    SVC-->>LDR: 200 OK

    Note over LDR,DB: Cấp 2
    MGR->>SVC: PUT /api/ot-requests/{id}/approve (role=MANAGER)
    SVC->>DB: findById — status=LEADER_APPROVED
    SVC->>DB: UPDATE status=MANAGER_APPROVED
    SVC-->>MGR: 200 OK

    Note over LDR,DB: Cấp 3 — Final
    HR->>SVC: PUT /api/ot-requests/{id}/approve (role=HR_ADMIN)
    SVC->>DB: findById — status=MANAGER_APPROVED
    SVC->>DB: UPDATE status=APPROVED
    Note over DB: Giờ OT này được tính vào hạn mức tháng/năm của nhân viên
    SVC-->>HR: 200 OK {status: APPROVED}
```

---

## 6. Biểu đồ Trạng thái Chung

```mermaid
stateDiagram-v2
    [*] --> TO_APPROVE : Nhân viên tạo đơn\n(Leave hoặc OT)

    TO_APPROVE : TO_APPROVE\nChờ LEADER xét duyệt

    TO_APPROVE --> LEADER_APPROVED : LEADER approve
    TO_APPROVE --> REJECTED : LEADER reject

    LEADER_APPROVED : LEADER_APPROVED\nChờ MANAGER xét duyệt

    LEADER_APPROVED --> MANAGER_APPROVED : MANAGER approve
    LEADER_APPROVED --> REJECTED : MANAGER reject

    MANAGER_APPROVED : MANAGER_APPROVED\nChờ HR_ADMIN xét duyệt cuối

    MANAGER_APPROVED --> APPROVED : HR_ADMIN approve\n[Leave: xác nhận số dư]
    MANAGER_APPROVED --> REJECTED : HR_ADMIN reject\n[Leave: hoàn trả số dư]

    APPROVED : APPROVED\nĐơn được chấp thuận\n[Leave: tính vào usedDays]\n[OT: tính vào hạn mức]

    REJECTED : REJECTED\nĐơn bị từ chối\nKhông thể sửa lại

    TO_APPROVE --> DELETED : Nhân viên xóa\n(chỉ ở TO_APPROVE/DRAFT)
    DELETED : Đã xóa khỏi hệ thống
```

---

## 7. Quản lý Số dư Nghỉ phép

### 7.1 Vòng đời Số dư Nghỉ phép Năm (ANNUAL)

```mermaid
flowchart TD
    subgraph LeaveBalance["LeaveBalance (ANNUAL, năm X)"]
        A[entitlementDays\nNgày phép được cấp]
        B[carriedOverDays\nNgày phép chuyển từ năm trước]
        C[pendingDays\nĐang chờ phê duyệt]
        D[usedDays\nĐã sử dụng]
        E[remainingDays\nCòn lại]
    end

    F([Nhân viên tạo đơn\nANNUAL leave]) -->|requestedDays = durationHours/8| G{remainingDays\n>= requestedDays?}
    G -->|Không| H[400 Bad Request]
    G -->|Có| I[pendingDays += requestedDays\nremainingDays -= requestedDays\nbalanceDeducted = true]

    I --> J{Kết quả phê duyệt?}
    J -->|HR_ADMIN APPROVED| K[pendingDays -= requestedDays\nusedDays += requestedDays\nSố dư đã confirmed]
    J -->|Bị REJECTED| L[pendingDays -= requestedDays\nremainingDays += requestedDays\nHoàn trả số dư]
    J -->|Nhân viên xóa| L
```

### 7.2 Các loại Nghỉ phép

| LeaveType | Nhân viên tạo | Kiểm tra số dư | Nguồn |
|-----------|:---:|:---:|---|
| `ANNUAL` | Có | Có | Phép năm cấp theo hợp đồng |
| `SICK` | Có | Không | Nghỉ ốm |
| `MATERNITY` | Có | Không | Thai sản |
| `PATERNITY` | Có | Không | Nghỉ chăm con |
| `BEREAVEMENT` | Có | Không | Tang chế |
| `MARRIAGE` | Có | Không | Nghỉ cưới |
| `UNPAID` | Có | Không | Nghỉ không lương |
| `PUBLIC_HOLIDAY` | Không (system) | Không | Ngày lễ quốc gia |
| `COMPENSATORY` | Không (system) | Không | Nghỉ bù |
