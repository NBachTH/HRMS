# Tài liệu Use Case — FaceZ HRMS

**Phiên bản:** 1.0 | **Ngày:** 16-06-2026
**Liên quan:** [BRD](01-BRD.md) · [Business Rules](03-business-rules.md) · [Process Flows](04-process-flows-bpmn.md) · [API Design](../02-technical/07-api-design.md)

Tài liệu đặc tả các use case của hệ thống. Mỗi use case viết theo **Actor, Tiền điều kiện, Luồng chính,
Luồng phụ/ngoại lệ, Hậu điều kiện**, kèm con trỏ tới endpoint hiện thực.

## Actor

- **Nhân viên** (`EMPLOYEE`) — bất kỳ người dùng đã xác thực (mọi vai trò đều có self-service).
- **Leader** (`LEADER`), **Manager** (`MANAGER`) — các cấp duyệt.
- **HR Admin** (`HR_ADMIN`) — quản trị nhân sự/hợp đồng/chấm công, duyệt cuối leave/OT.
- **Finance Admin** (`FINANCE_ADMIN`) — tính lương, config pháp lý, báo cáo.
- **Director** (`DIRECTOR`) — phê duyệt lương.
- **System Admin** (`SYSTEM_ADMIN`) — quản trị tài khoản & hệ thống, override.
- **Máy chấm công** (actor máy, `DEVICE_CHECKIN`) — đẩy dữ liệu chấm công.

## Danh mục use case

| ID | Use case | Actor chính |
|----|----------|-------------|
| UC-01 | Xác thực (login / refresh / logout) | Tất cả |
| UC-02 | Quản lý nhân viên | HR Admin |
| UC-03 | Quản lý tài khoản (bật/tắt, reset mật khẩu) | System Admin / HR Admin |
| UC-04 | Quản lý phòng ban | HR Admin |
| UC-05 | Quản lý hợp đồng (lịch sử) | HR Admin / Finance Admin |
| UC-06 | Thu nhận dữ liệu chấm công | Máy chấm công |
| UC-07 | Xem / điều chỉnh chấm công | Nhân viên / HR Admin |
| UC-08 | Đối soát bảng công / giải quyết xung đột | HR Admin |
| UC-09 | Chốt kỳ chấm công | HR Admin |
| UC-10 | Xin nghỉ phép (có duyệt) | Nhân viên → Leader → Manager → HR |
| UC-11 | Xin OT (có duyệt) | Nhân viên → Leader → Manager → HR |
| UC-12 | Lập kế hoạch OT (OT plan) | Manager / HR |
| UC-13 | Tính lương (đơn + batch) | Finance Admin |
| UC-14 | Duyệt / từ chối lương | Director |
| UC-15 | Đánh dấu lương đã trả | Finance Admin |
| UC-16 | Xem phiếu lương | Nhân viên |
| UC-17 | Sinh báo cáo tài chính | Finance Admin / Director |
| UC-18 | Quản lý config pháp lý (maker-checker) | Finance Admin / Director |
| UC-19 | Quản lý ngày lễ | HR Admin |
| UC-20 | Quản lý người phụ thuộc thuế | HR Admin / Nhân viên |
| UC-21 | Đọc & quản lý thông báo | Tất cả |
| UC-22 | Đăng ký thiết bị & xoay API key | HR Admin |

---

## UC-01 — Xác thực
**Actor:** Tất cả. **Endpoint:** `POST /api/auth/login`, `/refresh`, `/logout`, `GET /api/auth/me`.
**Tiền điều kiện:** Tài khoản tồn tại và đang bật.
**Luồng chính:**
1. Người dùng gửi username + mật khẩu.
2. Hệ thống xác thực, cấp access token 5 phút và đặt refresh cookie HTTP-only 14 ngày (lưu Redis).
3. Frontend giữ access token trong bộ nhớ và gọi `GET /api/auth/me` để nạp hồ sơ.
**Luồng phụ / ngoại lệ:**
- A1 Sai thông tin → 401; đếm lần đăng nhập (rate limit: 10/15 phút/IP).
- A2 Access token hết hạn khi đang dùng → frontend âm thầm gọi `/refresh` (cookie), thử lại lời gọi gốc 1 lần.
- A3 Refresh token bị thu hồi/hết hạn → đăng xuất và chuyển về trang login.
**Hậu điều kiện:** Phiên đã xác thực; refresh token xoay vòng mỗi lần refresh.

## UC-02 — Quản lý nhân viên
**Actor:** HR Admin. **Endpoint:** `POST/PUT/DELETE /api/employees`, `GET /api/employees/{id}`, `POST /{id}/profile-picture`.
**Tiền điều kiện:** Actor có `HR_ADMIN`.
**Luồng chính:** Tạo nhân viên (sinh UUID) → tùy chọn tạo tài khoản liên kết → gán phòng ban/vai trò → upload ảnh đại diện.
**Luồng phụ / ngoại lệ:**
- A1 Trùng trường unique (nationalId/taxCode/socialInsuranceCode/email) → 400.
- A2 Xóa đặt `deleteFlag` (xóa mềm), loại khỏi danh sách hiện hành.
- A3 Ảnh > 5 MB hoặc sai định dạng → 400.
**Hậu điều kiện:** Nhân viên được lưu; trường audit được set.

## UC-03 — Quản lý tài khoản
**Actor:** System Admin / HR Admin. **Endpoint:** `PATCH /api/accounts/{employeeId}/toggle`, `/{employeeId}/reset-password`.
**Luồng chính:** Bật/tắt tài khoản; reset mật khẩu (cấp mới; hash cũ giữ ở `last_password_hash`).
**Ngoại lệ:** Tắt tài khoản chặn login mới ngay; access token đang có vẫn hiệu lực đến khi hết hạn (≤5 phút).

## UC-04 — Quản lý phòng ban
**Actor:** HR Admin. **Endpoint:** `POST/PUT/DELETE /api/departments`, `GET /api/departments`, `/{id}`, `/my`.
**Luồng chính:** Tạo phòng ban, gán quản lý (unique — một quản lý/phòng ban).
**Ngoại lệ:** Gán quản lý đang quản phòng khác → 400 (ràng buộc unique).

## UC-05 — Quản lý hợp đồng (lịch sử)
**Actor:** HR Admin / Finance Admin. **Endpoint:** `POST /api/contracts`, `PUT/DELETE /{id}`, `GET /{id}`, `/employee/{id}/history`, `/expiring-soon`, `POST /{id}/document`.
**Tiền điều kiện:** Nhân viên tồn tại.
**Luồng chính:** Tạo version hợp đồng mới với `effectiveFrom`; hệ thống đánh dấu `current` và đóng `effectiveTo` của version trước. Đính kèm tài liệu đã ký.
**Luồng phụ:** `GET /expiring-soon` liệt kê hợp đồng sắp hết hạn (kích hoạt `ContractExpiringEvent`).
**Hậu điều kiện:** Đúng một hợp đồng hiện hành/nhân viên; giữ đầy đủ lịch sử.

## UC-06 — Thu nhận dữ liệu chấm công
**Actor:** Máy chấm công. **Endpoint:** `POST /api/checkin-logs`, `POST /api/checkin-logs/batch`.
**Tiền điều kiện:** `X-Device-API-Key` hợp lệ (hoặc JWT HR/SysAdmin).
**Luồng chính:**
1. Thiết bị nhận diện khuôn mặt và POST `{employeeId, deviceId, logType:IN|OUT, logTime}` (đơn hoặc mảng batch).
2. `CheckinLogService` lưu từng log thô, rồi `AttendanceService.processCheckinForAttendance()`:
   - `IN` → tạo `Attendance` cho ngày (idempotent — bỏ qua nếu đã có).
   - `OUT` → đóng `Attendance` đang mở, điền `checkOut`, tính `lateHour`, `workingHour`, `paidHour`, `workingDay`, `paidDay`, `violate`.
**Luồng phụ / ngoại lệ:**
- A1 Đệm offline → thiết bị upload các lần chấm tích lũy qua `/batch` khi kết nối lại (xem [Integration](../02-technical/11-integration-design.md)).
- A2 Thiếu `OUT` → chấm công để mở; cron đêm `AttendanceSchedule` và HR adjustment đối soát; `violate=true`.
- A3 API key sai/không hoạt động → 401, không lưu dữ liệu.
**Hậu điều kiện:** Log thô được lưu; chấm công cập nhật idempotent; phát `CheckinProcessedEvent`.

## UC-07 — Xem / điều chỉnh chấm công
**Actor:** Nhân viên (xem `/my`), HR Admin (sửa). **Endpoint:** `GET /api/attendances/my`, `PUT/DELETE /api/attendances/{id}`, `GET/PUT /api/attendance-adjustments/...`.
**Luồng chính:** Nhân viên xin điều chỉnh (vd quên checkout) → HR duyệt/từ chối → chấm công được sửa, bảng công tái dựng.

## UC-08 — Đối soát bảng công / giải quyết xung đột
**Actor:** HR Admin. **Endpoint:** `GET /api/work-days/my`, `/conflicts`, `PATCH /{id}/resolve`, `GET /api/timesheets/my`, `/{employeeId}`.
**Luồng chính:** Hệ thống dựng `WorkDay` mỗi ngày từ các nguồn (CHECKIN, LEAVE_REQUEST, PUBLIC_HOLIDAY, MANUAL, SYSTEM). Khi nguồn mâu thuẫn, ngày bị gắn `CONFLICT`; HR giải quyết, chọn giá trị chuẩn.
**Hậu điều kiện:** Mỗi ngày được phân loại (PRESENT/LEAVE/HOLIDAY/ABSENT/HOLIDAY_WORK) với `paidDay` — đầu vào cho payroll.

## UC-09 — Chốt kỳ chấm công
**Actor:** HR Admin. **Endpoint:** `POST /api/attendances/close-period` (dry-run vs `forceClose`), `/close-period/remind`.
**Luồng chính:**
1. HR chạy **dry run** (`forceClose=false`); hệ thống trả danh sách vắng không lý do (ngày không chấm công và không có phép đã duyệt).
2. HR xử lý các ngày vắng hoặc đặt `forceClose=true` để coi là nghỉ không lương và khóa tháng.
**Hậu điều kiện:** Kỳ bất biến với payroll; có thể tính lương tháng đó.

## UC-10 — Xin nghỉ phép (có duyệt)
**Actor:** Nhân viên → Leader → Manager → HR. **Endpoint:** `POST /api/leaves`, `PUT /{id}/submit|approve|reject`, `DELETE /{id}`, `GET /my`, `/{id}`, `/balances/my`, `/balances/{employeeId}`.
**Tiền điều kiện:** Nhân viên đã xác thực; đủ số dư phép cho loại có lương.
**Luồng chính:**
1. Nhân viên tạo đơn `DRAFT` (loại, bắt đầu, kết thúc, lý do) và gửi → `TO_APPROVE`.
2. Leader duyệt → `LEADER_APPROVED`; Manager duyệt → `MANAGER_APPROVED`; HR xác nhận → `APPROVED`.
3. Khi duyệt cuối, trừ số dư phép (với loại có số dư) và các `WorkDay` tương ứng thành `LEAVE`.
**Luồng phụ / ngoại lệ:**
- A1 Từ chối ở bất kỳ cấp → `REJECTED` (ghi lý do); số dư không đổi.
- A2 Không đủ số dư cho loại có lương → 400 khi submit.
- A3 Xóa chỉ khi `DRAFT`/`TO_APPROVE`.
**Hậu điều kiện:** Phép đã duyệt ảnh hưởng chấm công/bảng công và lương; người gửi nhận thông báo ở mỗi bước.

## UC-11 — Xin OT
**Actor:** Nhân viên → Leader → Manager → HR. **Endpoint:** `POST /api/ot-requests`, `PUT /{id}/approve|reject`, `DELETE /{id}`, `GET /my`, `/{id}`.
**Luồng chính:** Cùng máy trạng thái đa cấp như UC-10. OT đã duyệt (timestamp bắt đầu/kết thúc) đưa vào tính OT lương (thường ×1.5 / cuối tuần ×2.0 / lễ ×3.0, đêm +0.3).
**Ngoại lệ:** Xóa chỉ khi `DRAFT`/`TO_APPROVE`.

## UC-12 — Lập kế hoạch OT (OT plan)
**Actor:** Manager / HR. **Endpoint:** `POST /api/ot-plans`, `PUT /{id}/approve|reject`, `GET /my-approved`, `/{id}`.
**Luồng chính:** Quản lý lập kế hoạch OT cho một nhóm nhân viên; kế hoạch đã duyệt thành cơ sở OT mà nhân viên có thể claim.

## UC-13 — Tính lương (đơn + batch)
**Actor:** Finance Admin. **Endpoint:** `POST /api/payrolls/calculate`, `POST /api/payrolls/batch-calculate`, `GET /api/payrolls/jobs/{jobId}`.
**Tiền điều kiện:** Đã chốt chấm công kỳ; có hợp đồng hiện hành và config hiệu lực.
**Luồng chính (đơn):** Finance POST `{employeeId, year, month, đầu vào KPI, bonus...}`; engine tính payroll `DRAFT` dùng config hiệu lực theo ngày (xem [Business Rules §1](03-business-rules.md)).
**Luồng chính (batch):** `batch-calculate` trả `jobId`; worker `@Async` tính toàn bộ nhân viên; frontend poll `jobs/{jobId}` (~1.5s) đến `COMPLETED`/`FAILED`.
**Luồng phụ / ngoại lệ:**
- A1 Tính lại ghi đè `DRAFT` đang có cho cùng `(employee, year, month)` (ràng buộc unique).
- A2 Thiếu config hiệu lực → tính toán thất bại với thông báo mô tả.
**Hậu điều kiện:** Lưu các dòng payroll `DRAFT`.

## UC-14 — Duyệt / từ chối lương
**Actor:** Director. **Endpoint:** `PATCH /api/payrolls/{id}/submit` (Finance), `/{id}/approve`, `/{id}/reject` (Director).
**Luồng chính:** Finance gửi `DRAFT` → `PENDING_APPROVAL`; Director duyệt → `APPROVED` hoặc từ chối → `REJECTED` (Finance tính lại). `PayrollApprovedEvent` thông báo nhân viên.
**Hậu điều kiện:** Tách bạch trách nhiệm — người tính không tự duyệt.

## UC-15 — Đánh dấu lương đã trả
**Actor:** Finance Admin. **Endpoint:** `PATCH /api/payrolls/{id}/mark-paid`.
**Tiền điều kiện:** Payroll ở `APPROVED`.
**Luồng chính:** Finance ghi nhận chuyển khoản ngân hàng bên ngoài đã thực hiện → `PAID` (trạng thái cuối).

## UC-16 — Xem phiếu lương
**Actor:** Nhân viên. **Endpoint:** `GET /api/payrolls/my`, `/my/{year}/{month}/slip`.
**Luồng chính:** Nhân viên xem chi tiết phiếu lương của mình (gross, phụ cấp, OT, bảo hiểm, thuế, net). Service enforce chỉ-bản-ghi-của-mình.

## UC-17 — Sinh báo cáo tài chính
**Actor:** Finance Admin / Director. **Endpoint:** `GET /api/payrolls/reports/labour-cost`, `/insurance-remittance`, `/pit-summary`.
**Luồng chính:** Lọc theo năm/tháng (và phòng ban cho chi phí lao động); xuất CSV từ frontend.

## UC-18 — Quản lý config pháp lý (maker-checker)
**Actor:** Finance Admin (maker), Director / System Admin (checker). **Endpoint:** `/api/payroll-configs/{salary-grade|pit|insurance|allowance}` GET/POST, `PATCH /{id}/publish`, `DELETE /{id}`; legacy `/api/system-configs/...`.
**Luồng chính:**
1. Finance tạo version config `DRAFT` với `effectiveFrom` và các bảng mức.
2. Director/SysAdmin **publish** → `PUBLISHED`; version cũ đủ điều kiện chuyển `ARCHIVED`.
3. Lương cho một kỳ chọn version `PUBLISHED` mới nhất có `effectiveFrom ≤ kỳ`.
**Ngoại lệ:** Hai version `PUBLISHED` cùng loại không được trùng một `effectiveFrom` (partial unique index).

## UC-19 — Quản lý ngày lễ
**Actor:** HR Admin. **Endpoint:** `POST/GET /api/public-holidays`, `DELETE /{id}`.
**Luồng chính:** Thêm ngày lễ; loại khỏi tính ngày công và không bao giờ tính là vắng; OT ngày lễ trả ×3.0.

## UC-20 — Quản lý người phụ thuộc thuế
**Actor:** HR Admin / Nhân viên. **Endpoint:** `GET /api/tax-dependents/employee/{id}`, `POST`, `PUT/DELETE /{id}`.
**Luồng chính:** Đăng ký người phụ thuộc; `dependentCount` trên hợp đồng quyết định giảm trừ thuế TNCN.

## UC-21 — Thông báo
**Actor:** Tất cả. **Endpoint:** `GET /api/notifications`, `/unread-count`, `PATCH /{id}/read`, `/read-all`.
**Luồng chính:** Thông báo theo sự kiện (gửi phép, duyệt lương, hợp đồng sắp hết hạn, đã xử lý chấm công) hiện trong hộp thư người dùng.

## UC-22 — Đăng ký thiết bị & xoay API key
**Actor:** HR Admin. **Endpoint:** `POST /api/devices/{deviceId}/api-keys`, `PATCH /{deviceId}/api-keys/{keyId}/deactivate`, `DELETE /{deviceId}`.
**Luồng chính:** HR cấp API key cho thiết bị; **raw key hiện đúng một lần**, chỉ lưu hash SHA-256. Deactivate để xoay.
**Hậu điều kiện:** Thiết bị xác thực bằng raw key; key lộ bị vô hiệu hóa mà không cần redeploy.
