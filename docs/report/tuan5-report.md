# BÁO CÁO TIẾN ĐỘ TUẦN 2 — DỰ ÁN HRMS FACE-Z

> **Ngày báo cáo:** 09/04/2026
> **Giai đoạn:** Tuần 2 — Dashboard Analytics & System Config Management
> **Stack:** Spring Boot 4.0.0-M3 (Java 21) + Next.js 15 (TypeScript, React 19) + PostgreSQL 15 + Redis 7

---

## PHẦN 1: TỔNG QUAN CÔNG VIỆC TUẦN NÀY

Tuần này tập trung vào hai mảng chính theo kế hoạch tuần 2:

1. **Dashboard Analytics** — Xây dựng dashboard thực tế theo từng role, thay thế hoàn toàn mock data bằng dữ liệu thật từ API, kèm nhiều biểu đồ phân tích.
2. **System Config Management** — Thêm module quản lý cấu hình lương theo phiên bản (versioned config) cho phép SYSTEM_ADMIN cập nhật bảng lương, thuế, bảo hiểm mà không cần deploy lại.
3. **Mock Data Infrastructure** — Script tạo và chèn dữ liệu mẫu đầy đủ cho toàn bộ Q1/2026 phục vụ demo và kiểm thử.

---

## PHẦN 2: CHI TIẾT CÁC THAY ĐỔI

---

### Module 1: Dashboard Analytics (HOÀN TOÀN MỚI)

#### Kiến trúc Dashboard

Dashboard được thiết kế theo **role-based routing**: component `DashboardContent.tsx` đọc `role` từ `AuthContext` và render đúng dashboard phù hợp cho từng loại người dùng.

```
DashboardContent
├── SYSTEM_ADMIN → SystemAdminDashboard
├── HR_ADMIN     → HrDashboard
├── MANAGER/LEADER → ManagerDashboard (embedded EmployeeDashboard)
└── EMPLOYEE     → EmployeeDashboard
```

Route: `/employees/dashboard` — dùng chung cho mọi role, hiển thị khác nhau theo quyền.

---

#### 1.1 HrDashboard — Dành cho HR_ADMIN

**File:** `components/dashboard/HrDashboard.tsx`

**Dữ liệu thực từ API (không mock):**

| Stat Card | Nguồn dữ liệu |
|---|---|
| Tổng nhân viên | `GET /api/employees` (totalElements từ page) |
| Tổng quỹ lương tháng | Tổng hợp từ `GET /api/payrolls/period?year=&month=` |
| Hợp đồng sắp hết hạn | Filter từ `GET /api/contracts` (endDate trong 30 ngày) |
| Yêu cầu chờ duyệt | `GET /api/leaves?status=MANAGER_APPROVED` + OT tương tự |

**Biểu đồ phân tích (Recharts):**

| Component | Loại biểu đồ | Dữ liệu |
|---|---|---|
| `PayrollTrendChart` | Line chart | Tổng NET lương 6 tháng gần nhất |
| `PayrollCostBreakdownBar` | Bar chart | BHXH, BHYT, BHTN, PIT tháng hiện tại |
| `PayrollStatusBreakdown` | Pie/Donut | DRAFT / APPROVED / PAID |
| `DeptHeadcountChart` | Bar chart | Số nhân viên theo phòng ban |
| `ContractTypeChart` | Pie chart | Tỷ lệ loại hợp đồng |
| `LeaveApprovalRateChart` | Bar chart | Tỷ lệ approve/reject nghỉ phép |
| `ApprovalMiniTable` | Table | Danh sách yêu cầu đang chờ duyệt kèm nút Approve/Reject trực tiếp |

---

#### 1.2 EmployeeDashboard — Dành cho EMPLOYEE (embedded trong ManagerDashboard)

**File:** `components/dashboard/EmployeeDashboard.tsx`

**Dữ liệu thực từ API:**

| Phần | Nguồn |
|---|---|
| Ngày công tháng | `GET /api/attendances?from=&to=` (filter theo tháng) |
| Số ngày nghỉ đã dùng | `GET /api/leaves` (count APPROVED trong tháng) |
| Giờ tăng ca | `GET /api/ot-requests` (tổng giờ APPROVED) |
| Lương tháng gần nhất | `GET /api/payrolls/my` |

**Biểu đồ:**

| Component | Loại | Dữ liệu |
|---|---|---|
| `WorkingHoursBarChart` | Bar | Giờ làm thực tế từng ngày trong tháng |
| `AttendanceSummaryDonut` | Donut | On-time / Late / Absent |
| `MySalaryTrendChart` | Line | Lương NET 6 tháng gần nhất |
| `AttendanceMonthTable` | Table | Bảng chấm công chi tiết từng ngày |
| `MiniRequestTable` | Table | Leave/OT requests gần nhất kèm trạng thái |

**Month/Year filter** cho phép xem lịch sử tháng bất kỳ.

---

#### 1.3 ManagerDashboard — Dành cho MANAGER/LEADER

**File:** `components/dashboard/ManagerDashboard.tsx`

- **Embed `EmployeeDashboard`** — Manager cũng thấy dữ liệu cá nhân của mình
- **Pending approvals** — filter theo role:
  - `LEADER` thấy requests ở status `TO_APPROVE`
  - `MANAGER` thấy requests ở status `LEADER_APPROVED`
- **`ApprovalMiniTable`** — Approve/Reject trực tiếp từ dashboard, gọi `/approve` & `/reject` endpoints
- **`RequestStatusPieChart`** — Pie chart tỷ lệ trạng thái yêu cầu trong phòng ban
- **`DeptStatusDonut`** — Donut chart trạng thái nhân viên phòng ban (ACTIVE/ON_LEAVE/...)
- **`DeptMemberTable`** — Bảng danh sách thành viên phòng do Manager quản lý (tự động tìm phòng ban bằng `managerId`)

---

#### 1.4 SystemAdminDashboard — Dành cho SYSTEM_ADMIN

**File:** `components/dashboard/SystemAdminDashboard.tsx`

- **Embed `EmployeeDashboard`** — Dữ liệu cá nhân
- **Payroll Config Status** — Hiển thị 4 card tương ứng 4 loại config (`SALARY_GRADE`, `ALLOWANCE`, `PIT`, `INSURANCE`):
  - Nếu đang active: hiển thị version, effectiveDate, legalBasis, updatedBy
  - Nếu không có config active: badge đỏ "Config missing" cảnh báo payroll engine sẽ lỗi
  - Nút "Manage →" dẫn đến `/system/config`

---

### Module 2: System Config Management (HOÀN TOÀN MỚI)

> Cho phép SYSTEM_ADMIN quản lý cấu hình payroll engine (bảng lương, phụ cấp, thuế TNCN, bảo hiểm) theo phiên bản, không cần sửa code hay deploy lại.

#### 2.1 Backend — `SystemConfig` Entity

**File:** `domain/payroll/model/SystemConfig.java`

| Field | Kiểu | Mô tả |
|---|---|---|
| `id` | String (UUID) | PK |
| `configType` | String | `SALARY_GRADE` / `ALLOWANCE` / `PIT` / `INSURANCE` |
| `version` | String | Nhãn phiên bản, VD: "2026", "v4.0" |
| `effectiveDate` | LocalDate | Ngày hiệu lực |
| `legalBasis` | String | Căn cứ pháp lý (VD: "Luật 109/2025/QH15") |
| `configData` | JSONB | Toàn bộ payload JSON (giống cấu trúc file classpath) |
| `active` | boolean | Phiên bản đang được dùng trong tính lương |
| `updatedBy` | String | Username người tạo/kích hoạt |

**Index:** `(config_type, active)` và `(config_type, version)` để query nhanh.

#### 2.2 Backend API — `SystemConfigController`

**Base URL:** `/api/system-configs`  
**Authorization:** `@PreAuthorize("hasAuthority('SYSTEM_ADMIN')")`

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/system-configs?type=` | Danh sách tất cả phiên bản của 1 loại config |
| GET | `/api/system-configs/{id}` | Chi tiết 1 phiên bản |
| POST | `/api/system-configs` | Tạo phiên bản mới (inactive) |
| PATCH | `/api/system-configs/{id}/activate` | Kích hoạt phiên bản → tự động deactivate phiên bản cũ + reload in-memory cache |
| DELETE | `/api/system-configs/{id}` | Xóa phiên bản inactive (không cho xóa active) |

**Luồng kích hoạt:**
```
POST /api/system-configs          → Tạo version mới (active=false)
PATCH /api/system-configs/{id}/activate
  → Deactivate version cũ của cùng configType
  → Set active=true cho version mới
  → Gọi PayrollConfigService.reload()  ← Hot-reload in-memory cache
```

#### 2.3 Frontend — `SystemConfigContent.tsx`

**Route:** `/system/config`  
**File:** `components/config/SystemConfigContent.tsx`

Tính năng:
- Danh sách phiên bản theo từng loại config (4 accordion/section)
- Badge trạng thái: `ACTIVE` (xanh) / `INACTIVE` (xám)
- **Create new version modal** — Form: version, effectiveDate, legalBasis, configData (JSON editor textarea với validation parse JSON thời gian thực, hiển thị lỗi syntax)
- **Prefill from existing** — Copy từ phiên bản hiện tại, chỉnh sửa rồi tạo mới (không overwrite bản cũ)
- **Activate** — Nút kích hoạt phiên bản inactive
- **Delete** — Xóa phiên bản inactive (active version bị disable nút delete)

**Frontend service:** `services/SystemConfigService.ts` — 5 hàm: `getSystemConfigs`, `getSystemConfig`, `createSystemConfig`, `activateSystemConfig`, `deleteSystemConfig`.

---

### Module 3: Mock Data Infrastructure (MỚI)

**Thư mục:** `facez/src/main/resources/scripts/`

| File | Dòng | Mô tả |
|---|---|---|
| `generate_mock_data.py` | 283 | Tạo file `mock_data.xlsx` — 1 sheet/table, styled header, dữ liệu mẫu có cấu trúc |
| `insert_mock_data.py` | 737 | Insert trực tiếp vào PostgreSQL theo đúng thứ tự FK |

**Nội dung mock data được tạo:**
- 10 phòng ban + nhân viên (bao gồm đủ 5 role: SYSTEM_ADMIN, HR_ADMIN, MANAGER, LEADER, EMPLOYEE)
- Hợp đồng với đầy đủ fields lương (`baseSalary`, `insuranceBase`, `positionCode`, `salaryStep`, `dependentCount`)
- Attendance + CheckinLog cho **Q1/2026 (~60 ngày làm việc)** được tạo tự động theo lịch
- Leave/OT requests ở nhiều trạng thái khác nhau để test approval workflow

---

### Module 4: Cập nhật Routing & Navigation

#### Cấu trúc routing mới (Frontend)

```
app/
├── employees/          # Self-service (mọi role)
│   ├── dashboard/      # DashboardContent (role-aware)
│   ├── attendance/     # My Attendance
│   ├── leave/          # Leave Requests
│   ├── ot/             # OT Requests
│   ├── payroll/        # My Payslips
│   └── me/             # Hồ sơ cá nhân
├── managers/           # MANAGER, LEADER, HR_ADMIN, SYSTEM_ADMIN
│   ├── request/        # Pending Requests (Approve/Reject)
│   └── department/     # Department view
├── hr/                 # HR_ADMIN, SYSTEM_ADMIN
│   ├── employee/       # Employee Management
│   ├── contract/       # Contract Management
│   ├── department/     # Department Management
│   └── payroll/        # Payroll Management
└── system/             # SYSTEM_ADMIN only
    └── config/         # Payroll Config Management
```

#### Sidebar cập nhật — 4 section theo role

| Section | Hiển thị cho | Menu items |
|---|---|---|
| **Personal** | Tất cả | Dashboard, My Attendance, Leave Requests, OT Requests, My Payslips |
| **Manager** | MANAGER, LEADER, HR_ADMIN, SYSTEM_ADMIN | Pending Requests, Departments |
| **HR Admin** | HR_ADMIN, SYSTEM_ADMIN | Employees, Contracts, Payroll |
| **System** | SYSTEM_ADMIN | Accounts *(chưa implement)*, Payroll Config |

Sidebar hỗ trợ **collapse/expand** với trạng thái lưu vào `localStorage`.

#### `RequestContent.tsx` — Unified Approval View

**File:** `components/request/RequestContent.tsx`

- Tự động filter đúng pending status theo role của người đăng nhập:
  - `LEADER` → `TO_APPROVE`
  - `MANAGER` → `LEADER_APPROVED`
  - `HR_ADMIN` → `MANAGER_APPROVED`
- Hiển thị cả Leave và OT requests trong 1 trang
- Approve/Reject với toast notification và auto-refresh

---

## PHẦN 3: TRẠNG THÁI HIỆN TẠI

| Module | Backend | Frontend | Trạng thái | Ghi chú |
|---|:---:|:---:|:---:|---|
| Authentication & RBAC | 100% | 100% | Hoàn chỉnh | JWT + Redis blacklist |
| Employee Management | 100% | 100% | Hoàn chỉnh | |
| Department Management | 100% | 100% | Hoàn chỉnh | |
| Leave Management | 100% | 100% | Hoàn chỉnh | Multi-level approval |
| OT Management | 100% | 100% | Hoàn chỉnh | Multi-level approval |
| Contract Management | 100% | 100% | Hoàn chỉnh | |
| Attendance | 80% | 90% | Gần xong | Thiếu API thống kê tổng hợp |
| Payroll | 100% | 100% | Hoàn chỉnh | Batch async, status machine |
| **Dashboard Analytics** | N/A | **95%** | **Hoàn chỉnh** | **MỚI — 4 role dashboards, 10+ biểu đồ** |
| **System Config Management** | **100%** | **100%** | **Hoàn chỉnh** | **MỚI — Versioned config + hot-reload** |
| PDF/Excel Reports | 0% | 0% | Chưa bắt đầu | |
| Email Notifications | 0% | 0% | Chưa bắt đầu | |
| Account Management (SYSTEM_ADMIN) | 0% | 0% | Chưa bắt đầu | Unlock, reset password |

> **Ước tính tổng tiến độ: ~80% (tăng từ ~65% tuần trước)**

---

## PHẦN 4: CÁC VẤN ĐỀ KỸ THUẬT ĐÁNG CHÚ Ý

### 4.1 Hot-reload Payroll Config

Khi `SystemConfigController.activate()` được gọi, `SystemConfigService` gọi `PayrollConfigService.reload()` để cập nhật in-memory cache **ngay lập tức** mà không cần restart server. Điều này cho phép thay đổi bảng lương/thuế có hiệu lực cho lần tính lương tiếp theo mà không gây downtime.

### 4.2 Dashboard — Zero mock data cho HR/Employee/Manager

Các dashboard chính (HrDashboard, EmployeeDashboard, ManagerDashboard) đều dùng dữ liệu thật từ API. Một số biểu đồ phụ (`AttendanceRadarChart`, `ReportsChart`) vẫn dùng mock data — đây là placeholder cho các API thống kê sẽ bổ sung sau.

### 4.3 Manager Dashboard — Tự động tìm phòng ban

`ManagerDashboard` không nhận `departmentId` hardcoded. Thay vào đó, nó load danh sách phòng ban rồi tìm phòng mà `managerId === user.employeeId`. Cách này đảm bảo đúng scope dù Manager được reassign sang phòng khác.

---

## PHẦN 5: KẾ HOẠCH TUẦN TIẾP THEO

| Nhiệm vụ | Chi tiết | Ưu tiên |
|---|---|---|
| **PDF Payslip Export** | Tích hợp iText/OpenPDF, font Unicode tiếng Việt, endpoint `GET /api/payrolls/{id}/pdf` | Cao |
| **Excel Reports** | Apache POI — báo cáo chấm công tháng, tổng hợp lương theo phòng ban | Cao |
| **Email Notifications** | Spring Boot Mail + Thymeleaf — gửi payslip, thông báo leave approved/rejected, cảnh báo hợp đồng hết hạn | Trung bình |
| **Account Management UI** | SYSTEM_ADMIN: unlock account, reset password, view login history | Trung bình |
| **Attendance API thống kê** | `GET /api/attendances/summary` — on-time/late/absent count để thay thế mock data còn lại trên dashboard | Thấp |
