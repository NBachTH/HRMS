# BÁO CÁO TỔNG QUAN & KẾ HOẠCH PHÁT TRIỂN
# DỰ ÁN FACE-Z HRMS

> **Đồ Án Tốt Nghiệp** · Hệ Thống Thông Tin  
> Hệ thống quản lý nhân sự cho doanh nghiệp công nghệ (outsourcing & phát triển phần mềm) quy mô 1.000+ nhân viên

---

## PHẦN 1: TỔNG QUAN HỆ THỐNG HIỆN TẠI

### 1. Kiến Trúc và Công Nghệ Sử Dụng

#### 1.1. Kiến Trúc Hệ Thống

Dự án được xây dựng theo kiến trúc **Monolithic Modular** — tổ chức code theo các module nghiệp vụ độc lập (Employee, Attendance, Payroll, Leave, Department, Auth) nhưng triển khai như một ứng dụng duy nhất. Kiến trúc này phù hợp với quy mô team nhỏ, dễ phát triển, kiểm thử và deploy, đồng thời thiết kế hướng tới khả năng migrate sang Microservices trong giai đoạn phát triển tiếp theo.

Hệ thống được tổ chức theo **4 tầng**:
- **Presentation Layer**: Next.js (giao diện người dùng)
- **API Layer**: Spring Boot REST Controllers (xử lý request/response)
- **Business Logic Layer**: Service classes theo từng module nghiệp vụ
- **Data Layer**: PostgreSQL (lưu trữ chính) + Redis (cache & session)

#### 1.2. Công Nghệ Back-end

| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Ngôn ngữ & Framework | Java, Spring Boot | Java 21 LTS / Spring Boot 3.3.x |
| Cơ sở dữ liệu chính | PostgreSQL | PostgreSQL 15 |
| Cache & Session | Redis | Redis 7.x |
| Bảo mật | Spring Security + JWT | Spring Security 6 / JJWT 0.12 |
| Password hashing | BCrypt | Strength 12 |
| Database migration | Flyway | Flyway 10.x |
| API Documentation | SpringDoc OpenAPI | SpringDoc 2.x (Swagger UI) |

#### 1.3. Công Nghệ Front-end

| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Framework | Next.js (App Router) | Next.js 15 |
| UI Library | React | React 19 |
| Ngôn ngữ | TypeScript | TypeScript 5.x |
| Styling | Tailwind CSS | Tailwind CSS 4 |
| Component Library | Shadcn/UI | Latest |
| Icons & Charts | Lucide Icons, Recharts | Latest |
| HTTP Client | Axios (+ interceptor auto refresh) | Axios 1.x |
| State Management | TanStack Query (server state) | TanStack Query 5.x |

---

### 2. Trạng Thái Tính Năng Hiện Tại

| Tính năng | Backend | Frontend | Ghi chú |
|---|---|---|---|
| Auth & RBAC | ✅ Hoàn thiện | ✅ Hoàn thiện | JWT + HttpOnly Cookie + Redis blacklist |
| Quản lý nhân viên | ✅ Hoàn thiện | ⚠️ Thiếu form CRUD | API đầy đủ, UI chỉ có list/view |
| Chấm công | ⚠️ Cơ bản | ⚠️ Chưa đủ | Chưa tích hợp máy vật lý |
| Nghỉ phép / OT | ⚠️ Cơ bản | ⚠️ Thiếu UI duyệt | Chưa có workflow đa cấp |
| Quản lý phòng ban | ✅ Hoàn thiện | ⚠️ Thiếu form | API xong, UI thiếu CRUD |
| Tính lương | ○ Chưa làm | ○ Chưa làm | — |
| Dashboard | ⚠️ Mock data | ⚠️ Mock data | Chưa kết nối API thực |
| Hợp đồng lao động | ○ Chưa làm | ○ Chưa làm | — |

---

### 3. Giải Pháp Kỹ Thuật Nổi Bật

- **Centralized API Service Layer**: Bộ Axios client tập trung phía Frontend, tích hợp interceptor tự động refresh token và retry request — người dùng không bị đăng xuất đột ngột khi access token hết hạn.
- **Unified Response Wrapper**: Mọi API trả về định dạng `ApiResponse<T>` thống nhất, giúp frontend xử lý response và error nhất quán.
- **Secure JWT Strategy**: Lưu cả Access Token (15 phút) và Refresh Token (7 ngày) trong HttpOnly Cookie — chống XSS. Logout ghi Refresh Token vào Redis blacklist — revoke token tức thì, không thể tái sử dụng.
- **Flyway Database Migration**: Version control cho schema database, đảm bảo môi trường dev/staging/production luôn đồng bộ.

---

### 4. Hạn Chế Hiện Tại

- Chưa phát triển đầy đủ giao diện form CRUD cho các module
- Dashboard sử dụng mock data, chưa kết nối API thực
- Chưa hoàn thiện module Tính Lương (BHXH, BHYT, thuế TNCN)
- Chưa có workflow Duyệt/Từ chối đa cấp
- Chưa có module Quản lý Hợp đồng lao động
- Chưa có chức năng Xuất báo cáo PDF/Excel và Gửi thông báo Email
- Chưa tích hợp máy chấm công vật lý
- Chưa có unit test / integration test — code coverage hiện tại ~0%
- Chưa xử lý các edge case chấm công: quên check-out, dữ liệu lỗi từ thiết bị, ca đêm

---

### 5. Mục Tiêu Đồ Án

#### Cốt lõi — Bắt buộc hoàn thành

- Hoàn thiện giao diện toàn bộ các module hiện có
- Hoàn thiện module Tính Lương với đầy đủ BHXH, BHYT, thuế TNCN lũy tiến
- Thiết kế API nhận dữ liệu từ máy chấm công vật lý kèm Device Simulator để kiểm thử
- Bổ sung workflow Duyệt/Từ chối đa cấp
- Bổ sung module Quản lý Hợp đồng lao động
- Xuất báo cáo PDF (Payslip) và Excel (bảng lương, chấm công)
- Xây dựng Dashboard analytics với dữ liệu thực
- Deploy demo trên Render / Railway

#### Mở rộng — Nếu còn thời gian

- Gửi thông báo Email tự động (payslip, nhắc hạn hợp đồng, duyệt phép)
- Unit test coverage > 70% cho Service layer
- Scheduled Jobs: nhắc nộp timesheet, cảnh báo hợp đồng sắp hết hạn

---

### 6. Hướng Phát Triển Thêm

- **Chuyển đổi sang kiến trúc Microservices**: Tách hệ thống thành các service độc lập theo domain nghiệp vụ (Employee Service, Attendance Service, Payroll Service), tích hợp API Gateway và Service Discovery sử dụng Spring Cloud Gateway và Eureka Server.

- **Bổ sung xác thực OAuth2 / Social Login**: Tích hợp đăng nhập qua Google Workspace sử dụng Spring Security OAuth2 Client — phù hợp với môi trường công ty công nghệ thường dùng Google account. Sau khi xác thực OAuth2 thành công, hệ thống issue JWT nội bộ và xử lý RBAC bình thường như hiện tại.

---

## PHẦN 2: KIẾN TRÚC & THIẾT KẾ HỆ THỐNG

### 1. Sơ Đồ Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────┐
│              PRESENTATION LAYER                  │
│   Next.js 15 Web App  │  Mobile Browser          │
│   (TypeScript + Tailwind + TanStack Query)        │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS / REST API (JSON)
┌──────────────────▼──────────────────────────────┐
│               API LAYER — Spring Boot 3.3        │
│  Spring Security 6  │  REST Controllers          │
│  Bean Validation    │  Swagger UI (SpringDoc)     │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│          BUSINESS LOGIC LAYER — Modules          │
│  Auth  │  Employee  │  Attendance  │  Payroll    │
│  Leave │  Department│  Report      │  Notification│
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│                 DATA LAYER                       │
│  PostgreSQL 15  │  Redis 7  │  File Storage      │
│  (Primary DB)   │  (Cache)  │  SMTP (Email)      │
└─────────────────────────────────────────────────┘
```

### 2. Cấu Trúc Package Java

```
com.facez.hrms/
├── common/
│   ├── exception/        # GlobalExceptionHandler, custom exceptions
│   ├── response/         # ApiResponse<T> wrapper
│   └── util/             # DateUtils, PayrollUtils, StringUtils
├── config/
│   ├── SecurityConfig.java
│   ├── RedisConfig.java
│   ├── FlywayConfig.java
│   └── SwaggerConfig.java
├── module/
│   ├── auth/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── dto/
│   │   └── entity/
│   ├── employee/         # Cấu trúc tương tự auth
│   ├── attendance/
│   ├── payroll/
│   ├── leave/
│   ├── department/
│   └── report/
└── HrmsApplication.java
```

### 3. Security Architecture

**JWT Flow:**
1. Login → Server tạo Access Token (15 phút) + Refresh Token (7 ngày)
2. Cả hai lưu trong **HttpOnly Cookie** (chống XSS)
3. Mỗi request → Spring Security filter xác thực JWT → Extract roles
4. Access Token hết hạn → Axios interceptor tự động gọi `/auth/refresh`
5. Logout → Ghi Refresh Token vào **Redis blacklist** → Revoke tức thì

**RBAC Roles:**
| Role | Quyền chính |
|---|---|
| SYSTEM_ADMIN | Toàn quyền hệ thống, cấu hình |
| HR_ADMIN | Quản lý nhân viên, lương, báo cáo |
| MANAGER | Duyệt phép/OT của team, xem timesheet |
| EMPLOYEE | Xem hồ sơ bản thân, xin phép, xem lương |

### 4. Tích Hợp Máy Chấm Công Vật Lý

```
Máy chấm công (ZKTeco/RFID/Fingerprint)
         │
         │ HTTP POST /api/v1/devices/punch
         ▼
AttendanceController → AttendanceService
         │
         ├── Validate device (registered?)
         ├── Map employee_id từ biometric ID
         ├── Lưu attendance_logs (raw, append-only)
         └── Trigger ghép cặp CHECK_IN/CHECK_OUT
                   │
                   ├── Tính hours_worked
                   ├── Tính ot_hours
                   ├── Xử lý edge cases:
                   │   - Quên check-out → FORGOT_CHECKOUT
                   │   - Ca đêm (22h → 6h hôm sau)
                   │   - Duplicate punch (< 5 phút)
                   └── Lưu daily_attendance
```

**Device Simulator**: Script Java giả lập máy chấm công, tự động gửi HTTP POST theo các kịch bản test (đúng giờ, đi trễ, quên check-out, ca đêm, dữ liệu lỗi). Dùng để test và demo không cần phần cứng thật.

---

## PHẦN 3: PHÂN TÍCH CHỨC NĂNG CHI TIẾT

### Module 1 — Auth & Phân Quyền (RBAC)
**Đã hoàn thiện.** Login/Logout JWT + HttpOnly Cookie. 4 roles phân quyền. Đổi mật khẩu. Tự động khôi phục session sau refresh trang. Logout revoke token qua Redis blacklist.

### Module 2 — Quản Lý Nhân Viên
CRUD hồ sơ đầy đủ: thông tin cá nhân, liên hệ, phòng ban, chức danh, level kỹ thuật (Junior/Mid/Senior/Lead). Hợp đồng lao động với cảnh báo hết hạn tự động. Lịch sử công tác (thăng chức, chuyển bộ phận). Upload hồ sơ số. Soft delete (giữ audit trail).

### Module 3 — Chấm Công & Timesheet
API nhận dữ liệu từ máy chấm công vật lý (ZKTeco/RFID). Device Simulator để kiểm thử. Thuật toán ghép cặp CHECK_IN/CHECK_OUT, xử lý edge case. Timesheet theo dự án (đặc thù ngành phần mềm — 1 nhân viên có thể tham gia nhiều dự án với % allocation khác nhau). Tính OT tự động (x1.5 ngày thường / x2 cuối tuần / x3 ngày lễ).

### Module 4 — Tính Lương & Payslip
**Engine tính lương:**
```
Gross = Lương cơ bản + OT Pay + Phụ cấp (ăn, xăng, điện thoại) + Thưởng KPI
BHXH deduct  = Gross × 8%
BHYT deduct  = Gross × 1.5%
BHTN deduct  = Gross × 1%
Taxable income = Gross - BHXH - BHYT - BHTN - Giảm trừ gia cảnh (11 triệu)
PIT = Thuế TNCN lũy tiến 7 bậc (theo quy định pháp luật VN hiện hành)
Net Salary = Gross - BHXH - BHYT - BHTN - PIT
```
Xuất Payslip PDF (iText 7, font Unicode tiếng Việt). Gửi email tự động sau chốt lương.

### Module 5 — Quản Lý Nghỉ Phép & OT
Các loại phép: Phép năm (12 ngày), Phép ốm, Nghỉ lễ, Nghỉ không lương, Thai sản. Workflow xét duyệt 2 cấp: Nhân viên → Manager → HR Admin (phép > 5 ngày). Số dư phép tự động trừ/cộng. Calendar view. OT Request luồng tương tự.

### Module 6 — Quản Lý Phòng Ban & Dự Án
Cây tổ chức (Org Chart, self-reference). Gán nhân viên vào dự án với % allocation. Headcount tracking theo phòng ban.

### Module 7 — Báo Cáo & Dashboard
Dashboard HR: headcount trend, chi phí lương theo tháng, tỷ lệ nghỉ việc, hợp đồng sắp hết hạn. Xuất Excel (Apache POI): bảng lương tổng hợp, danh sách nhân viên, báo cáo chấm công. Xuất PDF (iText): payslip cá nhân.

### Module 8 — Thông Báo Email
Email template HTML (Thymeleaf): payslip tháng, duyệt/từ chối nghỉ phép, cảnh báo hợp đồng hết hạn (30/15/7 ngày), nhắc nộp timesheet cuối tuần. SMTP Gmail / Office 365.

---

## PHẦN 4: THIẾT KẾ CƠ SỞ DỮ LIỆU

### Nguyên Tắc Thiết Kế
- Chuẩn hóa 3NF
- UUID làm primary key (không lộ business logic)
- Soft delete (`deleted_at`) giữ audit trail
- Optimistic locking (`version` column) cho bảng lương
- Tất cả bảng có `created_at`, `updated_at`, `created_by`

### Các Bảng Chính

```sql
-- Nhân viên
CREATE TABLE employees (
  id            UUID PRIMARY KEY,
  employee_code VARCHAR(20) UNIQUE,
  full_name     VARCHAR(200) NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  department_id UUID REFERENCES departments(id),
  position      VARCHAR(100),
  level         VARCHAR(20),    -- JUNIOR/MID/SENIOR/LEAD
  hire_date     DATE NOT NULL,
  status        VARCHAR(20) DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,    -- Soft delete
  version       BIGINT DEFAULT 0 -- Optimistic lock
);

-- Hợp đồng lao động
CREATE TABLE contracts (
  id            UUID PRIMARY KEY,
  employee_id   UUID REFERENCES employees(id),
  type          VARCHAR(30),    -- PROBATION/FULLTIME/PARTTIME
  start_date    DATE NOT NULL,
  end_date      DATE,           -- NULL = không xác định
  base_salary   DECIMAL(15,2) NOT NULL,
  status        VARCHAR(20)     -- ACTIVE/EXPIRED
);

-- Raw log từ máy chấm công (append-only)
CREATE TABLE attendance_logs (
  id          UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  device_id   UUID REFERENCES attendance_devices(id),
  punch_time  TIMESTAMPTZ NOT NULL,
  punch_type  VARCHAR(20),  -- CHECK_IN/CHECK_OUT
  raw_data    JSONB         -- Dữ liệu thô từ thiết bị
);

-- Kết quả chấm công đã xử lý
CREATE TABLE daily_attendance (
  id             UUID PRIMARY KEY,
  employee_id    UUID,
  work_date      DATE,
  check_in_time  TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  hours_worked   DECIMAL(4,2),
  ot_hours       DECIMAL(4,2),
  status         VARCHAR(20),  -- PRESENT/ABSENT/LATE/FORGOT_CHECKOUT
  UNIQUE (employee_id, work_date)
);

-- Bảng lương tháng
CREATE TABLE payroll_records (
  id           UUID PRIMARY KEY,
  employee_id  UUID REFERENCES employees(id),
  period       VARCHAR(7) NOT NULL,  -- '2024-09'
  base_salary  DECIMAL(15,2),
  allowances   DECIMAL(15,2),
  ot_pay       DECIMAL(15,2),
  bonus        DECIMAL(15,2),
  bhxh_deduct  DECIMAL(15,2),
  bhyt_deduct  DECIMAL(15,2),
  bhtn_deduct  DECIMAL(15,2),
  pit_deduct   DECIMAL(15,2),
  net_salary   DECIMAL(15,2),
  status       VARCHAR(20),   -- DRAFT/CONFIRMED/PAID
  UNIQUE (employee_id, period)
);

-- Đơn nghỉ phép
CREATE TABLE leave_requests (
  id           UUID PRIMARY KEY,
  employee_id  UUID REFERENCES employees(id),
  leave_type   VARCHAR(30),   -- ANNUAL/SICK/UNPAID/MATERNITY
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  reason       TEXT,
  status       VARCHAR(20),   -- PENDING/APPROVED/REJECTED
  approved_by  UUID REFERENCES employees(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## PHẦN 5: API DESIGN

### Response Format Chuẩn

```json
// Success — HTTP 200
{
  "success": true,
  "message": "OK",
  "data": { },
  "timestamp": "2024-09-15T10:30:00Z"
}

// Error — HTTP 400/401/403/404
{
  "success": false,
  "message": "Leave balance insufficient",
  "data": {
    "code": "LEAVE_BALANCE_INSUFFICIENT",
    "requested": 5,
    "available": 3
  }
}
```

### Danh Sách Endpoint Chính

| Module | Method | Endpoint | Mô tả | Role |
|---|---|---|---|---|
| Auth | POST | `/api/v1/auth/login` | Đăng nhập | Public |
| Auth | POST | `/api/v1/auth/refresh` | Refresh token | All |
| Auth | POST | `/api/v1/auth/logout` | Logout, revoke token | All |
| Auth | PUT | `/api/v1/auth/change-password` | Đổi mật khẩu | All |
| Employee | GET | `/api/v1/employees` | Danh sách, phân trang, filter | HR, Manager |
| Employee | POST | `/api/v1/employees` | Tạo nhân viên | HR |
| Employee | PUT | `/api/v1/employees/{id}` | Cập nhật hồ sơ | HR |
| Employee | GET | `/api/v1/employees/me` | Thông tin bản thân | All |
| Attendance | POST | `/api/v1/devices/punch` | Nhận dữ liệu máy chấm công | Device |
| Attendance | GET | `/api/v1/attendance/my` | Bảng công cá nhân | Employee |
| Attendance | GET | `/api/v1/attendance/team` | Bảng công team | Manager |
| Leave | POST | `/api/v1/leaves` | Tạo đơn xin nghỉ | Employee |
| Leave | PUT | `/api/v1/leaves/{id}/approve` | Duyệt đơn | Manager, HR |
| Leave | GET | `/api/v1/leaves/balance/me` | Số ngày phép còn lại | Employee |
| Payroll | POST | `/api/v1/payroll/calculate` | Trigger tính lương tháng | HR |
| Payroll | GET | `/api/v1/payroll/my` | Payslip cá nhân | Employee |
| Payroll | GET | `/api/v1/payroll/{id}/pdf` | Download payslip PDF | Employee, HR |
| Report | GET | `/api/v1/reports/payroll/excel` | Bảng lương Excel | HR |
| Report | GET | `/api/v1/reports/attendance/excel` | Báo cáo chấm công | HR |
| Report | GET | `/api/v1/reports/headcount` | Báo cáo headcount | HR |

---

## PHẦN 6: KẾ HOẠCH HOÀN THIỆN — 8 TUẦN

### Tổng Quan Lộ Trình

| Tuần | Nhiệm Vụ Chính | Output Cụ Thể | Ưu Tiên |
|---|---|---|---|
| **W1** | UI/UX Forms + Multi-level Approval | CRUD modals hoàn chỉnh, workflow duyệt 2 cấp | 🔴 Must |
| **W2** | Dashboard Real + Contract Module | Dashboard 6 widget dữ liệu thực, quản lý hợp đồng | 🔴 Must |
| **W3** | Payroll Engine Backend | Tính lương đúng công thức BHXH + thuế TNCN | 🔴 Must |
| **W4** | PDF Payslip + Excel Reports | Payslip PDF tiếng Việt, 3 loại báo cáo Excel | 🔴 Must |
| **W5** | Device API + Simulator | API punch data + simulator test 5 kịch bản | 🔴 Must |
| **W6** | Email Notifications + Scheduled Jobs | 4 loại email tự động hoạt động | 🟡 Nice |
| **W7** | Microservices Research + Testing | Unit test >70%, tài liệu microservices | 🟡 Nice |
| **W8** | Deploy + Demo Video + Báo Cáo | Live demo URL, video 5 phút, báo cáo hoàn chỉnh | 🔴 Must |

---

### Chi Tiết Từng Tuần

#### Tuần 1 — Hoàn Thiện UI/UX & Nghiệp Vụ Hiện Có
- Xây dựng Create/Edit Modal/Form cho Employee, Leave, OT, Department
- Hoàn thiện workflow Duyệt/Từ chối đa cấp phía Backend
- Tích hợp Form Validation (Zod) và Toast notification
- Chuẩn hóa error handling toàn bộ frontend

#### Tuần 2 — Dashboard Thực & Profile Nhân Viên
- API thống kê thực: headcount, tỷ lệ đi muộn, đơn chờ duyệt, hợp đồng sắp hết hạn
- Chuyển Dashboard từ mock data → Real API
- Hoàn thiện trang Profile cá nhân tổng hợp
- Module Quản lý Hợp đồng lao động

#### Tuần 3 — Payroll Module (Logic Backend)
- Bảng cấu hình lương: phụ cấp cố định, mức thuế, bảo hiểm
- Engine tính lương hoàn chỉnh: `(Attendance + OT Approved) → Gross → Deductions → Net`
- Công thức thuế TNCN lũy tiến 7 bậc đúng quy định pháp luật VN
- API chốt bảng lương định kỳ tháng
- Unit test cho Payroll Engine

#### Tuần 4 — Payslip PDF & Xuất Báo Cáo Excel
- iText 7: Payslip PDF với font Unicode tiếng Việt, layout chuyên nghiệp
- Apache POI: Bảng lương tổng hợp Excel, Báo cáo chấm công, Danh sách nhân viên
- UI trang "My Payslip" cho nhân viên
- Email tự động gửi payslip sau chốt lương

#### Tuần 5 — Tích Hợp Máy Chấm Công Vật Lý
- API endpoint `POST /api/v1/devices/punch` nhận dữ liệu từ máy
- Thuật toán ghép cặp CHECK_IN/CHECK_OUT, xử lý edge cases
- **Device Simulator**: script giả lập test 5 kịch bản (đúng giờ, đi trễ, quên check-out, ca đêm, dữ liệu lỗi)
- Log lỗi và retry mechanism

#### Tuần 6 — Thông Báo Email & Scheduled Jobs
- Email tự động: duyệt/từ chối phép, payslip tháng, cảnh báo hợp đồng (30/15/7 ngày), nhắc timesheet
- Template HTML đẹp với Thymeleaf
- Spring `@Scheduled` Jobs
- Hoàn thiện edge cases còn sót

#### Tuần 7 — Nghiên Cứu Microservices & Testing
- Thử nghiệm tách 2 services (Employee + Attendance) với Spring Cloud Gateway + Eureka
- Unit test Service layer: JUnit 5 + Mockito, coverage > 70%
- Integration test với TestContainers (PostgreSQL thật)
- Security test cơ bản (SQL injection, XSS, CSRF)
- Viết tài liệu kỹ thuật về Microservices cho báo cáo

#### Tuần 8 — Deploy Demo & Hoàn Thiện Hồ Sơ
- Docker Compose: Backend + Frontend + PostgreSQL + Redis
- Deploy lên Render.com / Railway
- Seed dữ liệu demo thực tế (1.000 nhân viên giả)
- Quay video demo 5 phút theo kịch bản hoàn chỉnh
- Hoàn thiện báo cáo đồ án và slide thuyết trình

---

### Kịch Bản Demo Cuối Kỳ (5 phút)

1. **Phút 1**: Device Simulator gửi punch data → Dashboard cập nhật attendance real-time
2. **Phút 2**: Nhân viên xin nghỉ phép → Manager duyệt → Email thông báo tức thì
3. **Phút 3**: HR trigger tính lương tháng → Xem breakdown chi tiết BHXH/thuế TNCN
4. **Phút 4**: Download payslip PDF → Kiểm tra format tiếng Việt, layout đẹp
5. **Phút 5**: Swagger UI — demo 3 API endpoint live với JWT authentication

---

## PHỤ LỤC — TỔNG HỢP STACK CÔNG NGHỆ

| Tầng | Công nghệ | Phiên bản | Ghi chú |
|---|---|---|---|
| Backend | Java + Spring Boot | Java 21 / Spring Boot 3.3.x | LTS, stable |
| Security | Spring Security + JJWT | SS 6.x / JJWT 0.12 | JWT + HttpOnly Cookie |
| ORM | Spring Data JPA + Hibernate | Hibernate 6.x | Querydsl cho complex query |
| DB Migration | Flyway | 10.x | Version control schema |
| Database | PostgreSQL | 15 | ACID, UUID PK |
| Cache | Redis | 7.x | Token blacklist + cache |
| Frontend | Next.js + React | Next.js 15 / React 19 | App Router, SSR/SSG |
| Language | TypeScript | 5.x | Type-safe |
| Styling | Tailwind CSS + Shadcn/UI | Tailwind 4 | Utility-first |
| State | TanStack Query | 5.x | Server state management |
| PDF | iText 7 Community | 7.x | Unicode tiếng Việt |
| Excel | Apache POI | 5.x | .xlsx với formatting |
| Email | Spring Mail + Thymeleaf | Spring Boot starter | SMTP Gmail/O365 |
| API Docs | SpringDoc OpenAPI | 2.x | Swagger UI |
| Testing | JUnit 5 + Mockito + TestContainers | JUnit 5 / Mockito 5 | Coverage via JaCoCo |
| Container | Docker + Docker Compose | Docker 25 | 1 lệnh chạy full stack |
| Deploy | Render / Railway | — | Free tier đủ demo |

---

*FACE-Z HRMS · Đồ Án Tốt Nghiệp · Java Spring Boot 3 + Next.js 15 · Doanh nghiệp công nghệ 1.000+ nhân viên*
