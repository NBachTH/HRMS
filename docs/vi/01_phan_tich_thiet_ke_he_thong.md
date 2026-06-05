# FaceZ HRMS — Phân Tích Thiết Kế Hệ Thống
### Tổng Quan Kiến Trúc và Luồng Nghiệp Vụ
**Phiên bản:** 1.0 | **Ngày:** 10-04-2026 | **Người phân tích:** Claude Code

---

## 1. Tóm Tắt

FaceZ là Hệ thống Quản lý Nhân sự (HRMS) được thiết kế cho các công ty công nghệ, đặc biệt phù hợp với luật lao động và cơ cấu lương thưởng của Việt Nam. Hệ thống tự động hóa toàn bộ vòng đời nhân viên từ khâu tiếp nhận, chấm công, quản lý nghỉ phép và tăng ca, quản lý hợp đồng, đến tính lương bao gồm các khoản khấu trừ thuế và bảo hiểm theo quy định.

Về mặt kỹ thuật, đây là ứng dụng web hai tầng: backend REST API Spring Boot 4.0.0-M3 (Java 21) với PostgreSQL 15 và Redis 7, và frontend single-page Next.js 15. Hệ thống hiện được cấu hình triển khai tại chỗ cho một công ty đơn lẻ.

---

## 2. Tổng Quan Mô Hình Miền

Hệ thống quản lý sáu miền nghiệp vụ chính. Mỗi miền sở hữu dữ liệu riêng, cung cấp các REST endpoint và tham gia vào các luồng công việc liên miền.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Các Miền FaceZ HRMS                         │
│                                                                 │
│   ┌──────────┐     ┌──────────────┐     ┌──────────────────┐   │
│   │  Xác thực│────▶│  Hồ sơ Nhân │────▶│    Quản lý       │   │
│   │ & Người  │     │     viên     │     │   Phòng ban      │   │
│   │  dùng    │     └──────┬───────┘     └──────────────────┘   │
│   └──────────┘            │                                     │
│                ┌──────────┼─────────────────┐                  │
│                ▼          ▼                 ▼                  │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐      │
│   │  Chấm công   │ │ Nghỉ phép /  │ │  Hợp đồng &      │      │
│   │  & Check-in  │ │    Tăng ca   │ │  Cấu hình lương  │      │
│   └──────┬───────┘ └──────┬───────┘ └────────┬─────────┘      │
│          │                │                  │                  │
│          └────────────────▼──────────────────┘                  │
│                    ┌──────────────┐                             │
│                    │   Tính lương │                             │
│                    └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Các Thực Thể Cốt Lõi và Mối Quan Hệ

```
UserAccount (1) ──── (1) EmployeeInfo (N) ──── (1) Department
                          │
                ┌─────────┼─────────────────┐
                │         │                 │
           Contract   Attendance        LeaveRequest
                │         │             OTRequest
                │         │                 │
                └─────────▼─────────────────┘
                         (N)
                       Payroll
                          │
                          └──── SystemConfig (quy tắc theo phiên bản)
```

**Các quyết định thiết kế quan trọng:**
- `UserAccount` và `EmployeeInfo` có quan hệ bắt buộc 1:1, được tạo nguyên tử. Nhân viên không thể tồn tại nếu không có thông tin đăng nhập và ngược lại.
- Tất cả thực thể đều thực hiện xóa mềm (`deleteFlag`, `deletedAt`). Không có dữ liệu nào bị xóa vật lý khỏi cơ sở dữ liệu.
- `EmployeeInfo.status` theo dõi trạng thái vận hành (`ACTIVE`, `INACTIVE`, `ON_LEAVE`, `TERMINATED`) độc lập với cờ xóa mềm, cho phép nhân viên đã nghỉ việc vẫn giữ lại lịch sử tính lương.
- `Contract` là quan hệ 1:1 cho mỗi nhân viên (chỉ lưu hợp đồng hiện tại; không có mô hình lịch sử nhiều hợp đồng).

---

## 3. Kiểm Soát Truy Cập Theo Vai Trò (RBAC)

Hệ thống thực thi phân cấp năm vai trò thông qua `@PreAuthorize` của Spring Security tại mỗi endpoint.

```
SYSTEM_ADMIN
    │  Toàn quyền truy cập + quản lý cấu hình hệ thống
    │
HR_ADMIN
    │  CRUD nhân viên, hợp đồng, xử lý lương, phê duyệt tất cả
    │
MANAGER
    │  Phê duyệt/từ chối nghỉ phép và tăng ca cấp Quản lý;
    │  xem chấm công và thông tin nhân viên trong nhóm
    │
LEADER
    │  Phê duyệt cấp 1 cho nghỉ phép và tăng ca;
    │  xem thành viên nhóm (trong cùng phòng ban)
    │
EMPLOYEE
       Xem chấm công, đơn nghỉ phép/tăng ca, bảng lương của bản thân
```

**Bảng phân quyền tóm tắt:**

| Tính năng                | EMPLOYEE | LEADER | MANAGER | HR_ADMIN | SYS_ADMIN |
|--------------------------|:--------:|:------:|:-------:|:--------:|:---------:|
| Xem hồ sơ bản thân       | ✓        | ✓      | ✓       | ✓        | ✓         |
| Tạo nghỉ phép/tăng ca    | ✓        | ✓      | ✓       | ✓        | ✓         |
| Phê duyệt cấp 1          |          | ✓      | ✓       | ✓        | ✓         |
| Phê duyệt cấp Quản lý   |          |        | ✓       | ✓        | ✓         |
| Phê duyệt cuối (HR)      |          |        |         | ✓        | ✓         |
| CRUD nhân viên            |          |        |         | ✓        | ✓         |
| Quản lý hợp đồng         |          |        | ✓       | ✓        | ✓         |
| Xử lý lương               |          |        |         | ✓        | ✓         |
| Cấu hình hệ thống        |          |        |         |          | ✓         |

---

## 4. Luồng Nghiệp Vụ: Xác Thực & Quản Lý Phiên

```
Client                        Backend                          Redis
  │                               │                              │
  │── POST /api/auth/login ──────▶│                              │
  │   {username, password}        │ Xác thực thông tin           │
  │                               │ Tạo accessToken (5 phút)     │
  │                               │ Tạo refreshToken (14 ngày)   │
  │                               │── Lưu JTI ─────────────────▶│
  │◀─ {accessToken} + cookie ─────│   (để theo dõi thu hồi)      │
  │   Set-Cookie: refreshToken    │                              │
  │   (HttpOnly, Secure, Lax)     │                              │
  │                               │                              │
  │── Gọi API ───────────────────▶│                              │
  │   Authorization: Bearer <AT>  │ Xác thực JWT (hết hạn 5 ph)  │
  │◀─ Phản hồi ───────────────────│                              │
  │                               │                              │
  │   [Token hết hạn]             │                              │
  │── Bất kỳ request (401) ──────▶│                              │
  │◀─ 401 Unauthorized ───────────│                              │
  │                               │                              │
  │── POST /api/auth/refresh ────▶│                              │
  │   (cookie tự động gửi)        │ Xác thực refresh token       │
  │                               │── Kiểm tra JTI chưa bị thu ─▶│
  │                               │◀─ JTI hợp lệ ────────────────│
  │                               │ Xoay vòng: xóa JTI cũ        │
  │                               │── Lưu JTI mới ─────────────▶│
  │◀─ {accessToken mới} ──────────│                              │
  │                               │                              │
  │── POST /api/auth/logout ─────▶│                              │
  │                               │── Thu hồi JTI ──────────────▶│
  │◀─ 200 OK ─────────────────────│                              │
```

`ApiCallUtil` ở frontend xử lý việc làm mới token một cách trong suốt: khi nhận bất kỳ phản hồi 401 nào, nó tự động gọi `/refresh` và thử lại request gốc trước khi trả lỗi về component đang gọi.

---

## 5. Luồng Nghiệp Vụ: Vòng Đời Nhân Viên

```
HR_ADMIN                    Hệ thống                       Nhân viên
   │                           │                              │
   │─ POST /api/employees ────▶│                              │
   │  (tên, vai trò, phòng ban, │ Kiểm tra tính duy nhất      │
   │   username, mật khẩu)     │ Tạo EmployeeInfo             │
   │                           │ Tạo UserAccount (1:1)        │
   │                           │ Mã hóa mật khẩu Bcrypt       │
   │◀─ EmployeeResponse ───────│                              │
   │                           │                              │
   │─ POST /api/contracts ────▶│                              │
   │  (bậc lương, mã vị trí,   │ Gắn hợp đồng với nhân viên  │
   │   bước lương,             │ Lưu: lương cơ sở,            │
   │   số người phụ thuộc...)  │   mức đóng BH, mã vị trí    │
   │◀─ ContractResponse ───────│                              │
   │                           │                ◀─ Nhân viên đăng nhập ─
   │                           │                ◀─ Xem hồ sơ bản thân ─
   │                           │                              │
   │─ PUT /api/employees/{id} ▶│ Cập nhật một phần trường     │
   │  (status, phòng ban, vai) │ Tính lại dữ liệu liên quan   │
   │◀─ EmployeeResponse ───────│                              │
   │                           │                              │
   │─ DELETE /api/employees ──▶│ Xóa mềm:                     │
   │  /{id}                    │   deleteFlag = true          │
   │                           │   status = TERMINATED        │
   │◀─ 200 OK ─────────────────│ (lịch sử dữ liệu vẫn giữ)   │
```

---

## 6. Luồng Nghiệp Vụ: Quản Lý Chấm Công

Hệ thống chấm công hỗ trợ hai nguồn dữ liệu: bản ghi check-in thô từ thiết bị sinh trắc học/thẻ (qua `CheckinLog`), và bản ghi tóm tắt chấm công đã xử lý (`Attendance`).

```
Thiết bị / Kiosk            CheckinLogService          AttendanceService
     │                            │                          │
     │─ POST /api/checkin-logs ──▶│                          │
     │  {employeeId, deviceId,    │ Xác thực thiết bị & NV   │
     │   logTime, logType: IN}    │ Lưu CheckinLog           │
     │◀─ CheckinLogResponse ──────│                          │
     │                            │                          │
     │─ POST /api/checkin-logs ──▶│                          │
     │  {logType: OUT}            │ Xác thực thiết bị & NV   │
     │                            │ Lưu CheckinLog           │
     │◀─ CheckinLogResponse ──────│                          │
     │                            │                          │
              HR_ADMIN ───────────┼──────────────────────────▶
              (hoặc batch)        │ buildAttendance(nv, ngày, logs)
                                  │                          │
                                  │ computeAndApply():       │
                                  │  giờTrễ = max(0, (checkIn − 08:30) / 60)
                                  │  giờLàmViệc = (checkOut − checkIn)
                                  │  giờTínLương = giờLV − giờTrễ
                                  │  ngàyTínLương = giờTínLương / 8
                                  │  vi_phạm = (trễ > 0) HOẶC (không checkout)
                                  │                          │
                                  │ Lưu bản ghi Attendance   │
                                  │◀─ AttendanceResponse ────│
```

**Quy tắc tính chấm công:**
- Giờ bắt đầu làm việc: **08:30** (hằng số cố định trong code)
- Ngày làm việc chuẩn: **8 giờ**
- `lateHour`: số phút sau 08:30 ÷ 60 (tính theo giờ)
- `paidHour`: `workingHour − lateHour` (tối thiểu 0, không âm)
- Cờ `violate`: true nếu đến trễ HOẶC không có bản ghi check-out
- Bản ghi chấm công có thể được HR_ADMIN chỉnh sửa thủ công qua `PUT /api/attendances/{id}` — tất cả trường tính toán được tính lại tự động

---

## 7. Luồng Nghiệp Vụ: Phê Duyệt Nghỉ Phép & Tăng Ca

Cả đơn Nghỉ phép và Tăng ca đều tuân theo quy trình phê duyệt nhiều cấp giống nhau.

```
NHÂN VIÊN        LEADER           MANAGER           HR_ADMIN
    │                │                │                  │
    │ Tạo đơn        │                │                  │
    │ (status: TO_APPROVE)            │                  │
    │────────────────▶                │                  │
    │                │ Xem xét        │                  │
    │                │ [DUYỆT]        │                  │
    │                │ TO_APPROVE     │                  │
    │                │ → LEADER_APPROVED                 │
    │                │────────────────▶                  │
    │                │                │ Xem xét          │
    │                │                │ [DUYỆT]          │
    │                │                │ LEADER_APPROVED  │
    │                │                │ → MANAGER_APPROVED
    │                │                │──────────────────▶
    │                │                │                  │ Xem xét
    │                │                │                  │ [DUYỆT]
    │                │                │                  │ → APPROVED
    │◀───────────────────────────────────────────────────│
    │ (thông báo: APPROVED)           │                  │
    │                                 │                  │
    │ Bất kỳ cấp nào có thể TỪ CHỐI → status = REJECTED ngay lập tức
    │
    │ Chỉ được xóa khi status ∈ {DRAFT, TO_APPROVE}
```

**Máy trạng thái:**
```
DRAFT ──▶ TO_APPROVE ──▶ LEADER_APPROVED ──▶ MANAGER_APPROVED ──▶ APPROVED
                │                │                  │
                └────────────────┴──────────────────▶ REJECTED
```

---

## 8. Luồng Nghiệp Vụ: Tính Lương

Bộ máy tính lương thực thi cơ cấu lương Việt Nam với các khoản khấu trừ theo quy định.

### 8.1 Tính Lương Cho Một Nhân Viên

```
HR_ADMIN                 PayrollService          PayrollCalculationEngine
    │                         │                          │
    │─ POST /api/payrolls ───▶│                          │
    │  /calculate             │ Kiểm tra: 1 bản ghi      │
    │  {employeeId, năm,      │ /nhân viên/kỳ            │
    │   tháng, đánh giá KPI,  │                          │
    │   cấp tiếng Nhật,       │ Tải: Hợp đồng            │
    │   phụ cấp ODC, thưởng}  │       Chấm công (tháng)  │
    │                         │       Tăng ca đã duyệt   │
    │                         │─────────────────────────▶│
    │                         │              Tính toán:  │
    │                         │              NCtt (ngày công thực tế)
    │                         │              Li (hệ số vị trí)
    │                         │              KPI1, KPI2, KPItb
    │                         │              Phụ cấp (HT1/HT2/HT3)
    │                         │              Lương gộp, Tiền OT
    │                         │              Tổng lương gộp
    │                         │              Khấu trừ BHXH/BHYT/BHTN
    │                         │              Thuế TNCN (lũy tiến)
    │                         │              Lương thực nhận
    │                         │◀─ Payroll (DRAFT) ───────│
    │                         │ Lưu trạng thái DRAFT     │
    │◀─ PayrollResponse ──────│                          │
    │                         │                          │
    │─ PATCH /{id}/approve ──▶│ DRAFT → APPROVED         │
    │◀─ PayrollResponse ──────│ (khóa không cho sửa)     │
    │                         │                          │
    │─ PATCH /{id}/mark-paid ▶│ APPROVED → PAID          │
    │◀─ PayrollResponse ──────│ (trạng thái cuối cùng)   │
```

### 8.2 Công Thức Tính Lương

```
Biến số:
  Lhq   = lương theo hợp đồng (từ Contract.baseSalary)
  Li    = hệ số vị trí (tra cứu: mã vị trí + bước lương từ SystemConfig)
  KPI1  = điểm chuyên cần/đúng giờ (A=1.04, B=1.00, C=0.98)
  KPI2  = điểm hiệu suất (A=1.04, B=1.02, C=1.00)
  KPItb = (KPI1 + KPI2) / 2
  NCtt  = số ngày công thực tế (ngày có paidDay > 0)
  Nt    = số ngày công chuẩn (mặc định 26)
  HT1   = phụ cấp tiếng Nhật (từ SystemConfig, theo cấp độ)
  HT2   = phụ cấp sinh hoạt (từ SystemConfig, tính theo tỷ lệ: × NCtt/Nt)
  HT3   = phụ cấp ODC (HR nhập tại thời điểm tính lương)

Tính lương gộp:
  Lương gộp cơ bản = [(Lhq × KPItb) + Li + (HT1 + HT2 + HT3)] × (NCtt / Nt)
  Tiền OT = Σ(số giờ OT đã duyệt × mức lương/giờ × hệ số)
            Ngày thường ×1.5 | Cuối tuần ×2.0 | Ban đêm (22:00-06:00) ×1.3
  Tổng lương gộp = Lương gộp cơ bản + Tiền OT + Thưởng

Các khoản khấu trừ bắt buộc (phần nhân viên đóng):
  Mức đóng BH = min(Contract.insuranceBase, trần 46.800.000 VNĐ)
  BHXH = Mức đóng BH × 8%
  BHYT = Mức đóng BH × 1,5%
  BHTN = Mức đóng BH × 1%

Thuế Thu Nhập Cá Nhân (TNCN):
  Giảm trừ bản thân   = từ cấu hình PIT (hàng năm, chia theo tháng)
  Giảm trừ người phụ thuộc = từ cấu hình PIT × số người phụ thuộc
  Thu nhập chịu thuế = Tổng lương gộp − BHXH − BHYT − BHTN
                                    − Giảm trừ bản thân − Giảm trừ NPT
  Thuế TNCN = áp dụng bảng lũy tiến từ cấu hình PIT

Lương thực nhận:
  Lương thực nhận = Tổng lương gộp − BHXH − BHYT − BHTN − Thuế TNCN
```

### 8.3 Tính Lương Hàng Loạt

```
HR_ADMIN                 PayrollBatchService           Cơ sở dữ liệu
    │                          │                          │
    │─ POST /api/payrolls ─────▶│                          │
    │  /batch-calculate         │ Tạo bản ghi công việc    │
    │  {năm, tháng, ngày chuẩn} │ Trả về jobId ngay lập tức│
    │◀─ 202 Accepted + jobId ───│ Tạo luồng @Async         │
    │                           │                          │
    │  [Chạy bất đồng bộ]       │─ SELECT nhân viên ──────▶│
    │                           │  (status=ACTIVE)         │
    │                           │─ SELECT hợp đồng ────────▶│
    │                           │  (JOIN FETCH, theo DS NV)│
    │                           │─ SELECT chấm công ───────▶│
    │                           │  (theo DS NV, tháng)     │
    │                           │─ SELECT yêu cầu OT ──────▶│
    │                           │  (đã duyệt, theo DS NV)  │
    │                           │                          │
    │                           │ Nhóm dữ liệu trong RAM   │
    │                           │ Tính lương từng NV       │
    │                           │ (không truy vấn DB)      │
    │                           │─ INSERT lương (batch) ───▶│
    │                           │  saveAll()               │
    │                           │                          │
    │─ GET /api/payrolls ───────▶│                          │
    │  /jobs/{jobId}            │ Trả về trạng thái công   │
    │◀─ {status, thành công,    │  việc + bộ đếm           │
    │    thất bại, bỏ qua}      │                          │
```

---

## 9. Luồng Nghiệp Vụ: Quản Lý Cấu Hình Hệ Thống

Quy tắc tính lương (bảng lương, phụ cấp, khung thuế TNCN, tỷ lệ bảo hiểm) được lưu dưới dạng bản ghi JSON có phiên bản trong `system_config`. Mỗi `configType` chỉ có một bản ghi được kích hoạt tại một thời điểm.

```
SYSTEM_ADMIN             SystemConfigService           PayrollConfigService
    │                          │                              │
    │─ POST /api/system-configs▶│                              │
    │  {configType: SALARY_GRADE│ Xác thực loại cấu hình       │
    │   version: "2026",        │ Nếu active=true:             │
    │   configData: {...},      │   Hủy kích hoạt bản ghi cũ  │
    │   legalBasis: "Nghị định"}│ Lưu cấu hình mới            │
    │◀─ SystemConfigResponse ───│                              │
    │                           │                              │
    │─ PATCH /{id}/activate ───▶│ Đặt active=true              │
    │                           │ Hủy kích hoạt cùng loại     │
    │                           │─────────────────────────────▶│
    │                           │ Tải lại bộ nhớ đệm          │
    │◀─ SystemConfigResponse ───│                              │
```

**Các loại cấu hình:**
- `SALARY_GRADE` — mã vị trí (NV1, TL1, BOD, DL, ...) với bảng lương 10 bậc
- `ALLOWANCE` — mức phụ cấp sinh hoạt theo cấp bậc nhân viên
- `PIT` — các bậc thuế TNCN, giảm trừ bản thân (11 triệu VNĐ/tháng), giảm trừ người phụ thuộc (4,4 triệu VNĐ/tháng)
- `INSURANCE` — tỷ lệ BHXH/BHYT/BHTN và mức trần (46,8 triệu VNĐ)

---

## 10. Kiến Trúc Dữ Liệu: Kiểm Toán & Lưu Trữ

Tất cả thực thể áp dụng mẫu xóa mềm nhất quán:

| Trường       | Kiểu dữ liệu    | Mục đích                                      |
|--------------|-----------------|-----------------------------------------------|
| `deleteFlag` | `boolean`       | Đánh dấu xóa logic                            |
| `deletedAt`  | `LocalDateTime` | Thời điểm xóa mềm                             |
| `createdAt`  | `LocalDateTime` | Thời điểm tạo bản ghi                         |
| `updatedAt`  | `LocalDateTime` | Thời điểm sửa đổi cuối (quản lý tự động)      |

Tất cả truy vấn mặc định lọc theo `deleteFlag = false`. Điều này bảo toàn lịch sử tính lương đầy đủ ngay cả khi nhân viên đã nghỉ việc.

**Hiện chưa dùng Flyway** — schema được quản lý bởi `ddl-auto: update` của Hibernate, phù hợp cho môi trường phát triển nhưng có rủi ro khi triển khai sản xuất.

---

## 11. Kiến Trúc Tích Hợp

```
┌─────────────────────────────────────────────────────────────┐
│                    Giao Diện Ngoài                           │
│                                                             │
│  Thiết bị Sinh Trắc Học / Thẻ Chấm Công                    │
│  ──────────────────────────────────────                     │
│  POST /api/checkin-logs        (thời gian thực, từng sự kiện)│
│  POST /api/checkin-logs/batch  (tải batch, cuối ngày)       │
│  GET  /api/checkin-logs        (công khai, lọc theo ngày)   │
│                                                             │
│  Frontend Next.js (localhost:3000)                          │
│  ─────────────────────────────                              │
│  Tất cả endpoint xác thực qua Authorization: Bearer        │
│  Làm mới token im lặng qua cookie HttpOnly refreshToken     │
│                                                             │
│  Hạ Tầng                                                    │
│  ────────                                                   │
│  PostgreSQL 15 (localhost:5432) — kho dữ liệu chính         │
│  Redis 7 (localhost:6379)      — kho thu hồi JWT            │
└─────────────────────────────────────────────────────────────┘
```

Các endpoint nhật ký check-in có thể **truy cập công khai** (không yêu cầu xác thực), được thiết kế cho tích hợp thiết bị để tránh phức tạp khi xác thực JWT cho từng thiết bị. Đây là lựa chọn thiết kế có chủ ý, nhưng nghĩa là truy cập thiết bị cần được kiểm soát ở cấp mạng.

---

*Kết thúc Tài liệu 1*
