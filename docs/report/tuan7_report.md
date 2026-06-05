# BÁO CÁO TIẾN ĐỘ TUẦN 6–7 — DỰ ÁN HRMS FACE-Z

> **Ngày báo cáo:** 23/04/2026
> **Giai đoạn:** Tuần 6–7 — Khảo sát lại nghiệp vụ & Tái triển khai toàn diện luồng nghiệp vụ
> **Stack:** Spring Boot 4.0.0-M3 (Java 21) + Next.js 15 (TypeScript, React 19) + PostgreSQL 15 + Redis 7

---

## PHẦN 1: TỔNG QUAN CÔNG VIỆC TUẦN 6–7

### Bối cảnh

Đánh giá kỹ thuật cuối tuần 5 cho thấy hệ thống, dù hoạt động về mặt kỹ thuật, có **sai lệch nghiêm trọng về quyền sở hữu quy trình nghiệp vụ**: vai trò `HR_ADMIN` đang đảm nhiệm trách nhiệm của ba bộ phận tổ chức khác nhau — Nhân Sự, Kế Toán/Tài Chính, và Ban Giám Đốc. Cùng một người dùng `HR_ADMIN` có thể ghi nhân viên làm 26 ngày, tính lương, rồi tự phê duyệt chi trả — đây là thất bại kiểm soát nội bộ điển hình. Một hệ thống số hóa đã loại bỏ các kiểm soát tài chính mà quy trình giấy tờ vốn bảo toàn qua chữ ký vật lý.

Hai tuần này thực hiện toàn bộ lộ trình **Phase 0 → Phase 8**: khảo sát lại từng domain nghiệp vụ, tái kiến trúc phân quyền, bổ sung dữ liệu pháp lý, và hoàn thiện toàn bộ các quy trình còn thiếu theo chuẩn nghiệp vụ thực tiễn.

---

## PHẦN 2: ĐÁNH GIÁ NGHIỆP VỤ VÀ CÁC THAY ĐỔI TRIỂN KHAI

---

### 2.1 Domain: Quản Lý Nhân Viên

**Chủ sở hữu đúng:** Nhân Sự (HR)

**Đánh giá:** Đúng chủ sở hữu nhưng thiếu nghiêm trọng các trường dữ liệu pháp lý bắt buộc. Không thể đăng ký BHXH (thiếu CCCD), không thể chuyển lương (thiếu số tài khoản), không thể nộp thuế TNCN (thiếu mã số thuế), không thể tính giảm trừ gia cảnh đúng chuẩn (chỉ lưu `dependentCount` là số nguyên, không có hồ sơ người phụ thuộc thực tế theo Mẫu 02/CK-TNCN).

**Thay đổi triển khai (Phase 2):**

**[BE] Enum `Gender` mới**
```java
public enum Gender { MALE, FEMALE, OTHER }
```

**[BE] 11 trường pháp lý bổ sung vào `EmployeeInfo`**

| Trường | Mục đích pháp lý |
|---|---|
| `nationalId` | CCCD/CMND — bắt buộc đăng ký BHXH |
| `nationalIdIssueDate` / `nationalIdIssuePlace` | Thông tin cấp CCCD |
| `taxCode` | Mã số thuế cá nhân — báo cáo TNCN |
| `socialInsuranceCode` | Mã sổ BHXH — báo cáo đóng bảo hiểm |
| `bankAccountNumber` / `bankName` / `bankBranch` | Chuyển lương |
| `dateOfBirth` / `gender` | Dữ liệu nhân sự cơ bản |
| `hometown` | Quê quán |

**[DB] V6 migration** — `ADD COLUMN IF NOT EXISTS` + partial unique index (`WHERE column IS NOT NULL`) cho `nationalId`, `taxCode`, `socialInsuranceCode`.

**[BE] Cập nhật DTO và Service** — `EmployeeCreateRequest`, `EmployeeUpdateRequest`, `EmployeeResponse` bổ sung 11 trường; `EmployeeService` kiểm tra trùng `nationalId`/`taxCode` (loại trừ bản ghi hiện tại khi update); `EmployeeInfoRepository` thêm `findByNationalId()`, `findByTaxCode()`.

**[BE] Entity `TaxDependent` mới** — thay thế `Contract.dependentCount` (số nguyên tĩnh) bằng bản ghi thực tế, bắt buộc theo Mẫu 02/CK-TNCN (Thông tư 80/2021/TT-BTC):

| Trường | Mô tả |
|---|---|
| `employeeInfo` | FK → employee_info |
| `fullName` / `nationalId` / `dateOfBirth` | Thông tin người phụ thuộc |
| `relationship` | Quan hệ (CON, VO_CHONG, CHA_ME, ...) |
| `registrationDate` | Ngày nộp Mẫu 02/CK-TNCN |
| `active` | Còn hiệu lực giảm trừ hay không |

**[DB] V7 migration** — Bảng `tax_dependent` với index `idx_tax_dependent_employee`.

**[BE] `TaxDependentController`** — Base URL: `/api/employees/{id}/dependents`

| Method | Endpoint | Quyền |
|---|---|---|
| GET | `/api/employees/{id}/dependents` | HR_ADMIN, FINANCE_ADMIN |
| POST | `/api/employees/{id}/dependents` | HR_ADMIN |
| PATCH | `/{id}/dependents/{depId}/deactivate` | HR_ADMIN |

---

### 2.2 Domain: Cơ Cấu Phòng Ban

**Chủ sở hữu đúng:** Nhân Sự / Ban Quản Lý

**Đánh giá:** Chấp nhận được ở quy mô hiện tại. Vấn đề lớn nhất đã được giải quyết trong Phase 1: endpoint `GET /api/departments` trước đây **công khai không cần xác thực**, lộ toàn bộ cơ cấu tổ chức công ty. Đã chuyển thành `authenticated()` trong SecurityConfig rewrite.

---

### 2.3 Domain: Quản Lý Chấm Công

**Chủ sở hữu đúng:** Nhân Sự (thu thập, chốt tháng) + Kế Toán (đầu vào tính lương)

**Đánh giá:** Vấn đề nghiêm trọng nhất: pipeline `CheckinLog → Attendance` **chưa được tự động hóa** dù CLAUDE.md mô tả đã triển khai — `CheckinLogService.processRealTime()` chỉ lưu `CheckinLog`, không gọi `AttendanceService`. Bảng lương nhận dữ liệu chấm công bằng 0 trừ khi HR xử lý thủ công. Ngoài ra không có bước "chốt tháng" — Finance có thể tính lương trên dữ liệu chưa hoàn thiện.

**Thay đổi triển khai (Phase 1.4 + Phase 3):**

**[BE] Entity `AttendancePeriodClose`** (Phase 1.4)

Guard bắt buộc: `PayrollService.calculate()` kiểm tra `AttendancePeriodCloseRepository.existsByYearAndMonth()` trước khi tính. Nếu HR chưa chốt → `400 Bad Request`.

**[BE] `POST /api/attendances/close-period`** (HR_ADMIN) — Bước chốt tháng chính thức. Khi chốt, hệ thống kiểm tra vắng mặt chưa giải thích (không có Attendance VÀ không có nghỉ phép đã duyệt) và từ chối chốt nếu còn vắng mặt chưa được xử lý.

**[DB] V5 migration** — Bảng `attendance_period_close` với UNIQUE(`year`, `month`).

**[BE] Spring Events tách biệt CheckinLog → Attendance** (Phase 3.1)

Inject trực tiếp `AttendanceService` vào `CheckinLogService` có rủi ro `BeanCurrentlyInCreationException`. Giải pháp: tách qua `ApplicationEventPublisher`:

```
CheckinLogService → publishEvent(CheckinProcessedEvent)
                    ↓
AttendanceService.onCheckinProcessed() [@TransactionalEventListener(AFTER_COMMIT)]
  → processCheckinForAttendance() [idempotent: bỏ qua nếu đã có check-in ngày đó]
```

`@TransactionalEventListener(phase = AFTER_COMMIT)` đảm bảo `CheckinLog` đã commit hoàn toàn trước khi ghi `Attendance`, tránh inconsistency do partial transaction.

**[BE] Cấu hình giờ làm việc linh hoạt** (Phase 3.2)

Xóa hardcode `WORK_START = 08:30` trong `AttendanceService`. Thêm `SystemConfig` type `WORK_SCHEDULE`:
```json
{ "workStartTime": "08:30", "workHoursPerDay": 8, "timezone": "Asia/Ho_Chi_Minh" }
```
**[DB] V8 migration** — seed `WORK_SCHEDULE` config mặc định.

**[BE] Entity `PublicHoliday`** (Phase 3.3)

Quản lý lịch ngày lễ Việt Nam. Ngày lễ được loại trừ khỏi số ngày làm việc có lương; ngày làm vào ngày lễ nhận hệ số OT ×3,0.

**[BE] `GET/POST/DELETE /api/public-holidays`** (HR_ADMIN, FINANCE_ADMIN)

**[DB] V9 migration** — Bảng `public_holiday` + seed ngày lễ Việt Nam 2026.

---

### 2.4 Domain: Quản Lý Nghỉ Phép

**Chủ sở hữu đúng:** Nhân Sự (chính sách, hồ sơ) + Ban Quản Lý (phê duyệt)

**Đánh giá:** Phân cấp phê duyệt 3 cấp (LEADER → MANAGER → HR_ADMIN) đúng cấu trúc. Hai thiếu sót lớn: (1) không phân loại loại nghỉ phép — Bộ Luật Lao Động 2019 quy định 9 loại riêng biệt với quyền lợi khác nhau; (2) không theo dõi số dư phép.

**Thay đổi triển khai (Phase 4):**

**[BE] Enum `LeaveType` mới**

```java
public enum LeaveType {
    ANNUAL,       // Nghỉ phép năm — có lương, trừ số dư
    SICK,         // Nghỉ ốm — BHXH chi trả
    MATERNITY,    // Nghỉ thai sản (nữ)
    PATERNITY,    // Nghỉ thai sản (nam)
    BEREAVEMENT,  // Nghỉ tang — 3 ngày có lương
    MARRIAGE,     // Nghỉ cưới — 3 ngày có lương
    UNPAID,       // Nghỉ không lương — dẫn đến khấu trừ lương
    PUBLIC_HOLIDAY, // Tự động — không cho nhân viên nộp thủ công
    COMPENSATORY  // Nghỉ bù — tự động khi làm ngày lễ
}
```

**[BE] Thêm `leaveType`, `durationHours`, `balanceDeducted` vào `LeaveRequest`**

**[DB] V10 migration** — Thêm cột `leave_type` (DEFAULT `ANNUAL`), `duration_hours`, `balance_deducted`.

**[BE] Bảo vệ loại nghỉ phép chỉ dành cho hệ thống** — `LeaveService.create()` từ chối nộp `PUBLIC_HOLIDAY`, `COMPENSATORY` thủ công → HTTP 400.

**[BE] Entity `LeaveBalance`** — Theo dõi số dư theo nhân viên, năm, và loại phép:

| Trường | Mô tả |
|---|---|
| `entitlementDays` | Số ngày được hưởng hàng năm |
| `carriedOverDays` | Số ngày chuyển từ năm trước |
| `pendingDays` | Đã nộp, chưa duyệt (dự trữ — ngăn đặt trùng) |
| `usedDays` | Đã dùng (đã được phê duyệt hoàn toàn) |
| `remainingDays` | = entitlement + carryOver - pending - used |

**Cơ chế trừ hai giai đoạn** (ngăn race condition):
1. **Khi nộp đơn:** `remainingDays -= n`, `pendingDays += n` — ngăn hai đơn đồng thời vượt số dư
2. **Khi phê duyệt cuối:** `pendingDays -= n`, `usedDays += n`
3. **Khi từ chối/hủy:** hoàn lại `pendingDays -= n`, `remainingDays += n`

**[DB] V11 migration** — Bảng `leave_balance` với UNIQUE(`employee_id`, `leave_year`, `leave_type`).

**[BE] Endpoint mới**

| Endpoint | Quyền | Mô tả |
|---|---|---|
| `GET /api/leave-balances/my` | EMPLOYEE | Xem số dư của mình |
| `GET /api/leave-balances/{employeeId}` | HR_ADMIN, FINANCE_ADMIN | Xem số dư nhân viên |
| `POST /api/leave-balances/initialise` | HR_ADMIN | Khởi tạo số dư hàng năm |

**[BE] Đối chiếu vắng mặt khi chốt tháng** — `POST /api/attendances/close-period` từ chối nếu còn vắng mặt chưa có giải thích (không Attendance + không nghỉ phép đã duyệt). `UNPAID` leave được truyền vào `PayrollCalculationEngine` để khấu trừ từ `NCtt`.

---

### 2.5 Domain: Quản Lý Tăng Ca

**Chủ sở hữu đúng:** Ban Quản Lý (phê duyệt) + HR (hồ sơ) + Kế Toán (tính lương)

**Đánh giá:** Luồng phê duyệt đúng cấu trúc. Thiếu sót: không giới hạn 40h/tháng và 200h/năm theo Điều 107 Bộ Luật Lao Động; phân loại ca đêm dựa trên boolean thay vì tính chồng lấp thực tế với khung 22:00–06:00 (OT từ 20:00–23:00 bị áp toàn bộ hệ số ca đêm thay vì chỉ 60 phút cuối).

**Thay đổi triển khai (Phase 6):**

**[BE] Giới hạn OT trong `OTRequestService.create()`** — dùng **phút** xuyên suốt để tránh cắt ngắn phần lẻ giờ:
- Tháng: 2400 phút (40 giờ)
- Năm: 12000 phút (200 giờ)
- Lỗi trả về nêu rõ số giờ đã dùng và số giờ yêu cầu

**[DB] V14a migration** — View `ot_monthly_summary` tổng hợp phút OT đã duyệt theo nhân viên/tháng, tránh full table scan.

**[BE] Phân loại ca đêm chính xác** — Thay boolean check bằng tính chồng lấp từng phút với khoảng 22:00–06:00:

```
OT 20:00–23:00 → dayMinutes = 120 phút (×baseRate), nightMinutes = 60 phút (×baseRate + 0,3)
OT 23:00–01:00 → dayMinutes = 0, nightMinutes = 120 phút (tất cả ca đêm)
```

Công thức: `pay = (hourlyRate / 60) × (dayMinutes × baseRate + nightMinutes × (baseRate + 0.3))`

---

### 2.6 Domain: Tính Lương

**Chủ sở hữu đúng: Kế Toán / Tài Chính** — sai lệch nghiêm trọng nhất.

**Đánh giá trước khi sửa:** `HR_ADMIN` vừa nhập chấm công, vừa tính lương, vừa phê duyệt chi trả. Không có vai trò `FINANCE_ADMIN` hay `DIRECTOR`. Không có bước bàn giao giữa HR và Kế Toán. Chi phí phía chủ sử dụng lao động (BHXH 17%, BHYT 3%, BHTN 1%, TNLĐ-BNN 0,5%) không được tính ở đâu. Thuế TNCN tính theo công thức tuyến tính thay vì biểu lũy tiến 7 bậc theo Thông tư 111/2013/TT-BTC.

**Thay đổi triển khai (Phase 1 + Phase 7):**

**[BE] Vai trò mới** (Phase 1.1)
```java
public enum Role {
    EMPLOYEE, LEADER, MANAGER, HR_ADMIN,
    FINANCE_ADMIN,  // Kế Toán — sở hữu tính lương
    DIRECTOR,       // Giám đốc — phê duyệt chi trả cuối
    SYSTEM_ADMIN
}
```

**[BE] `PayrollStatus` chuẩn hóa** (Phase 1.3)
```
DRAFT → PENDING_APPROVAL → APPROVED → PAID
                         ↘ REJECTED (Director từ chối, Finance tính lại)
```

**[DB] V4 migration** — Thêm `rejection_reason VARCHAR(500)` vào bảng `payroll`.

**[BE] Phương thức mới trong `PayrollService`** (Phase 1.3)

| Method | Từ → Sang | Quyền |
|---|---|---|
| `submitForApproval(id)` | DRAFT → PENDING_APPROVAL | FINANCE_ADMIN |
| `approve(id)` | PENDING_APPROVAL → APPROVED | DIRECTOR |
| `reject(id, reason)` | PENDING_APPROVAL → REJECTED | DIRECTOR |
| `markPaid(id)` | APPROVED → PAID | FINANCE_ADMIN |

*Sửa lỗi: `approve()` cũ guard sai — so sánh với `DRAFT` thay vì `PENDING_APPROVAL`.*

**[BE] Endpoint mới trong `PayrollController`** (Phase 1.3)

```
PATCH /api/payrolls/{id}/submit     → FINANCE_ADMIN
PATCH /api/payrolls/{id}/approve    → DIRECTOR
PATCH /api/payrolls/{id}/reject     → DIRECTOR (body: { "reason": "..." })
```

**[BE] Chi phí phía chủ sử dụng lao động** (Phase 7.1) — Bổ sung vào `Payroll` entity:

| Trường | Tỷ lệ | Ghi chú |
|---|---|---|
| `bhxhEmployer` | 17% | Trên lương đóng BH đã chặn trần |
| `bhytEmployer` | 3% | |
| `bhtnEmployer` | 1% | |
| `workplaceAccidentInsurance` | 0.5% | |
| `totalEmployerContributions` | Tổng | |
| `totalEmploymentCost` | Gross + tổng chủ | Chi phí lao động thực tế |

**Trần đóng bảo hiểm** (Phase 7.1): `cappedInsuranceBase = min(grossSalary, 20 × lươngTốiThiểuPháp lý)`. Đọc `lươngTốiThiểu` từ `SystemConfig` để Finance cập nhật khi luật thay đổi mà không cần deploy lại.

**[DB] V14b migration** — Thêm các cột chi phí chủ.

**[BE] Thuế TNCN lũy tiến 7 bậc** (Phase 7.5) — Thay công thức tuyến tính cũ bằng biểu lũy tiến đọc từ `SystemConfig` type `PIT_BRACKETS`:

```
Bậc 1: 0–5tr → 5%    | Bậc 2: 5–10tr → 10%   | Bậc 3: 10–18tr → 15%
Bậc 4: 18–32tr → 20% | Bậc 5: 32–52tr → 25%   | Bậc 6: 52–80tr → 30%
Bậc 7: >80tr → 35%
Giảm trừ bản thân: 11.000.000đ | Giảm trừ mỗi người phụ thuộc: 4.400.000đ
```

**[DB] V15 migration** — Seed `PIT_BRACKETS` config vào `system_config`.

**[BE] Báo cáo Kế Toán** (Phase 7.2–7.4)

| Endpoint | Quyền | Mô tả |
|---|---|---|
| `GET /api/payrolls/reports/labour-cost` | FINANCE_ADMIN, DIRECTOR | Tổng hợp chi phí lao động theo tháng/phòng ban |
| `GET /api/payrolls/reports/insurance-remittance` | FINANCE_ADMIN | Báo cáo nộp BHXH/BHYT/BHTN |
| `GET /api/payrolls/reports/pit-summary` | FINANCE_ADMIN | Dữ liệu khai thuế TNCN tạm nộp hàng tháng |

**[BE] Phiếu lương cá nhân** (Phase 7.6)

`GET /api/payrolls/my/{year}/{month}/slip` — EMPLOYEE chỉ xem được của mình; trả về 403 nếu cố xem của người khác. Chỉ trả kết quả khi bảng lương ở trạng thái `APPROVED` hoặc `PAID`.

---

### 2.7 Domain: Quản Lý Hợp Đồng

**Chủ sở hữu đúng:** Nhân Sự (điều khoản lao động) + Kế Toán (điều khoản lương)

**Đánh giá:** Vấn đề chính là không có lịch sử hợp đồng — cập nhật ghi đè bản ghi cũ, phá hủy hồ sơ. `Contract.startDate`/`endDate` lưu dưới dạng `String` (không phải `LocalDate`) nên không thể tính cảnh báo hết hạn. Hợp đồng cũng không có metadata `effectiveFrom`/`effectiveTo` để `PayrollCalculationEngine` xác định hợp đồng có hiệu lực trong kỳ lương.

**Thay đổi triển khai (Phase 5):**

**[BE] Sửa kiểu dữ liệu ngày** (Phase 5.1) — `String startDate/endDate` → `LocalDate`

**[DB] V12 migration** — Phương pháp **cột song song an toàn**: thêm cột `DATE` mới, migrate dữ liệu hợp lệ, xóa cột `VARCHAR` cũ. Chạy query kiểm tra định dạng trước:
```sql
SELECT id, start_date FROM contract WHERE start_date !~ '^\d{4}-\d{2}-\d{2}$'
```

**[BE] Lịch sử hợp đồng** (Phase 5.2) — Thêm `effectiveFrom`, `effectiveTo`, `current` vào `Contract`. `ContractService.update()` thay vì ghi đè: đặt `effectiveTo = hôm nay`, `current = false` trên bản cũ; chèn bản ghi mới với `effectiveFrom = hôm nay`, `current = true`.

**[DB] V13 migration** — Xóa UNIQUE constraint trên `employee_id` (cho phép nhiều phiên bản hợp đồng cùng nhân viên).

**[BE] Cảnh báo hết hạn hợp đồng** (Phase 5.3)

`ContractExpiryScheduler` chạy mỗi ngày lúc 08:00 qua `@Scheduled(cron = "0 0 8 * * *")`. Ghi log cảnh báo hợp đồng hết hạn trong 30 ngày. Kết nối Phase 8.1: phát `ContractExpiringEvent` để gửi thông báo in-app cho HR_ADMIN.

`GET /api/contracts/expiring-soon?withinDays=30` (HR_ADMIN) — xem danh sách chủ động từ giao diện.

---

### 2.8 Domain: Phê Duyệt Lương

**Chủ sở hữu đúng: Giám đốc Tài chính / Giám đốc Công ty** — sai lệch nghiêm trọng thứ hai.

**Đánh giá trước khi sửa:** `HR_ADMIN` cùng một người tính lương và tự phê duyệt chi trả qua `PATCH /api/payrolls/{id}/approve`. Không có vai trò `DIRECTOR`.

**Thay đổi:** Đã triển khai trong Phase 1 (xem mục 2.6). Vai trò `DIRECTOR` được tạo, sở hữu endpoint `approve` và `reject`. `HR_ADMIN` không còn quyền truy cập vào bất kỳ endpoint payroll nào.

---

### 2.9 Domain: Cấu Hình Hệ Thống (Quy Tắc Thuế và Lương)

**Chủ sở hữu đúng:** Kế Toán / Tài Chính (nội dung nghiệp vụ) + IT (triển khai kỹ thuật)

**Đánh giá:** `SYSTEM_ADMIN` quản lý toàn bộ bảng lương, bậc thuế, tỷ lệ bảo hiểm — đây là kiến thức kế toán, không phải IT. Kế Toán phải đi qua IT để cập nhật quy định thuế mỗi khi Bộ Tài chính ban hành thông tư mới.

**Thay đổi:** `FINANCE_ADMIN` được cấp quyền quản lý `SystemConfig` song song với `SYSTEM_ADMIN`. `SYSTEM_ADMIN` giữ quyền backup cho hạ tầng. `HR_ADMIN` không còn truy cập cấu hình lương/thuế.

---

### 2.10 Phase 0 — Nền Tảng Hạ Tầng (áp dụng toàn hệ thống)

#### Flyway Migrations — thay thế `ddl-auto: update`

**Vấn đề phát hiện khi triển khai:**
1. `spring-boot-starter-batch` trong `pom.xml` kích hoạt Spring Batch auto-configuration, yêu cầu bảng `BATCH_JOB_INSTANCE` trước khi Flyway chạy → chặn toàn bộ khởi động. `PayrollBatchService` thực ra dùng `@Async`, không dùng Spring Batch Job/Step.
2. `V1__baseline_schema.sql` dùng `CREATE TABLE` (không `IF NOT EXISTS`) → thất bại trên database đã có bảng từ `ddl-auto: update`.

**Thay đổi:** Comment out `spring-boot-starter-batch`; thêm `flyway` config; `ddl-auto: none`.

**Toàn bộ migrations đã triển khai:**

| File | Nội dung |
|---|---|
| V1 | Schema ban đầu (13 bảng) |
| V2 | `created_by`, `updated_by` audit columns |
| V3 | Documentation roles enum |
| V4 | `rejection_reason` trên `payroll` |
| V5 | Bảng `attendance_period_close` |
| V6 | 11 trường pháp lý `employee_info` |
| V7 | Bảng `tax_dependent` |
| V8 | `WORK_SCHEDULE` system config seed |
| V9 | Bảng `public_holiday` + seed ngày lễ 2026 |
| V10 | `leave_type`, `duration_hours`, `balance_deducted` trên `leave_request` |
| V11 | Bảng `leave_balance` |
| V12 | Sửa kiểu ngày hợp đồng `VARCHAR → DATE` |
| V13 | Lịch sử hợp đồng (xóa unique FK, thêm `effective_from/to`, `current`) |
| V14a | View `ot_monthly_summary` |
| V14b | Các cột chi phí chủ sử dụng lao động |
| V15 | `PIT_BRACKETS` config seed (biểu thuế 7 bậc) |
| V16a | `profile_picture_url VARCHAR(500)` (Release A — object storage migration) |
| V17 | Bảng `api_key` cho xác thực thiết bị check-in |

#### Externalize Secrets và Cấu hình Môi trường

```yaml
spring:
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/postgres}
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:postgres}
app:
  jwt:
    secret: ${JWT_SECRET}  # Không có default — bắt buộc set tường minh
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:3000}
```

**Sửa lỗi `SecurityConfig.java`:** CORS đọc từ `@Value` thay vì hardcode; sửa lỗi syntax (dòng gọi method nằm ngoài method body).

**Profiles:** `application-dev.yml` (show-sql: true, JWT ngắn hạn), `application-staging.yml`, `application-prod.yml` (show-sql: false, CORS nghiêm ngặt).

#### `AuditableEntity` — Base class audit trail

`@EnableJpaAuditing` đặt trong `JpaAuditingConfig.java` riêng biệt — không đặt trên `@SpringBootApplication` để tránh xung đột với Spring Batch test slice.

#### Bucket4j-Redis Rate Limiting

`RedissonBasedProxyManager` — state chia sẻ qua Redis, hoạt động đúng khi scale horizontal. 10 request/15 phút mỗi IP cho `POST /api/auth/login` → HTTP 429 + `Retry-After` header.

#### SecurityConfig — Tái cấu hình toàn bộ phân quyền (Phase 1.2)

Nguyên tắc: **HR quản lý nhân sự — Tài chính quản lý tiền bạc**:
- Quản lý nhân viên, phòng ban, hợp đồng, chấm công → HR_ADMIN
- Tính lương, cấu hình hệ thống → FINANCE_ADMIN
- Phê duyệt bảng lương → DIRECTOR
- `GET /api/departments` → `authenticated()` (đã từng public không cần auth)

---

### 2.11 Phase 8 — Vận Hành và Tăng Cường Bảo Mật

#### Hệ thống Thông Báo (Phase 8.1)

**Module mới:** `domain/notification/` với bảng `notification` (nhân viên, message, isRead, createdAt).

Các sự kiện phát thông báo:
- `LeaveRequestSubmittedEvent` → thông báo LEADER của nhân viên
- `LeaveRequestApprovedEvent/RejectedEvent` → thông báo nhân viên đã nộp
- `PayrollSubmittedForApprovalEvent` → thông báo tất cả DIRECTOR
- `PayrollApprovedEvent/RejectedEvent` → thông báo FINANCE_ADMIN đã trình
- `ContractExpiringEvent` → thông báo HR_ADMIN (kết nối với scheduler Phase 5.3)

**[BE]** `GET /api/notifications/my` — Frontend polling số lượng chưa đọc.

**[FE]** Biểu tượng chuông trong Header hiển thị badge số lượng + dropdown danh sách thông báo.

#### Object Storage — Ảnh đại diện (Phase 8.3)

Ba release an toàn để tránh mất ảnh:
1. **Release A (V16a):** Thêm cột `profile_picture_url`; giữ BLOB cũ
2. **Release B:** Job migration nền tải BLOB lên MinIO/S3 → lấy URL → lưu `profilePictureUrl` → null blob
3. **Release C (V16b):** Xóa cột `profile_picture` BLOB — chỉ sau khi xác minh 100% migration URL thành công

**[BE]** `POST /api/employees/{id}/profile-picture` — multipart upload → object storage.

#### Xác thực Thiết bị Check-in (Phase 8.4)

Entity `ApiKey` với `keyHash` (bcrypt), `deviceId`, `active`, `lastUsedAt`. Filter `DeviceApiKeyFilter` kiểm tra header `X-API-Key` trên `/api/checkin-logs/**`. API key chỉ hiển thị một lần khi tạo, không lưu plaintext.

**[DB] V17 migration** — Bảng `api_key`.

**[BE]** `POST /api/devices/{id}/api-key` (SYSTEM_ADMIN).

#### Ghi Log Có Cấu Trúc và Actuator (Phase 8.2 + 8.5)

Spring Boot Actuator: `health` và `info` public; `metrics` chỉ SYSTEM_ADMIN. Profile `prod`: log JSON format qua `LogstashEncoder`. Filter ghi log mỗi request: method, path, status, thời gian xử lý, username.

---

## PHẦN 3: TRẠNG THÁI HIỆN TẠI

| Module | Backend | Frontend | Trạng thái |
|---|:---:|:---:|:---|
| Authentication & RBAC | 100% | 100% | Hoàn chỉnh — JWT + Redis blacklist + rate limiting |
| **Employee Management** | **100%** | **90%** | **Hoàn chỉnh** — 11 trường pháp lý + TaxDependent |
| Department Management | 100% | 100% | Hoàn chỉnh |
| **Attendance + Period Close** | **100%** | **90%** | **Hoàn chỉnh** — auto-pipeline + close-period |
| **Leave Management** | **100%** | **90%** | **Hoàn chỉnh** — LeaveType + LeaveBalance (two-phase deduction) |
| OT Management | 100% | 100% | Hoàn chỉnh — giới hạn pháp lý + ca đêm chính xác |
| **Contract Management** | **100%** | **90%** | **Hoàn chỉnh** — lịch sử hợp đồng + cảnh báo hết hạn |
| **Payroll — Role Architecture** | **100%** | **95%** | **Hoàn chỉnh** — FINANCE_ADMIN/DIRECTOR + full status machine |
| **Payroll — Accounting Functions** | **100%** | **85%** | **Hoàn chỉnh** — chi phí chủ + PIT lũy tiến + 3 báo cáo kế toán |
| **Payslip (Employee)** | **100%** | **90%** | **Hoàn chỉnh** — phiếu lương cá nhân + in |
| **System Config** | **100%** | **100%** | **Hoàn chỉnh** — FINANCE_ADMIN sở hữu thay SYSTEM_ADMIN |
| **Flyway Migrations (V1–V17)** | **100%** | N/A | **Hoàn chỉnh** — ddl-auto: none |
| **Notifications** | **100%** | **90%** | **Hoàn chỉnh** — Spring Events + in-app bell |
| Object Storage (Profile Pic) | 80% | 70% | Release B — migration job đang chạy; Release C chờ xác minh |
| Device API Key Auth | 100% | N/A | Hoàn chỉnh |
| Actuator + Structured Logging | 100% | N/A | Hoàn chỉnh |
| PDF/Excel Export | 0% | 0% | Chưa triển khai — ngoài phạm vi Phase 0–8 |

> **Ước tính tổng tiến độ: ~97%** — Toàn bộ luồng nghiệp vụ cốt lõi đã hoàn chỉnh.

---

## PHẦN 4: CÁC VẤN ĐỀ KỸ THUẬT CỐT LÕI

### 4.1 Spring Batch chặn Flyway khởi động

`spring-boot-starter-batch` kích hoạt Spring Batch auto-configuration, yêu cầu bảng `BATCH_JOB_INSTANCE` trước khi DataSource khởi tạo hoàn toàn — chặn Flyway. `PayrollBatchService` dùng `@Async`, không dùng Spring Batch framework. Giải pháp: comment out dependency.

### 4.2 Flyway thất bại trên database đã có dữ liệu

`V1__baseline_schema.sql` dùng `CREATE TABLE` không `IF NOT EXISTS`. Trên database có bảng sẵn, Flyway thất bại ngay bảng đầu tiên, rollback toàn bộ. Giải pháp tạm: `baseline-on-migrate: true`; lâu dài: dùng `IF NOT EXISTS` từ V2 trở đi.

### 4.3 `@EnableJpaAuditing` và Spring Batch test slice

Đặt trên `@SpringBootApplication` gây lỗi khi chạy `@BatchTest` slice — slice không load full context nhưng `AuditingEntityListener` yêu cầu `AuditorAware` bean. Giải pháp: tách ra `JpaAuditingConfig.java` riêng biệt.

### 4.4 Partial Unique Index cho trường nullable

PostgreSQL NULL semantics: `UNIQUE` cho phép nhiều NULL. Dùng partial unique index `WHERE column IS NOT NULL` để vừa đảm bảo unique cho giá trị thực, vừa cho phép nhiều nhân viên chưa nhập `nationalId`.

### 4.5 Spring Events ngăn circular dependency giữa CheckinLogService và AttendanceService

Inject `AttendanceService` vào `CheckinLogService` có rủi ro `BeanCurrentlyInCreationException`. `@TransactionalEventListener(phase = AFTER_COMMIT)` vừa tách coupling, vừa đảm bảo `CheckinLog` đã commit hoàn toàn trước khi xử lý `Attendance`.

### 4.6 Cơ chế trừ hai giai đoạn cho số dư nghỉ phép

Nếu chỉ trừ `usedDays` khi phê duyệt cuối, hai đơn nghỉ phép nộp đồng thời cùng nhân viên có thể cùng vượt số dư (race condition). Giải pháp: dự trữ vào `pendingDays` ngay khi nộp đơn, chuyển sang `usedDays` khi phê duyệt. Hoàn trả `pendingDays` khi từ chối/hủy.

### 4.7 Object Storage migration an toàn — ba release

Xóa BLOB ngay lập tức khi thêm URL là không an toàn. Nếu job migration tải ảnh lên storage thất bại giữa chừng, dữ liệu mất không khôi phục được. Ba release (thêm URL cột → migrate background → xóa BLOB) đảm bảo có thể rollback Release B mà không mất ảnh.

### 4.8 Separation of Duties trong luồng payroll sau khi tái cấu trúc

Sau Phase 1: `FINANCE_ADMIN` tính lương và submit, `DIRECTOR` phê duyệt, `FINANCE_ADMIN` mark paid — đúng với quy trình giấy tờ (Kế Toán tính → Giám Đốc ký → Kế Toán chuyển khoản). `HR_ADMIN` không còn quyền truy cập bất kỳ endpoint payroll nào.

---

## PHẦN 5: KẾ HOẠCH TIẾP THEO

| Nhiệm vụ | Chi tiết | Ưu tiên |
|---|---|---|
| **Object Storage Release C** | Sau khi xác minh 100% ảnh đã migrate URL thành công, chạy V16b để xóa cột BLOB | Cao |
| **PDF Payslip Export** | iText/OpenPDF, font Unicode tiếng Việt, endpoint `GET /api/payrolls/{id}/pdf` | Trung bình |
| **Excel Reports** | Apache POI — báo cáo chấm công tháng, tổng hợp lương theo phòng ban | Trung bình |
| **Frontend hoàn thiện** | Các trang còn 90%: Employee statutory data form, Finance payroll management, Director approval, Leave balance UI | Trung bình |
| **Account Management** | SYSTEM_ADMIN: unlock account, reset password, view login history | Thấp |
