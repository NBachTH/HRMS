# Tài liệu Business Rules — FaceZ HRMS

**Phiên bản:** 1.0 | **Ngày:** 16-06-2026
**Liên quan:** [Use Cases](02-use-cases.md) · [Database Design](../02-technical/06-database-design.md) · [Security](../02-technical/10-security-design.md)

Các quy tắc được viết để **test được**. Mỗi quy tắc có ID, phát biểu, và (nếu có) nguồn trong mã.
`BR-PR` = payroll, `BR-RBAC` = phân quyền, `BR-LV` = nghỉ phép, `BR-AT` = chấm công, `BR-CT` = hợp đồng,
`BR-KPI` = KPI, `BR-CFG` = cấu hình.

---

## 1. Quy tắc tính lương (`BR-PR`)
> Nguồn: `PayrollCalculationEngine.buildPayroll(...)`. Mọi số tiền theo VND; làm tròn `HALF_UP`.

### 1.1 Công thức lương cốt lõi
```
baseGross = round( [ (Lhq × KPItb) + Li + HTi ] × (NCtt / Nt) )
```
| Ký hiệu | Ý nghĩa | Nguồn |
|---------|---------|-------|
| `Lhq` | Lương cơ bản hợp đồng | `contract.baseSalary` |
| `Li` | Hệ số vị trí cho `(positionCode, salaryStep)` hiệu lực tại kỳ | `configService.getPositionCoefficient` |
| `KPItb` | Trung bình KPI1 và KPI2 | `(kpi1 + kpi2) / 2` |
| `HTi` | Phụ cấp = phụ cấp sinh hoạt prorate + phụ cấp tiếng Nhật + ODC | xem 1.4 |
| `NCtt` | Ngày công thực tế có lương (tổng `WorkDay.paidDay`) | `computeActualWorkingDays` |
| `Nt` | Ngày công chuẩn trong kỳ (đầu vào `nt`) | request param |

- **BR-PR-01** Nếu `Nt ≤ 0`, `baseGross = 0` (chống chia cho 0).
- **BR-PR-02** `NCtt` = tổng `paidDay` đã làm tròn của các `WorkDay` trong tháng (đi làm + phép có lương + ngày lễ).

### 1.2 Tổng gross & net
- **BR-PR-03** `totalGross = baseGross + otPay + bonus`.
- **BR-PR-04** `taxableIncome = max(0, totalGross − BHXH_ee − BHYT_ee − BHTN_ee − personalRelief − dependentRelief)`.
- **BR-PR-05** `netSalary = totalGross − BHXH_ee − BHYT_ee − BHTN_ee − PIT`.

### 1.3 Hệ số KPI
- **BR-PR-06 / BR-KPI-01** KPI1 từ rating thủ công: `A→1.04`, `B/none→1.00`, `C→0.98`.
- **BR-PR-07 / BR-KPI-02** KPI2 (chấm công, tham chiếu 01/2020/QC-VTI), tự suy diễn khi không nhập rating:
  - `1.04` — không vi phạm chấm công và không nghỉ phép trong tháng;
  - `1.02` — không vi phạm nhưng có ít nhất một lần nghỉ;
  - `1.00` — có ít nhất một vi phạm chấm công (đi muộn/về sớm, <8h, vắng không báo).
  - Rating tường minh override: `A→1.04, B→1.02, C/khác→1.00`.
- **BR-KPI-03** Với vị trí MANAGER/DIRECTOR, orchestrator có thể truyền KPI override trung bình đơn vị/công ty.

### 1.4 Phụ cấp (`HTi`)
- **BR-PR-08** Phụ cấp sinh hoạt **prorate**: `ht2Prorated = round(ht2Full × NCtt / Nt)`.
- **BR-PR-09** Phụ cấp tiếng Nhật (`ht1`) theo cấp JLPT từ config phụ cấp hiệu lực; mặc định không prorate.
- **BR-PR-10** `HTi = ht2Prorated + ht1 + odcAllowance`.
- **BR-PR-11** Position code ánh xạ tới level key phụ cấp: `BOD→DIRECTOR`, `BOD2→DEPUTY_DIRECTOR`, `DL→DEPT_HEAD`, `TL1/TL2→SENIOR_STAFF_NV1`, còn lại `NV2`.

### 1.5 Lương OT (`otPay`)
> Nguồn: `computeOtPay`, `calculateNightOverlapMinutes`. Chỉ OT **đã duyệt** mới tính.
- **BR-PR-12** Lương theo giờ = `Lhq / (Nt × 8)`.
- **BR-PR-13** Hệ số cơ sở theo ngày: **thường ×1.5**, **cuối tuần (T7/CN) ×2.0**, **ngày lễ ×3.0**.
- **BR-PR-14** Cửa sổ đêm **22:00–06:00** cộng **+0.3** lên hệ số cơ sở, áp dụng theo từng phút cho phần giao đêm.
- **BR-PR-15** `otPay = Σ round( (hourlyWage/60) × [ dayMinutes×baseRate + nightMinutes×(baseRate+0.3) ] )`.

### 1.6 Bảo hiểm (bắt buộc)
> Nguồn: nhánh bảo hiểm trong engine + `insurance_config` hiệu lực.
- **BR-PR-16** Nhân viên đủ điều kiện bảo hiểm chỉ khi `contractType ∈ insurance_eligible_contract_type` của config hiệu lực.
- **BR-PR-17** Cơ sở bảo hiểm `Lcb = contract.insuranceBase ?? Lhq`, **trần `20 × statutoryMinWage`** (config hiệu lực).
- **BR-PR-18** Khấu trừ nhân viên: `BHXH_ee = round(base × eeBhxh)`, `BHYT_ee = round(base × eeBhyt)`, `BHTN_ee = round(base × eeBhtn)`.
- **BR-PR-19** Đóng góp người sử dụng lao động: hưu trí, ốm đau/thai sản (phần BHXH employer), tai nạn, BHYT, BHTN — mỗi phần `round(base × employerRate)`.
- **BR-PR-20** `totalEmployerContributions = Σ phần employer`; `totalEmploymentCost = totalGross + totalEmployerContributions`.
- **BR-PR-21** Nếu không đủ điều kiện, mọi khoản bảo hiểm = `0`.

### 1.7 Thuế TNCN (PIT)
- **BR-PR-22** `personalRelief` và `dependentRelief` từ `pit_config` hiệu lực; tổng `dependentRelief` = `dependentRelief × dependentCount`.
- **BR-PR-23** PIT tính theo bậc lũy tiến (`pit_bracket`: `income_from`, `income_to`, `rate`, `quick_deduction`) của config hiệu lực; `configService.calculatePit(taxableIncome, period)`.

### 1.8 Trạng thái & tính duy nhất
- **BR-PR-24** Payroll vừa tính bắt đầu ở `DRAFT`.
- **BR-PR-25** Vòng đời: `DRAFT → PENDING_APPROVAL → APPROVED → PAID`; từ chối từ `PENDING_APPROVAL → REJECTED`.
- **BR-PR-26** Đúng một payroll/`(employeeId, payrollYear, payrollMonth)` (ràng buộc DB `uk_payroll_employee_period`). Tính lại ghi đè `DRAFT` đang có.
- **BR-PR-27** Xóa chỉ ở `DRAFT`.

## 2. Quy tắc phân quyền — Ma trận RBAC (`BR-RBAC`)
> Nguồn: `SecurityConfig` (rule URL) + `@PreAuthorize` cấp method. Vai trò **không** phân cấp tuyến tính.

| Năng lực | EMPLOYEE | LEADER | MANAGER | HR_ADMIN | FINANCE_ADMIN | DIRECTOR | SYSTEM_ADMIN | DEVICE |
|----------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Self-service (chấm công/leave/OT/phiếu lương của mình) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| Tạo/sửa/xóa nhân viên | — | — | — | ✔ | — | — | — | — |
| Tạo/sửa/xóa phòng ban | — | — | — | ✔ | — | — | — | — |
| Đọc phòng ban | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| Quản lý hợp đồng | — | — | — | ✔ | ✔ | — | — | — |
| Leave/OT — duyệt cấp 1 | — | ✔ | — | — | — | — | — | — |
| Leave/OT — duyệt cấp 2 | — | — | ✔ | — | — | — | — | — |
| Leave/OT — duyệt cuối | — | — | — | ✔ | — | — | — | — |
| Chốt kỳ chấm công | — | — | — | ✔ | — | — | — | — |
| Tính / batch lương | — | — | — | — | ✔ | — | — | — |
| Gửi lương duyệt | — | — | — | — | ✔ | — | — | — |
| Duyệt / từ chối lương | — | — | — | — | — | ✔ | — | — |
| Đánh dấu lương đã trả | — | — | — | — | ✔ | — | — | — |
| Đọc toàn bộ payroll / kỳ | — | — | — | — | ✔ | ✔ | — | — |
| Báo cáo tài chính | — | — | — | — | ✔ | ✔ | — | — |
| Quản lý config pháp lý (tạo DRAFT) | — | — | — | — | ✔ | — | (✔)* | — |
| Publish config pháp lý | — | — | — | — | — | ✔ | (✔)* | — |
| Quản lý thiết bị / API key | — | — | — | ✔ | — | — | — | — |
| Đẩy log chấm công | — | — | — | ✔ | — | — | ✔ | ✔ |
| Actuator nâng cao (env/loggers/flyway/metrics) | — | — | — | — | — | — | ✔ | — |

\* `SYSTEM_ADMIN` quản trị cấu hình và có thể override hầu hết thao tác (xem ghi chú vai trò trong CLAUDE.md); `/api/system-configs/**` hiện yêu cầu `FINANCE_ADMIN`.

- **BR-RBAC-01** Endpoint không được phép tường minh → **chỉ cần xác thực** (`anyRequest().authenticated()`).
- **BR-RBAC-02** Endpoint công khai: `/api/auth/login`, `/api/auth/refresh`, `/swagger-ui/**`, `/v3/api-docs/**`, `/actuator/health`.
- **BR-RBAC-03** Endpoint self-service `/my` chỉ trả bản ghi của chính người gọi (enforce ở tầng service, không bằng role URL).
- **BR-RBAC-04** **Tách bạch trách nhiệm payroll**: vai trò tính (`FINANCE_ADMIN`) không được duyệt; chỉ `DIRECTOR` duyệt.
- **BR-RBAC-05** Thứ tự filter: `DeviceApiKeyFilter` → `JwtAuthFilter`. Device key hợp lệ chỉ cấp `DEVICE_CHECKIN` (chỉ endpoint chấm công).

## 3. Quy tắc nghỉ phép (`BR-LV`)
- **BR-LV-01** Loại phép: `ANNUAL, SICK, MATERNITY, PATERNITY, BEREAVEMENT, MARRIAGE, UNPAID, PUBLIC_HOLIDAY, COMPENSATORY`.
- **BR-LV-02** Máy trạng thái duyệt: `DRAFT → TO_APPROVE → LEADER_APPROVED → MANAGER_APPROVED → APPROVED`; `REJECTED` từ bất kỳ trạng thái chờ.
- **BR-LV-03** Ánh xạ cấp: `LEADER` xử lý `TO_APPROVE`; `MANAGER` xử lý `LEADER_APPROVED`; `HR_ADMIN` xử lý `MANAGER_APPROVED`.
- **BR-LV-04** Xóa chỉ khi `DRAFT` hoặc `TO_APPROVE`.
- **BR-LV-05** Loại có số dư bị trừ `LeaveBalance` khi **duyệt cuối**; đơn vượt số dư còn lại bị từ chối khi submit.
- **BR-LV-06** Phép đã duyệt chuyển ngày tương ứng thành `WorkDay.type = LEAVE` và đóng góp `paidDay` cho loại có lương (ảnh hưởng `NCtt`).
- **BR-LV-07** Từ chối ghi lý do (qua endpoint reject) và không động đến số dư.

## 4. Quy tắc OT (`BR-OT`)
- **BR-OT-01** Cùng máy trạng thái đa cấp như §3 cho `OTRequest`.
- **BR-OT-02** Chỉ OT `APPROVED` đưa vào payroll (BR-PR-12..15).
- **BR-OT-03** OT phải tham chiếu khoảng ngày/giờ; hệ số phụ thuộc thường/cuối tuần/lễ + phần giao đêm.
- **BR-OT-04** OT có thể lập kế hoạch trước qua `OTPlan` (manager duyệt) để nhân viên claim.

## 5. Quy tắc chấm công (`BR-AT`)
> Nguồn: `AttendanceService`, `PeriodCloseService`, suy diễn `WorkDay`.
- **BR-AT-01** Ngày công bắt đầu **08:00**; **8 giờ = 1 ngày công có lương**.
- **BR-AT-02** `IN` tạo chấm công ngày (idempotent — một bản ghi/`(employee, date)`, ràng buộc unique).
- **BR-AT-03** `OUT` đóng bản ghi đang mở và tính `lateHour`, `workingHour`, `paidHour`, `workingDay`, `paidDay`, `violate`.
- **BR-AT-04** `violate = true` nếu đi muộn, về sớm, <8h, hoặc thiếu checkout.
- **BR-AT-05** Ngày lễ bị loại khỏi tính ngày công và không bao giờ tính là vắng.
- **BR-AT-06** Cron đêm `AttendanceSchedule` (00:00) backfill ngày hôm trước từ log thô.
- **BR-AT-07** `WorkDay` phân loại `PRESENT / LEAVE / HOLIDAY / ABSENT / HOLIDAY_WORK`, nguồn `CHECKIN / LEAVE_REQUEST / PUBLIC_HOLIDAY / MANUAL / SYSTEM / CONFLICT`; `MANUAL` (HR sửa) override tất cả.
- **BR-AT-08** Nguồn mâu thuẫn gắn cờ `CONFLICT`; HR phải giải quyết trước khi chốt.
- **BR-AT-09** Dry-run chốt kỳ liệt kê vắng không lý do; `forceClose=true` coi là nghỉ không lương và khóa tháng. Kỳ đã chốt bất biến với payroll.

## 6. Quy tắc hợp đồng (`BR-CT`)
- **BR-CT-01** Đúng **một hợp đồng hiện hành/nhân viên** (`current=true`); unique `employee_id` ở ràng buộc đơn-hợp-đồng cũ; lịch sử giữ qua `effectiveFrom`/`effectiveTo`.
- **BR-CT-02** Tạo version mới đóng `effectiveTo` của version trước và đặt nó không-hiện-hành.
- **BR-CT-03** Hợp đồng mang `baseSalary`, `positionCode`, `salaryStep`, `insuranceBase`, `dependentCount`, `contractType` — đều là đầu vào payroll.
- **BR-CT-04** `ContractExpiryScheduler` (hàng tháng) phát `ContractExpiringEvent` cho hợp đồng sắp tới `endDate`; `GET /api/contracts/expiring-soon` hiển thị.
- **BR-CT-05** `insuranceBase` mặc định bằng `baseSalary` khi null (BR-PR-17).

## 7. Quy tắc cấu hình (`BR-CFG`)
> Nguồn: bảng config hiệu lực theo ngày V27 + `PayrollConfigService`.
- **BR-CFG-01** Loại config: `SALARY_GRADE, ALLOWANCE, PIT, INSURANCE`.
- **BR-CFG-02** Mỗi version config có `effectiveFrom` và vòng đời `DRAFT → PUBLISHED → ARCHIVED`.
- **BR-CFG-03** Maker-checker: `FINANCE_ADMIN` tạo `DRAFT`; `DIRECTOR`/`SYSTEM_ADMIN` publish.
- **BR-CFG-04** Lương cho một kỳ chọn version **`PUBLISHED` mới nhất** của mỗi loại có `effectiveFrom ≤ neo kỳ (năm-tháng-01)`.
- **BR-CFG-05** Hai version `PUBLISHED` cùng loại **không** được trùng một `effectiveFrom` (partial unique index `uk_*_published_eff`).
- **BR-CFG-06** Version `DRAFT` và `ARCHIVED` bị engine bỏ qua.
- **BR-CFG-07** Bậc lương ràng buộc `1..10` (`chk_salary_grade_step_no`); mọi cột tỷ lệ ràng buộc `[0,1]`.

## 8. Quy tắc thông báo (`BR-NT`)
- **BR-NT-01** Sự kiện: `LeaveRequestSubmittedEvent`, `PayrollApprovedEvent`, `ContractExpiringEvent`, `CheckinProcessedEvent`.
- **BR-NT-02** Mọi sự kiện do `NotificationEventListener → NotificationService.send()` xử lý; không coupling service-to-service trực tiếp.
- **BR-NT-03** Người dùng chỉ đọc thông báo của mình.

## 9. Quy tắc dữ liệu xuyên suốt
- **BR-DC-01** Mọi khóa chính là String UUID sinh ở tầng service.
- **BR-DC-02** Entity có audit ghi `createdBy/updatedBy/createdAt/updatedAt` (JPA auditing).
- **BR-DC-03** Xóa mềm qua `deleteFlag` + `deletedAt` (chưa enforce toàn cục ở tầng query — kiểm tra theo repository).
