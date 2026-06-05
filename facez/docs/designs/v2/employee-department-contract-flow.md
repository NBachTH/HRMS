# Tài liệu Luồng Nhân viên, Phòng ban & Hợp đồng — v2

> **Thay đổi so với v1:** Ghi rõ giả định single-instance cho upload file; thêm ghi chú về audit trail qua `AuditableEntity`; document giới hạn contract scheduler (duplicate notification hàng ngày); ghi nhận không validate circular reference và không validate active employees khi xóa phòng ban.

## Mục lục

1. [Luồng Quản lý Nhân viên](#1-luồng-quản-lý-nhân-viên)
2. [Luồng Upload Ảnh đại diện](#2-luồng-upload-ảnh-đại-diện)
3. [Luồng Quản lý Phòng ban](#3-luồng-quản-lý-phòng-ban)
4. [Luồng Quản lý Hợp đồng](#4-luồng-quản-lý-hợp-đồng)
5. [Luồng Cảnh báo Hợp đồng Sắp hết hạn (Scheduler)](#5-luồng-cảnh-báo-hợp-đồng-sắp-hết-hạn-scheduler)
6. [Biểu đồ Quan hệ Entity](#6-biểu-đồ-quan-hệ-entity)
7. [Giới hạn Đã biết](#7-giới-hạn-đã-biết)

---

## 1. Luồng Quản lý Nhân viên

> **Audit trail:** `EmployeeInfo` và `UserAccount` kế thừa `AuditableEntity` — tất cả thao tác Create/Update đều tự động lưu `createdBy`, `updatedBy`, `createdAt`, `updatedAt` qua Spring Data JPA Auditing. `AuditorAwareImpl` lấy username từ `SecurityContext` (fallback "system" cho cron job).

### 1.1 Tạo Nhân viên mới

```mermaid
flowchart TD
    A([HR Admin]) -->|POST /api/employees\nEmployeeCreateRequest| B[EmployeeController]
    B --> C[EmployeeService.createEmployee]
    C --> D{Department\ntồn tại?}
    D -->|Không| E[404 Not Found]
    D -->|Có| F{username\nđã tồn tại?}
    F -->|Có| G[400 Bad Request\nUsername đã được dùng]
    F -->|Không| H[Tạo EmployeeInfo entity\nemployeeId = UUID]
    H --> I[Tạo UserAccount entity\npassword = BCrypt.encode\nrole = req.role]
    I --> J["Save EmployeeInfo + UserAccount\ntrong cùng transaction\nAudit: createdBy=HR_username, createdAt=now"]
    J --> K[201 Created EmployeeResponse]
```

### 1.2 Biểu đồ Trình tự Tạo Nhân viên (Sequence Diagram)

```mermaid
sequenceDiagram
    participant HR as HR Admin
    participant CTL as EmployeeController
    participant SVC as EmployeeService
    participant DEPT as DepartmentRepository
    participant UACC as UserAccountRepository
    participant DB as PostgreSQL

    HR->>CTL: POST /api/employees {name, email, username, password, departmentId, role, ...}
    CTL->>SVC: createEmployee(req)
    activate SVC

    SVC->>DEPT: findById(departmentId)
    DEPT->>DB: SELECT department WHERE id=?
    DB-->>SVC: Department | null

    alt Department không tồn tại
        SVC-->>CTL: ResourceNotFoundException
        CTL-->>HR: 404 Not Found
    else Department hợp lệ
        SVC->>UACC: existsUserAccountByUsername(username)
        DB-->>SVC: boolean

        alt Username đã tồn tại
            SVC-->>CTL: BadRequestException
            CTL-->>HR: 400 Bad Request
        else Username chưa dùng
            SVC->>SVC: employeeId = UUID.randomUUID()
            SVC->>SVC: Build EmployeeInfo {employeeId, name, email, phone, ...}
            SVC->>SVC: Build UserAccount {employeeId, username, BCrypt(password), role}
            Note over SVC: @MapsId — UserAccount dùng chung employeeId với EmployeeInfo\nAuditableEntity tự điền createdBy=SecurityContext.username

            SVC->>DB: INSERT employee_info (với createdBy, createdAt)
            SVC->>DB: INSERT user_account
            DB-->>SVC: saved entities

            SVC-->>CTL: EmployeeResponse
            CTL-->>HR: 201 Created
        end
    end
    deactivate SVC
```

### 1.3 Luồng Cập nhật Nhân viên

```mermaid
flowchart TD
    A([HR Admin]) -->|PUT /api/employees/id\nEmployeeUpdateRequest| B[EmployeeService.updateEmployee]
    B --> C[Load EmployeeInfo + UserAccount từ DB]
    C --> D[Cập nhật từng trường nếu != null\nAudit: updatedBy=HR_username, updatedAt=now]
    D --> E{Có thay đổi\ndepartmentId?}
    E -->|Có| F[Validate Department mới tồn tại]
    F --> G{Có thay đổi\nrole?}
    E -->|Không| G
    G -->|Có| H[Update UserAccount.role]
    G -->|Không| I[Bỏ qua]
    H --> J[Save EmployeeInfo\nSave UserAccount]
    I --> J
    J --> K[200 OK EmployeeResponse]
```

### 1.4 Luồng Xóa Nhân viên (Soft Delete)

```mermaid
flowchart TD
    A([HR Admin]) -->|DELETE /api/employees/id| B[EmployeeService.deleteEmployee]
    B --> C[Load EmployeeInfo từ DB]
    C --> D["EmployeeInfo.deleteFlag = true\nEmployeeInfo.deletedAt = now\nEmployeeInfo.status = TERMINATED\n⚠ Không kiểm tra nhân viên có đơn đang pending không"]
    D --> E[Load UserAccount tương ứng]
    E --> F[UserAccount.deleteFlag = true\nUserAccount.deletedAt = now]
    F --> G[Save cả hai trong transaction]
    G --> H[200 OK]
    H --> I[Nhân viên không thể đăng nhập\nDữ liệu lịch sử vẫn còn nguyên]
```

---

## 2. Luồng Upload Ảnh đại diện

> **Giả định:** File lưu trên local filesystem (`app.upload.profile-pictures/`). Phù hợp với **single-instance deployment**. Nếu scale horizontally (nhiều instance), các instance khác không chia sẻ được filesystem → cần object storage (S3, MinIO, GCS).

```mermaid
flowchart TD
    A([HR Admin]) -->|POST /api/employees/id/profile-picture\nMultipartFile| B[ProfilePictureService.uploadProfilePicture]
    B --> C{File extension hợp lệ?\njpeg, jpg, png, webp}
    C -->|Không| D[400 Bad Request\nUnsupported file type]
    C -->|Có| E{File size\n<= 5MB?}
    E -->|Không| F[400 Bad Request\nFile quá lớn]
    E -->|Có| G[Tạo filename\nUUID + original extension]
    G --> H["Lưu file vào filesystem\n{app.upload.profile-pictures}/{filename}\n⚠ Single-instance assumption"]
    H --> I[Cập nhật EmployeeInfo.profilePictureUrl\n= filename]
    I --> J[Save EmployeeInfo]
    J --> K[200 OK EmployeeResponse\nwith profilePictureUrl]
```

---

## 3. Luồng Quản lý Phòng ban

### 3.1 CRUD Phòng ban

```mermaid
sequenceDiagram
    participant HR as HR Admin
    participant CTL as DepartmentController
    participant SVC as DepartmentService
    participant DB as PostgreSQL

    Note over HR,DB: Tạo phòng ban
    HR->>CTL: POST /api/departments {departmentId, departmentName, managerId}
    CTL->>SVC: createDepartment(req)
    Note over SVC: ⚠ Không validate managerId thuộc phòng ban\nKhông validate circular reference
    SVC->>DB: INSERT department
    DB-->>HR: 200 OK DepartmentResponse

    Note over HR,DB: Lấy danh sách
    HR->>CTL: GET /api/departments
    CTL->>SVC: getAllDepartments()
    SVC->>DB: SELECT * WHERE deleteFlag=false
    DB-->>HR: 200 OK List<DepartmentResponse>

    Note over HR,DB: Cập nhật
    HR->>CTL: PUT /api/departments/{id} {departmentName}
    CTL->>SVC: updateDepartment(id, req)
    SVC->>DB: UPDATE department SET name=?
    DB-->>HR: 200 OK DepartmentResponse

    Note over HR,DB: Xóa mềm — ⚠ Không kiểm tra nhân viên active
    HR->>CTL: DELETE /api/departments/{id}
    CTL->>SVC: deleteDepartment(id)
    Note over SVC: ⚠ Không validate còn nhân viên ACTIVE trong phòng ban\nNhân viên vẫn link FK tới department đã soft-deleted
    SVC->>DB: UPDATE department SET deleteFlag=true, deletedAt=now
    DB-->>HR: 200 OK
```

---

## 4. Luồng Quản lý Hợp đồng

### 4.1 Tạo Hợp đồng mới

```mermaid
flowchart TD
    A([HR/Finance/Admin]) -->|POST /api/contracts\nContractRequest| B[ContractController]
    B --> C[ContractService.createContract]
    C --> D[Load EmployeeInfo\nkiểm tra tồn tại]
    D --> E["Tạo Contract entity\nid = UUID\ncurrent = true\neffectiveFrom = today nếu null\nAudit: createdBy=username, createdAt=now"]
    E --> F[Save Contract]
    F --> G[200 OK ContractResponse]
```

### 4.2 Cập nhật Hợp đồng — Version Control

```mermaid
flowchart TD
    A([HR Admin]) -->|PUT /api/contracts/id\nContractRequest| B[ContractService.updateContract]
    B --> C[Load Contract hiện tại current=true]
    C --> D["Supersede bản cũ\neffectiveTo = today\ncurrent = false\n— Lịch sử được giữ nguyên"]
    D --> E[Save bản cũ đã supersede]
    E --> F["Tạo Contract mới\nid = UUID mới, current = true\nCác trường: dùng giá trị mới\nFallback về giá trị cũ nếu req field = null\nAudit: createdBy=HR_username"]
    F --> G[Save Contract mới]
    G --> H[200 OK ContractResponse\nbản ghi mới là active]
```

### 4.3 Biểu đồ Trình tự Toàn bộ Luồng Hợp đồng (Sequence Diagram)

```mermaid
sequenceDiagram
    participant HR as HR Admin
    participant CTL as ContractController
    participant SVC as ContractService
    participant DB as PostgreSQL

    Note over HR,DB: Tạo hợp đồng
    HR->>CTL: POST /api/contracts {employeeId, baseSalary, startDate, endDate, ...}
    CTL->>SVC: createContract(req)
    SVC->>DB: findEmployee(employeeId)
    DB-->>SVC: EmployeeInfo
    SVC->>DB: INSERT contract {current=true, effectiveFrom=today, createdBy=username}
    SVC-->>HR: 200 OK ContractResponse

    Note over HR,DB: Cập nhật hợp đồng (version control — không mất lịch sử)
    HR->>CTL: PUT /api/contracts/{id} {baseSalary: newSalary}
    CTL->>SVC: updateContract(id, req)

    SVC->>DB: SELECT contract WHERE id=? — old record {current=true}
    DB-->>SVC: Contract (old)

    SVC->>DB: UPDATE contract SET effectiveTo=today, current=false
    Note over SVC: Bản cũ: current=false, effectiveTo=today — lịch sử còn nguyên

    SVC->>SVC: newContract = copy(old)\nnewContract.baseSalary = req.baseSalary (override)\nnewContract.xxx = old.xxx (fallback nếu req.xxx == null)
    SVC->>DB: INSERT contract {id=newUUID, current=true, effectiveFrom=today, createdBy=username}
    SVC-->>HR: 200 OK ContractResponse (new record)

    Note over HR,DB: Xem lịch sử đầy đủ
    HR->>CTL: GET /api/contracts/employee/{employeeId}/history
    CTL->>SVC: getContractHistoryByEmployee(employeeId)
    SVC->>DB: SELECT * WHERE employeeId AND deleteFlag=false ORDER BY effectiveFrom DESC
    DB-->>HR: List<ContractResponse> [mới nhất → cũ nhất]

    Note over HR,DB: Xem hợp đồng sắp hết hạn
    HR->>CTL: GET /api/contracts/expiring-soon?withinDays=30
    CTL->>SVC: getExpiringSoon(30)
    SVC->>DB: SELECT * WHERE current=true AND endDate BETWEEN today AND today+30
    DB-->>HR: List<ContractResponse>
```

---

## 5. Luồng Cảnh báo Hợp đồng Sắp hết hạn (Scheduler)

> **Giới hạn đã biết:** Mỗi ngày scheduler chạy sẽ tạo một notification mới cho nhân viên có hợp đồng sắp hết hạn. Nếu hợp đồng còn 30 ngày và chưa được gia hạn, nhân viên sẽ nhận **30 notification riêng biệt** trong 30 ngày. Không có cơ chế deduplication.

### 5.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Cron Job: 08:00 hằng ngày]) --> B[ContractExpiryScheduler\n.checkExpiringContracts]
    B --> C[today = LocalDate.now\nthreshold = today + 30 ngày]
    C --> D[Load tất cả hợp đồng\ncurrent=true, endDate BETWEEN today và threshold]
    D --> E{Có hợp đồng\nsắp hết hạn?}
    E -->|Không| F([Kết thúc])
    E -->|Có| G{Duyệt từng hợp đồng}
    G --> H[Log WARNING\nContract expiring for employee]
    H --> I["Publish ContractExpiringEvent\nemployeeId, employeeName, endDate\n⚠ Mỗi ngày publish 1 lần cho cùng contract\nKhông có dedup — nhân viên nhận N notification"]
    I --> J{Còn hợp đồng\ntiếp theo?}
    J -->|Có| G
    J -->|Không| K[Log INFO\nChecked N expiring contracts]
    K --> L([Kết thúc])

    I -->|Async @EventListener| M[NotificationEventListener\n.onContractExpiring]
    M --> N[NotificationService.send\nCONTRACT_EXPIRING → nhân viên]
```

### 5.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant CRON as Cron Scheduler
    participant SCH as ContractExpiryScheduler
    participant CR as ContractRepository
    participant EVT as Spring EventBus
    participant NEL as NotificationEventListener
    participant NTF as NotificationService
    participant DB as PostgreSQL

    Note over CRON: Mỗi ngày lúc 08:00
    CRON->>SCH: checkExpiringContracts()
    activate SCH

    SCH->>SCH: today / threshold = today + 30
    SCH->>CR: findByCurrentTrueAndEndDateBetween(today, threshold)
    CR->>DB: SELECT * FROM contract WHERE current=true AND end_date BETWEEN ? AND ?
    DB-->>SCH: List<Contract>

    loop Mỗi hợp đồng
        SCH->>SCH: Log WARNING
        SCH->>EVT: publish(ContractExpiringEvent)
        Note over SCH: ⚠ Nếu hợp đồng vẫn chưa gia hạn ngày mai\ncron sẽ publish lại event này
    end

    deactivate SCH

    Note over EVT,NTF: Async @EventListener (không cần transaction)
    EVT->>NEL: onContractExpiring(event)
    NEL->>NTF: send(employeeId, "Hợp đồng sắp hết hạn", message, CONTRACT_EXPIRING)
    NTF->>DB: INSERT notification — không check duplicate
```

---

## 6. Biểu đồ Quan hệ Entity

```mermaid
erDiagram
    Department {
        string departmentId PK
        string departmentName
        string managerId FK
        boolean deleteFlag
        datetime deletedAt
    }

    EmployeeInfo {
        string employeeId PK
        string name
        string email
        string phone
        string departmentId FK
        enum status
        string nationalId
        string taxCode
        string socialInsuranceCode
        string bankAccount
        date dateOfJoining
        date dateOfBirth
        enum gender
        boolean deleteFlag
        datetime deletedAt
        string createdBy
        string updatedBy
        datetime createdAt
        datetime updatedAt
    }

    UserAccount {
        string employeeId PK_FK
        string username
        string passwordHash
        string lastPasswordHash
        enum role
        boolean deleteFlag
        datetime deletedAt
    }

    Contract {
        string id PK
        string employeeId FK
        date startDate
        date endDate
        date effectiveFrom
        date effectiveTo
        boolean current
        string contractType
        long baseSalary
        long insuranceBase
        string positionCode
        int salaryStep
        int dependentCount
        boolean deleteFlag
        string createdBy
        datetime createdAt
    }

    TaxDependent {
        string id PK
        string employeeId FK
        string fullName
        string nationalId
        date dateOfBirth
        string relationship
        boolean active
    }

    Department ||--o{ EmployeeInfo : "có nhiều"
    EmployeeInfo ||--|| UserAccount : "có 1 tài khoản"
    EmployeeInfo ||--o{ Contract : "có lịch sử hợp đồng"
    EmployeeInfo ||--o{ TaxDependent : "có người phụ thuộc"
    Department }o--o| EmployeeInfo : "có 1 quản lý"
```

---

## 7. Giới hạn Đã biết

| Giới hạn | Mô tả | Mức độ ảnh hưởng |
|---|---|---|
| **Upload file lưu local filesystem** | `ProfilePictureService` lưu file vào `app.upload.profile-pictures/` trên disk local. Chỉ hoạt động với **single-instance**. Scale horizontally cần shared storage (NFS, S3). | Trung bình — Cần plan trước khi scale. |
| **Contract scheduler không dedup notification** | Mỗi ngày cron tạo 1 notification mới cho cùng 1 nhân viên có hợp đồng sắp hết hạn. Hợp đồng còn 30 ngày → 30 notification. | Trung bình UX — Cần thêm logic check "đã gửi notification cho contract này trong N ngày gần đây chưa". |
| **Xóa phòng ban không kiểm tra nhân viên active** | `deleteDepartment()` soft-delete ngay mà không kiểm tra còn nhân viên `ACTIVE` trong phòng ban. Nhân viên vẫn giữ FK trỏ tới phòng ban đã xóa. | Trung bình — Có thể gây data inconsistency. Cần thêm validation trước khi cho phép xóa. |
| **Không validate circular reference phòng ban** | `managerId` của Department là `employeeId` bất kỳ, không bắt buộc phải thuộc phòng ban đó. Không validate để tránh vòng lặp quản lý. | Thấp — Chỉ ảnh hưởng logic hiển thị org chart. |
| **Không có bảng audit log riêng** | Lịch sử thay đổi dữ liệu nhân viên chỉ ghi `updatedBy` và `updatedAt` (overwrite mỗi lần update). Contract có version history tự nhiên qua `effectiveFrom/effectiveTo`. Các entity khác mất lịch sử thay đổi. | Cao nếu cần audit compliance — Cần bảng audit log riêng cho dữ liệu nhạy cảm. |
