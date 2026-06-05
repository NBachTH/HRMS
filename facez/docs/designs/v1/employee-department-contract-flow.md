# Tài liệu Luồng Nhân viên, Phòng ban & Hợp đồng

## Mục lục

1. [Luồng Quản lý Nhân viên](#1-luồng-quản-lý-nhân-viên)
2. [Luồng Upload Ảnh đại diện](#2-luồng-upload-ảnh-đại-diện)
3. [Luồng Quản lý Phòng ban](#3-luồng-quản-lý-phòng-ban)
4. [Luồng Quản lý Hợp đồng](#4-luồng-quản-lý-hợp-đồng)
5. [Luồng Cảnh báo Hợp đồng Sắp hết hạn (Scheduler)](#5-luồng-cảnh-báo-hợp-đồng-sắp-hết-hạn-scheduler)
6. [Biểu đồ Quan hệ Entity](#6-biểu-đồ-quan-hệ-entity)

---

## 1. Luồng Quản lý Nhân viên

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
    I --> J[Save EmployeeInfo + UserAccount\ntrong cùng transaction]
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
            Note over SVC: UserAccount.@MapsId → dùng chung employeeId với EmployeeInfo

            SVC->>DB: INSERT employee_info
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
    C --> D[Cập nhật từng trường nếu != null]
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
    C --> D[EmployeeInfo.deleteFlag = true\nEmployeeInfo.deletedAt = now\nEmployeeInfo.status = TERMINATED]
    D --> E[Load UserAccount tương ứng]
    E --> F[UserAccount.deleteFlag = true\nUserAccount.deletedAt = now]
    F --> G[Save cả hai]
    G --> H[200 OK]
    H --> I[Nhân viên không thể\nđăng nhập nữa]
```

---

## 2. Luồng Upload Ảnh đại diện

```mermaid
flowchart TD
    A([HR Admin]) -->|POST /api/employees/id/profile-picture\nMultipartFile| B[ProfilePictureService.uploadProfilePicture]
    B --> C{File extension hợp lệ?\njpeg, jpg, png, webp}
    C -->|Không| D[400 Bad Request\nUnsupported file type]
    C -->|Có| E{File size\n<= 5MB?}
    E -->|Không| F[400 Bad Request\nFile quá lớn]
    E -->|Có| G[Tạo filename\nUUID + original extension]
    G --> H[Lưu file vào filesystem\napp.upload.profile-pictures/filename]
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

    Note over HR,DB: Xóa mềm
    HR->>CTL: DELETE /api/departments/{id}
    CTL->>SVC: deleteDepartment(id)
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
    D --> E[Tạo Contract entity\nid = UUID\ncurrent = true\neffectiveFrom = today nếu null]
    E --> F[Save Contract]
    F --> G[200 OK ContractResponse]
```

### 4.2 Cập nhật Hợp đồng — Version Control

```mermaid
flowchart TD
    A([HR Admin]) -->|PUT /api/contracts/id\nContractRequest| B[ContractService.updateContract]
    B --> C[Load Contract hiện tại từ DB]
    C --> D[Supersede hợp đồng cũ\neffectiveTo = today\ncurrent = false]
    D --> E[Save hợp đồng cũ đã supersede]
    E --> F[Tạo Contract mới\nid = UUID mới\ncurrent = true\nCác trường: dùng giá trị mới\nnếu không cung cấp thì fallback về giá trị cũ]
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
    SVC->>DB: INSERT contract {current=true, effectiveFrom=today}
    SVC-->>HR: 200 OK ContractResponse

    Note over HR,DB: Cập nhật hợp đồng (version control)
    HR->>CTL: PUT /api/contracts/{id} {baseSalary: newSalary}
    CTL->>SVC: updateContract(id, req)

    SVC->>DB: SELECT contract WHERE id=? (old record)
    DB-->>SVC: Contract {current=true}

    SVC->>DB: UPDATE contract SET effectiveTo=today, current=false (supersede)

    SVC->>SVC: newContract = copy old + override with req fields
    SVC->>DB: INSERT contract {id=newUUID, current=true, effectiveFrom=today}
    SVC-->>HR: 200 OK ContractResponse (new record)

    Note over HR,DB: Xem lịch sử
    HR->>CTL: GET /api/contracts/employee/{employeeId}/history
    CTL->>SVC: getContractHistoryByEmployee(employeeId)
    SVC->>DB: SELECT * WHERE employeeId ORDER BY effectiveFrom DESC
    DB-->>HR: List<ContractResponse> [new→old]

    Note over HR,DB: Xem hợp đồng sắp hết hạn
    HR->>CTL: GET /api/contracts/expiring-soon?withinDays=30
    CTL->>SVC: getExpiringSoon(30)
    SVC->>DB: SELECT * WHERE current=true AND endDate BETWEEN today AND today+30
    DB-->>HR: List<ContractResponse>
```

---

## 5. Luồng Cảnh báo Hợp đồng Sắp hết hạn (Scheduler)

### 5.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Cron Job: 08:00 hằng ngày]) --> B[ContractExpiryScheduler\n.checkExpiringContracts]
    B --> C[today = LocalDate.now\nthreshold = today + 30 ngày]
    C --> D[Load tất cả hợp đồng\ncurrent=true, endDate BETWEEN today và threshold]
    D --> E{Có hợp đồng\nsắp hết hạn?}
    E -->|Không| F([Kết thúc - Không có gì])
    E -->|Có| G{Duyệt từng\nhợp đồng}
    G --> H[Log WARNING\nContract expiring for employee]
    H --> I[Publish ContractExpiringEvent\nemployeeId, employeeName, endDate]
    I --> J{Còn hợp đồng\ntiếp theo?}
    J -->|Có| G
    J -->|Không| K[Log INFO\nChecked N expiring contracts]
    K --> L([Kết thúc])

    I -->|Async EventListener| M[NotificationEventListener\n.onContractExpiring]
    M --> N[NotificationService.send\nCONTRACT_EXPIRING notification\ngửi cho nhân viên]
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

    SCH->>SCH: today = LocalDate.now()\nthreshold = today.plusDays(30)
    SCH->>CR: findByCurrentTrueAndEndDateBetween(today, threshold)
    CR->>DB: SELECT * FROM contract WHERE current=true AND end_date BETWEEN ? AND ?
    DB-->>SCH: List<Contract>

    loop Mỗi hợp đồng sắp hết hạn
        SCH->>SCH: Log WARNING "Contract expiring: {employee} on {date}"
        SCH->>EVT: publish(ContractExpiringEvent {employeeId, employeeName, endDate})
    end

    SCH->>SCH: Log INFO "Checked {total} expiring contracts"
    deactivate SCH

    Note over EVT,NTF: Async @EventListener (không cần AFTER_COMMIT)
    EVT->>NEL: onContractExpiring(event)
    NEL->>NTF: send(employeeId, "Hợp đồng sắp hết hạn", message, CONTRACT_EXPIRING)
    NTF->>DB: INSERT notification
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
