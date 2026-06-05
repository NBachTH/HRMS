# BÁO CÁO TIẾN ĐỘ TUẦN 1 — DỰ ÁN HRMS FACE-Z

> **Ngày báo cáo:** 02/04/2026  
> **Giai đoạn:** Tuần 1 — Hoàn thiện UI/UX & Infrastructure  
> **Stack:** Spring Boot 4.0.0-M3 (Java 21) + Next.js 16 (TypeScript, React 19) + PostgreSQL 15 + Redis 7

---

## PHẦN 1: CÁC THAY ĐỔI VỀ INFRASTRUCTURE

### 1.1. Kiến trúc hệ thống

Hệ thống được tổ chức theo kiến trúc **Monolithic Modular** với cấu trúc phân tầng `Controller → Service → Repository` cho từng module nghiệp vụ:

```
facez/src/main/java/org/dummy/facez/
├── auth/             # Xác thực & Quản lý phiên
├── common/           # Security, JWT, Exception, Enums, Response wrappers
├── configs/          # Spring Security, Redis, Data Initializer
└── domain/
    ├── attendance/    # Chấm công & Check-in logs
    ├── contract/      # Hợp đồng lao động
    ├── department/    # Phòng ban
    ├── employee/      # Nhân sự & Tài khoản
    ├── leave/         # Nghỉ phép
    ├── otrequest/     # Tăng ca
    └── payroll/       # MODULE MỚI — Tính lương
```

### 1.2. Thay đổi Infrastructure đã thực hiện

| Hạng mục | Chi tiết | Tệp/Thư mục liên quan |
|---|---|---|
| **Module Payroll mới** | Tạo toàn bộ domain payroll: entity, repository, service, controller, DTO, scheduler | [payroll/](file:///c:/HUST/project3/facez/src/main/java/org/dummy/facez/domain/payroll) (14 files) |
| **Payroll Config Engine** | Cấu hình lương qua JSON files, load tại startup bằng `@PostConstruct` | [config/payroll/](file:///c:/HUST/project3/facez/src/main/resources/config/payroll) (4 files) |
| **Async Batch Infrastructure** | Thread pool `payrollExecutor` cho xử lý batch bất đồng bộ qua `@Async` | [PayrollBatchService.java](file:///c:/HUST/project3/facez/src/main/java/org/dummy/facez/domain/payroll/service/PayrollBatchService.java) |
| **In-memory Job Store** | Lưu trạng thái batch job (PENDING/RUNNING/COMPLETED/FAILED) với `AtomicInteger` counters | [PayrollJobStore.java](file:///c:/HUST/project3/facez/src/main/java/org/dummy/facez/domain/payroll/service/PayrollJobStore.java), [PayrollJobRecord.java](file:///c:/HUST/project3/facez/src/main/java/org/dummy/facez/domain/payroll/service/PayrollJobRecord.java) |
| **Scheduled Job** | [PayrollScheduler](file:///c:/HUST/project3/facez/src/main/java/org/dummy/facez/domain/payroll/scheduler/PayrollScheduler.java#22-60) chạy batch payroll tự động vào 06:00 ngày 26 hàng tháng | [PayrollScheduler.java](file:///c:/HUST/project3/facez/src/main/java/org/dummy/facez/domain/payroll/scheduler/PayrollScheduler.java) |
| **Attendance Scheduler** | Cron job tổng hợp attendance từ checkin logs lúc 0h mỗi ngày | [AttendanceSchedule.java](file:///c:/HUST/project3/facez/src/main/java/org/dummy/facez/domain/attendance/service/AttendanceSchedule.java) |
| **Batch Check-in API** | Endpoint nhận batch check-in/out từ máy chấm công vật lý | [CheckinLogService.java](file:///c:/HUST/project3/facez/src/main/java/org/dummy/facez/domain/attendance/service/CheckinLogService.java) |
| **Device Entity** | Model `Device` đăng ký máy chấm công (deviceId, deviceName) | [Device.java](file:///c:/HUST/project3/facez/src/main/java/org/dummy/facez/domain/attendance/model/Device.java) |
| **Enum mở rộng** | Thêm `RequestStatus` 6 trạng thái cho multi-level approval, `PayrollStatus` 3 trạng thái | [RequestStatus.java](file:///c:/HUST/project3/facez/src/main/java/org/dummy/facez/common/enums/RequestStatus.java), [PayrollStatus.java](file:///c:/HUST/project3/facez/src/main/java/org/dummy/facez/common/enums/PayrollStatus.java) |
| **Contract Entity mở rộng** | Thêm fields: `baseSalary`, `insuranceBase`, [positionCode](file:///c:/HUST/project3/facez/src/main/java/org/dummy/facez/domain/payroll/service/PayrollCalculationEngine.java#231-240), `salaryStep`, `dependentCount` | [Contract.java](file:///c:/HUST/project3/facez/src/main/java/org/dummy/facez/domain/contract/model/Contract.java) |
| **RBAC Design Document** | Tài liệu thiết kế phân quyền chi tiết cho 5 role với ma trận quyền | [RBAC_Permissions.md](file:///c:/HUST/project3/RBAC_Permissions.md) |

### 1.3. Cấu hình JSON cho Payroll Engine

4 file cấu hình JSON được load tại startup:

| File | Nội dung | Căn cứ pháp lý |
|---|---|---|
| [salary-grades.json](file:///c:/HUST/project3/facez/src/main/resources/salary-grades.json) | Bảng hệ số lương theo chức danh & bậc (NV1–NV2, TL1–TL2, DL, BOD) | Quy chế lương nội bộ |
| [allowance-config.json](file:///c:/HUST/project3/facez/src/main/resources/allowance-config.json) | Phụ cấp sinh hoạt (HT2), phụ cấp tiếng Nhật (HT1), phụ cấp ODC (HT3) | Quy chế phụ cấp |
| [pit-config.json](file:///c:/HUST/project3/facez/src/main/resources/pit-config.json) | Biểu thuế TNCN lũy tiến, giảm trừ cá nhân & người phụ thuộc — có 2 bộ cho 2025 & 2026 | Luật 109/2025/QH15, Nghị quyết 110/2025/UBTVQH15 |
| [insurance-config.json](file:///c:/HUST/project3/facez/src/main/resources/config/payroll/insurance-config.json) | Tỷ lệ BHXH (8%), BHYT (1.5%), BHTN (1%), trần bảo hiểm 46,800,000 VND | Luật 41/2024/QH15, NĐ 188/2025 |

---

## PHẦN 2: CÁC API & UI ĐÃ TRIỂN KHAI — CHIA THEO MODULE

---

### Module 1: Authentication & RBAC

#### Backend API (đã có từ trước — hoàn chỉnh)

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/login` | Đăng nhập, trả JWT Access Token + Refresh Token (HttpOnly Cookie) |
| POST | `/api/auth/refresh` | Refresh access token tự động |
| POST | `/api/auth/logout` | Đăng xuất, blacklist refresh token trên Redis |
| GET | `/api/auth/me` | Thông tin user hiện tại |
| PUT | `/api/auth/change-password` | Đổi mật khẩu |

#### Kỹ thuật & Thuật toán
- **JWT (JSON Web Token)**: Access token 5 phút (in response body), refresh token 14 ngày (HttpOnly Cookie)
- **Token Refresh tự động**: [ApiCallUtil.tsx](file:///c:/HUST/project3/facez-front/src/app/commons/utils/ApiCallUtil.tsx) intercept 401 → gọi `/refresh` → retry request gốc
- **Redis Blacklist**: Logout thêm refresh token vào Redis blacklist, kiểm tra mỗi lần refresh
- **Spring Security Filter Chain**: Custom `JwtAuthenticationFilter` extract + validate token từ header `Authorization: Bearer <token>`
- **RBAC 5 roles**: `SYSTEM_ADMIN > HR_ADMIN > MANAGER > LEADER > EMPLOYEE`, enforce bằng `@PreAuthorize`

#### Frontend
-  [LoginForm.tsx](file:///c:/HUST/project3/facez-front/src/app/components/login/LoginForm.tsx) — Form đăng nhập
-  [AuthContext.tsx](file:///c:/HUST/project3/facez-front/src/app/commons/contexts/AuthContext.tsx) — Global auth state management
-  [Protector.tsx](file:///c:/HUST/project3/facez-front/src/app/commons/utils/Protector.tsx) — Route protection HOC
-  [ApiCallUtil.tsx](file:///c:/HUST/project3/facez-front/src/app/commons/utils/ApiCallUtil.tsx) — Centralized API client với auto-refresh

---

### 👥 Module 2: Employee Management

#### Backend API

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | `/api/employees/` | Tạo mới nhân viên + tài khoản | HR_ADMIN, SYSTEM_ADMIN |
| GET | `/api/employees/` | Danh sách (phân trang, sắp xếp) | HR, MANAGER, ADMIN |
| GET | `/api/employees/{id}` | Chi tiết nhân viên | HR, MANAGER, ADMIN |
| GET | `/api/employees/me` | Hồ sơ cá nhân | All |
| PUT | `/api/employees/{id}` | Cập nhật (thay đổi Role/Phòng ban) | HR_ADMIN, SYSTEM_ADMIN |
| DELETE | `/api/employees/{id}` | Soft delete + TERMINATED status | HR_ADMIN, SYSTEM_ADMIN |

#### Frontend ( MỚI — Tuần 1)
-  [EmployeeFormModal.tsx](file:///c:/HUST/project3/facez-front/src/app/components/employee/EmployeeFormModal.tsx) — **Create/Edit Employee Modal**
  - Form 12 fields: employeeId, name, username, password, email, role, department, phone, address, dateOfJoining, emergencyContact, status
  - Dropdown department load dynamic từ API
  - Edit mode disable các field không cho sửa (employeeId, username, password)
  - Dropdown Role (5 options) & Status (ACTIVE/INACTIVE/ON_LEAVE/TERMINATED)
-  [EmployeeTable.tsx](file:///c:/HUST/project3/facez-front/src/app/components/employee/EmployeeTable.tsx) — Bảng danh sách nhân viên
-  [EmployeeContent.tsx](file:///c:/HUST/project3/facez-front/src/app/components/employee/EmployeeContent.tsx) — Trang quản lý nhân viên

#### Kỹ thuật
- **Inline Form Validation**: RegExp cho email, required field check, error messages
- **Reusable Modal Pattern**: Kế thừa từ [Modal.tsx](file:///c:/HUST/project3/facez-front/src/app/components/common/Modal.tsx) (Escape key, backdrop click to close)
- **Toast Notification**: Success/Error notification tự động ẩn sau 4 giây

---

### Module 3: Department Management

#### Backend API

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | `/api/departments/` | Tạo phòng ban | HR_ADMIN, SYSTEM_ADMIN |
| GET | `/api/departments/` | Danh sách | All |
| GET | `/api/departments/{id}` | Chi tiết | All |
| PUT | `/api/departments/{id}` | Cập nhật (tên, quản lý) | HR_ADMIN, SYSTEM_ADMIN |
| DELETE | `/api/departments/{id}` | Xóa phòng ban | HR_ADMIN, SYSTEM_ADMIN |

#### Frontend ( MỚI — Tuần 1)
-  [DepartmentFormModal.tsx](file:///c:/HUST/project3/facez-front/src/app/components/department/DepartmentFormModal.tsx) — Create/Edit Department Modal
-  [DepartmentDetailContent.tsx](file:///c:/HUST/project3/facez-front/src/app/components/department/DepartmentDetailContent.tsx) — Chi tiết phòng ban
-  Confirm dialog cho thao tác xóa

---

### Module 4: Leave Management

#### Backend API

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | `/api/leaves/` | Tạo yêu cầu nghỉ phép | All |
| GET | `/api/leaves/` | Danh sách (phân trang) | HR, MANAGER, ADMIN |
| GET | `/api/leaves/{id}` | Chi tiết | All |
| **PUT** | **`/api/leaves/{id}/approve`** | **Multi-level approve** | LEADER, MANAGER, HR_ADMIN |
| **PUT** | **`/api/leaves/{id}/reject`** | **Multi-level reject** | LEADER, MANAGER, HR_ADMIN |
| DELETE | `/api/leaves/{id}` | Xóa (chỉ trạng thái TO_APPROVE/DRAFT) | Owner |

#### Kỹ thuật & Thuật toán ( MỚI — Tuần 1)

**Multi-level Approval State Machine:**

```
TO_APPROVE ──LEADER──> LEADER_APPROVED ──MANAGER──> MANAGER_APPROVED ──HR_ADMIN──> APPROVED
     │                      │                             │
     └──LEADER──> REJECTED  └──MANAGER──> REJECTED        └──HR_ADMIN──> REJECTED
```

- **State Machine Pattern**: `RequestStatus` enum 6 trạng thái: `DRAFT → TO_APPROVE → LEADER_APPROVED → MANAGER_APPROVED → APPROVED | REJECTED`
- **Role-based State Transition**: Mỗi role chỉ được approve/reject tại đúng step của mình
- **Business Rule Enforcement**: Service layer validate trạng thái hiện tại trước khi chuyển đổi, throw `BadRequestException` nếu vi phạm
- **Transactional Safety**: `@Transactional` đảm bảo tính nhất quán khi update status

#### Frontend ( MỚI — Tuần 1)
-  [LeaveFormModal.tsx](file:///c:/HUST/project3/facez-front/src/app/components/leave/LeaveFormModal.tsx) — Modal tạo yêu cầu nghỉ phép (reason, startTime, endTime)
-  [LeaveTable.tsx](file:///c:/HUST/project3/facez-front/src/app/components/leave/LeaveTable.tsx) — Bảng danh sách nghỉ phép
-  [LeaveContent.tsx](file:///c:/HUST/project3/facez-front/src/app/components/leave/LeaveContent.tsx) — Trang quản lý nghỉ phép

---

### Module 5: OT Request Management

#### Backend API

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | `/api/ot-requests/` | Đăng ký tăng ca | All |
| GET | `/api/ot-requests/` | Danh sách (phân trang) | HR, MANAGER, ADMIN |
| GET | `/api/ot-requests/{id}` | Chi tiết | All |
| **PUT** | **`/api/ot-requests/{id}/approve`** | **Multi-level approve** | LEADER, MANAGER, HR_ADMIN |
| **PUT** | **`/api/ot-requests/{id}/reject`** | **Multi-level reject** | LEADER, MANAGER, HR_ADMIN |
| DELETE | `/api/ot-requests/{id}` | Hủy yêu cầu | Owner |

#### Kỹ thuật (MỚI — Tuần 1)
- **State Machine** giống Leave module, chia sẻ cùng `RequestStatus` enum
- **Same 3-level approval logic**: LEADER → MANAGER → HR_ADMIN

#### Frontend (MỚI — Tuần 1)
-  [OTFormModal.tsx](file:///c:/HUST/project3/facez-front/src/app/components/ot/OTFormModal.tsx) — Modal đăng ký tăng ca (startTime, endTime)
-  [OTContent.tsx](file:///c:/HUST/project3/facez-front/src/app/components/ot/OTContent.tsx) — Trang quản lý OT
-  [RequestTableWithActions.tsx](file:///c:/HUST/project3/facez-front/src/app/components/request/RequestTableWithActions.tsx) — Table chung cho Leave/OT với nút Approve/Reject

---

### Module 6: Attendance Management

#### Backend API

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | `/api/attendances/` | Ghi nhận chấm công | All |
| GET | `/api/attendances/` | Danh sách (filter: employeeId, date range) | HR, MANAGER, ADMIN |
| GET | `/api/attendances/{id}` | Chi tiết | All |
| PUT | `/api/attendances/{id}` | Điều chỉnh thủ công | HR_ADMIN, SYSTEM_ADMIN |
| DELETE | `/api/attendances/{id}` | Soft delete | HR_ADMIN, SYSTEM_ADMIN |

#### Kỹ thuật & Thuật toán

- **Auto-compute Attendance Metrics**: Từ `checkIn` và `checkOut` tự động tính: `lateHour`, `workingHour`, `paidHour`, `workingDay`, `paidDay`, `violate`
  - `WORK_START = 08:30` — đi muộn tính từ mốc này
  - `lateHour = Duration(WORK_START, checkIn) / 60.0` (BigDecimal, scale 2)
  - `paidHour = workingHour - lateHour` (min 0)
  - `paidDay = paidHour / 8.0`
  - `violate = true` nếu đi muộn hoặc quên checkout
- **Batch Check-in Processing**: Nhận danh sách check-in/out từ máy chấm công → xử lý từng item độc lập → trả `BatchCheckinResponse` với success/failed count
- **Scheduled Attendance Aggregation**: Cron `0 0 0 * * *` (mỗi ngày lúc 0h) nhóm CheckinLog theo employee → tạo Attendance record

#### Frontend
- [AttendanceContent.tsx](file:///c:/HUST/project3/facez-front/src/app/components/attendance/AttendanceContent.tsx) — Trang quản lý chấm công
- [AttendanceTable.tsx](file:///c:/HUST/project3/facez-front/src/app/components/attendance/AttendanceTable.tsx) — Bảng chấm công

---

### Module 7: Contract Management (MỚI — Tuần 1)

#### Backend API

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | `/api/contracts` | Tạo hợp đồng | HR_ADMIN |
| GET | `/api/contracts` | Danh sách tất cả hợp đồng | HR_ADMIN |
| **GET** | **`/api/contracts/my`** | **Self-service: hợp đồng của mình** | All (authenticated) |
| GET | `/api/contracts/{id}` | Chi tiết hợp đồng | HR_ADMIN |
| PUT | `/api/contracts/{id}` | Cập nhật / Gia hạn | HR_ADMIN |
| DELETE | `/api/contracts/{id}` | Xóa hợp đồng | HR_ADMIN |

#### Contract Entity mở rộng
Thêm 5 field mới phục vụ tính lương:
- `baseSalary` (Long) — Lương cơ bản hợp đồng (Lhq) — VND
- `insuranceBase` (Long) — Mức đóng BHXH (LCB), giới hạn 46,800,000
- [positionCode](file:///c:/HUST/project3/facez/src/main/java/org/dummy/facez/domain/payroll/service/PayrollCalculationEngine.java#231-240) (String) — Mã chức danh (NV1, TL1, BOD)
- `salaryStep` (Integer) — Bậc lương (1–10)
- `dependentCount` (Integer) — Số người phụ thuộc cho giảm trừ thuế TNCN

#### Frontend (HOÀN TOÀN MỚI — Tuần 1)
- [ContractContent.tsx](file:///c:/HUST/project3/facez-front/src/app/components/contract/ContractContent.tsx) — **Trang quản lý hợp đồng hoàn chỉnh**
  - Bảng danh sách hợp đồng với search (by employee name, ID, type)
  - Create/Edit Contract Modal (employee dropdown, type, dates, terms, salary rank, status)
  - Styled delete confirm dialog
  - Status badge colors (ACTIVE/EXPIRED/TERMINATED)

---

### Module 8: Payroll — Tính Lương (HOÀN TOÀN MỚI — Tuần 1)

> **Đây là module phức tạp nhất, xây dựng hoàn toàn mới trong tuần 1.**

#### Backend API — 10 endpoint

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| **POST** | **`/api/payrolls/calculate`** | Tính lương 1 nhân viên → lưu DRAFT | HR_ADMIN, SYSTEM_ADMIN |
| **POST** | **`/api/payrolls/batch-calculate`** | Batch tính lương toàn bộ (async, trả 202) | HR_ADMIN, SYSTEM_ADMIN |
| **GET** | **`/api/payrolls/jobs/{jobId}`** | Poll trạng thái batch job | HR_ADMIN, SYSTEM_ADMIN |
| GET | `/api/payrolls` | Danh sách (phân trang) | HR_ADMIN, SYSTEM_ADMIN |
| GET | `/api/payrolls/period?year=&month=` | Lọc theo kỳ lương | HR_ADMIN, SYSTEM_ADMIN |
| GET | `/api/payrolls/employee/{id}` | Lịch sử lương nhân viên | HR_ADMIN, SYSTEM_ADMIN, MANAGER |
| **GET** | **`/api/payrolls/my`** | Self-service: phiếu lương cá nhân | All (authenticated) |
| GET | `/api/payrolls/{id}` | Chi tiết bản ghi | HR_ADMIN, SYSTEM_ADMIN |
| **PATCH** | **`/api/payrolls/{id}/approve`** | Duyệt DRAFT → APPROVED | HR_ADMIN, SYSTEM_ADMIN |
| **PATCH** | **`/api/payrolls/{id}/mark-paid`** | APPROVED → PAID | HR_ADMIN, SYSTEM_ADMIN |
| DELETE | `/api/payrolls/{id}` | Xóa (chỉ DRAFT) | HR_ADMIN, SYSTEM_ADMIN |

#### Kỹ thuật & Thuật toán chi tiết

##### A. Công thức Tính Lương (PayrollCalculationEngine)

Công thức chính tuân thủ quy chế lương Việt Nam:

```
GROSS  = [(Lhq × KPItb) + Li + HTi] × (NCtt / Nt) + OT_Pay + Bonus
NET    = GROSS − BHXH − BHYT − BHTN − PIT
```

| Ký hiệu | Ý nghĩa | Cách tính |
|---|---|---|
| **Lhq** | Lương hiệu quả (từ hợp đồng) | `contract.baseSalary` |
| **KPItb** | KPI trung bình | [(KPI1 + KPI2) / 2](file:///c:/HUST/project3/facez-front/src/app/components/payroll/PayslipContent.tsx#18-22) |
| **KPI1** | Đánh giá hiệu suất | A=1.04, B=1.00, C=0.98 |
| **KPI2** | Đánh giá chuyên cần | A=1.04, B=1.02, C=1.00 (auto-compute từ attendance nếu null) |
| **Li** | Hệ số vị trí | Tra từ [salary-grades.json](file:///c:/HUST/project3/facez/src/main/resources/salary-grades.json) theo positionCode + salaryStep |
| **HTi** | Tổng phụ cấp | HT2 (sinh hoạt, theo level, pro-rata) + HT1 (tiếng Nhật) + HT3 (ODC) |
| **NCtt** | Ngày công thực tế | Đếm attendance records có `paidDay > 0` |
| **Nt** | Ngày công chuẩn | Mặc định 26 ngày/tháng |

##### B. Tính OT Pay (Luật Lao động 45/2019/QH14)

```java
hourlyWage = Lhq / (Nt × 8)
OT_Pay = Σ(hours × hourlyWage × rate × nightMultiplier)
```

| OT Type | Rate |
|---|---|
| Ngày thường | ×1.5 |
| Cuối tuần (Sat/Sun) | ×2.0 |
| Ca đêm (22:00–06:00) | Nhân thêm ×1.3 |

##### C. Bảo hiểm (theo NĐ 188/2025/NĐ-CP)

| Loại | Tỷ lệ NLĐ | Trần đóng |
|---|---|---|
| BHXH | 8% | 46,800,000 VND |
| BHYT | 1.5% | 46,800,000 VND |
| BHTN | 1% | 46,800,000 VND |

- Chỉ tính nếu loại hợp đồng ∈ `[FIXED_TERM, INDEFINITE]`
- LCB = `min(insuranceBase, 46,800,000)`

##### D. Thuế TNCN (PIT) — Progressive 5-bracket (2026)

```
Taxable = GROSS − BHXH − BHYT − BHTN − 15,500,000 − (6,200,000 × dependentCount)
PIT = Taxable × rate − quick_deduction
```

| Bậc | Từ (VND) | Đến (VND) | Thuế suất | Giảm trừ nhanh |
|---|---|---|---|---|
| 1 | 0 | 10,000,000 | 5% | 0 |
| 2 | 10,000,001 | 30,000,000 | 10% | 500,000 |
| 3 | 30,000,001 | 60,000,000 | 20% | 3,500,000 |
| 4 | 60,000,001 | 100,000,000 | 30% | 9,500,000 |
| 5 | 100,000,001+ | — | 35% | 14,500,000 |

##### E. Batch Processing Architecture

```
┌────────────────┐    triggerBatch()    ┌─────────────────┐
│  Controller    │──────────────────────│  BatchService   │
│  (HTTP thread) │    runBatch()        │  (@Async proxy) │
│  returns 202   │──────────────────────│  payrollExecutor│
└────────────────┘                      │  thread pool    │
       │                                └────────┬────────┘
       │ poll GET /jobs/{id}                     │
       ▼                                         ▼
┌────────────────┐                      ┌─────────────────┐
│  PayrollJob    │◄─────────────────────│  Bulk load      │
│  Store (memory)│  update counters     │  4 queries total│
│  AtomicInteger │                      │  Group in-memory│
└────────────────┘                      │  saveAll() once │
                                        └─────────────────┘
```

**Performance Strategy — O(4) queries total thay vì O(N×3):**
1. 1 query: Load tất cả active employees
2. 1 query: Bulk load contracts (JOIN FETCH)
3. 1 query: Bulk load attendance records
4. 1 query: Bulk load approved OT requests
5. Group data in memory bằng `Collectors.groupingBy(employeeId)`
6. Tính lương per-employee **zero DB calls** trong vòng lặp
7. `saveAll()` — single batch INSERT

##### F. Payroll Status Machine

```
DRAFT ──approve──> APPROVED ──markPaid──> PAID
  │
  └──delete──> (removed)
```

#### Frontend (HOÀN TOÀN MỚI — Tuần 1)

**HR Admin — Payroll Management** ([PayrollContent.tsx](file:///c:/HUST/project3/facez-front/src/app/components/payroll/PayrollContent.tsx), 631 lines):
- Bảng payroll theo kỳ (Month/Year filter)
- **SingleCalcModal** — Form tính lương 1 nhân viên (employee dropdown, month, year, KPI1, bonus, Japanese level, ODC allowance, working days)
- **BatchCalcModal** — Batch tính lương all employees với **real-time polling**:
  - Submit → nhận jobId → poll mỗi 1.5s → hiển thị progress (Total/Done/Skipped/Failed)
  - Spinner animation khi RUNNING, CheckCircle khi COMPLETED
  - Error list hiển thị khi có failures
- Action buttons: Approve (DRAFT→APPROVED), Mark Paid (APPROVED→PAID), Delete (DRAFT only)
- Styled delete confirm dialog
- Phân trang (Previous/Next)
- VND currency formatting (`Intl.NumberFormat vi-VN`)

**Employee Self-service — My Payslips** ([PayslipContent.tsx](file:///c:/HUST/project3/facez-front/src/app/components/payroll/PayslipContent.tsx), 242 lines):
- **PayslipCard** — Card view mỗi tháng (Gross, Deductions, Net)
- **PayslipDetail** — Modal chi tiết phiếu lương đầy đủ:
  - Attendance: NCtt, Nt
  - Earnings: Lhq, Li, HT1, HT2, HT3, KPI scores, OT Pay, Bonus
  - Deductions: BHXH, BHYT, BHTN, PIT, Dependents
  - Net Salary (font bold, màu xanh)
- Year filter
- Grid responsive layout (1/2/3 columns)

---

### Shared Frontend Components (MỚI — Tuần 1)

| Component | File | Mô tả |
|---|---|---|
| [Modal.tsx](file:///c:/HUST/project3/facez-front/src/app/components/common/Modal.tsx) | [Modal.tsx](file:///c:/HUST/project3/facez-front/src/app/components/common/Modal.tsx) | Reusable overlay (Escape key + backdrop click to close) |
| [ToastContext.tsx](file:///c:/HUST/project3/facez-front/src/app/commons/contexts/ToastContext.tsx) | [ToastContext.tsx](file:///c:/HUST/project3/facez-front/src/app/commons/contexts/ToastContext.tsx) | Global success/error notifications (auto-dismiss 4s) |
| [Sidebar.tsx](file:///c:/HUST/project3/facez-front/src/app/components/Sidebar.tsx) | [Sidebar.tsx](file:///c:/HUST/project3/facez-front/src/app/components/Sidebar.tsx) | Navigation bar theo role |
| Confirm Dialog | Được tích hợp trực tiếp trong các component | Styled dialog cho delete actions (thay thế browser `confirm()`) |

---

## PHẦN 3: TỔNG KẾT TRẠNG THÁI HIỆN TẠI

| Module | Backend | Frontend | Trạng thái | Ghi chú |
|---|:---:|:---:|:---:|---|
| Authentication & RBAC | 100% | 100% | Hoàn chỉnh | JWT + Redis blacklist |
| Employee Management | 100% | 100% | Hoàn chỉnh | CRUD + Modals |
| Department Management | 100% | 100% | Hoàn chỉnh | CRUD + Detail page |
| Leave Management | 100% | 90% | Gần xong | Multi-level approval xong |
| OT Management | 100% | 90% | Gần xong | Multi-level approval xong |
| Contract Management | 100% | 100% | Hoàn chỉnh | MỚI hoàn toàn |
| Attendance | 80% | 70% | Cơ bản | Batch check-in + schedule OK |
| **Payroll** | **100%** | **95%** | **Hoàn chỉnh** | **MỚI hoàn toàn — 14 files BE, 2 pages FE** |
| Dashboard Analytics | 0% | Mock | Chưa bắt đầu | Biểu đồ vẫn dùng mock data |
| PDF/Excel Reports | 0% | 0% | Chưa bắt đầu | |
| Email Notifications | 0% | 0% | Chưa bắt đầu | |

> **Ước tính tổng tiến độ: ~65% (tăng từ ~35% trước tuần 1)**

---

## PHẦN 4: KẾ HOẠCH TIẾP THEO

### Tuần 2: Dashboard Analytics & API Thống kê

| Nhiệm vụ | Chi tiết |
|---|---|
| **API Dashboard Stats** | `GET /api/dashboard/stats` — headcount, active employees, pending approvals |
| **API Attendance Summary** | `GET /api/dashboard/attendance-summary` — on-time/late/absent theo tuần |
| **API Expiring Contracts** | `GET /api/dashboard/expiring-contracts` — hợp đồng sắp hết hạn (30/15/7 ngày) |
| **Frontend Dashboard** | Kết nối biểu đồ với API thực, bỏ mock data |
| **Employee Self-service Dashboard** | Trang tổng hợp: attendance, leave balance, pending requests |

### Tuần 3–4: Xuất báo cáo & Email

| Nhiệm vụ | Chi tiết |
|---|---|
| **PDF Payslip** | Tích hợp iText/OpenPDF, font Unicode tiếng Việt, endpoint download |
| **Excel Reports** | Apache POI — báo cáo chấm công, tổng hợp lương theo phòng ban |
| **Email Notifications** | Spring Boot Mail + Thymeleaf templates: payslip, leave approved/rejected, contract expiring |

### Tuần 5–6: Microservices Research

| Nhiệm vụ | Chi tiết |
|---|---|
| **Tách Service** | Employee Service, Attendance Service, Payroll Service |
| **API Gateway** | Spring Cloud Gateway |
| **Service Discovery** | Eureka Server |
| **Inter-service Communication** | OpenFeign / RabbitMQ |

### Tuần 7–8: Testing, Deployment & Demo

| Nhiệm vụ | Chi tiết |
|---|---|
| **Unit Tests** | PayrollCalculationService, AttendanceProcessing, LeaveService — target >70% |
| **Docker Compose** | Full stack: BE + FE + PostgreSQL + Redis |
| **Deploy** | Render.com hoặc Railway |
| **Demo Video** | Chấm công → OT → Tính lương → PDF → Email |

---

> **Kết luận Tuần 1:** Đã hoàn thành vượt kế hoạch — ngoài mục tiêu UI/UX, đã xây dựng **hoàn chỉnh** module Payroll (14 files backend + 2 trang frontend) với engine tính lương tuân thủ pháp luật Việt Nam, batch processing bất đồng bộ, và hệ thống multi-level approval cho Leave & OT.
