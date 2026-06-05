# Use Cases & User Stories theo Role

> Tài liệu này mô tả từng role thấy gì, làm được gì, và không làm được gì trong hệ thống FaceZ HRMS.
> Xem danh sách màn hình chi tiết tại [screen-inventory.md](screen-inventory.md).

---

## Tổng quan các Role

| Role | Mô tả |
|------|--------|
| `EMPLOYEE` | Nhân viên thông thường — tự phục vụ cá nhân |
| `LEADER` | Trưởng nhóm — phê duyệt cấp 1 cho đơn Leave/OT |
| `MANAGER` | Quản lý phòng ban — phê duyệt cấp 2 |
| `HR_ADMIN` | Nhân sự — quản trị toàn bộ dữ liệu nhân sự, phê duyệt cấp 3 |
| `FINANCE_ADMIN` | Kế toán/Lương — tính toán và quản lý bảng lương |
| `DIRECTOR` | Giám đốc — phê duyệt bảng lương cuối cùng |
| `SYSTEM_ADMIN` | Quản trị hệ thống — cấu hình hệ thống, quản lý thiết bị |

---

## 1. EMPLOYEE — Nhân viên

### Hồ sơ cá nhân
- **Xem** thông tin cá nhân (họ tên, email, phone, phòng ban, ngày vào công ty).
- **Xem** hợp đồng đang active của mình (loại HĐ, thời hạn, lương cơ bản).
- **Không thể** sửa hồ sơ hay hợp đồng — HR_ADMIN mới có quyền.

### Chấm công
- **Xem** lịch sử chấm công của bản thân theo tháng: giờ vào, giờ ra, số giờ công, trễ giờ, vi phạm.
- **Không thể** chỉnh sửa dữ liệu chấm công.
- Chấm công thực tế thực hiện qua thiết bị vật lý, không qua UI web.

### Đơn nghỉ phép (Leave)
- **Tạo** đơn nghỉ phép: ANNUAL, SICK, MATERNITY, PATERNITY, BEREAVEMENT, MARRIAGE, UNPAID.
- Khi tạo đơn ANNUAL: hệ thống kiểm tra số dư phép, từ chối nếu không đủ.
- **Xem** danh sách đơn của bản thân, lọc theo trạng thái.
- **Xem** số dư nghỉ phép năm (entitlementDays, pendingDays, usedDays, remainingDays).
- **Xóa** đơn đang ở `TO_APPROVE` (chưa qua phê duyệt lần nào).
- **Không thể** xem hay phê duyệt đơn của người khác.

### Đơn tăng ca (OT)
- **Tạo** đơn tăng ca (startTime, endTime, lý do). Hệ thống tự kiểm tra giới hạn: tháng ≤ 40h, năm ≤ 200h.
- **Xem** danh sách đơn OT của bản thân, lọc theo trạng thái.
- **Xóa** đơn ở trạng thái `TO_APPROVE`.
- **Không thể** xem hay phê duyệt đơn của người khác.

### Bảng lương
- **Xem** payslip cá nhân khi status = `APPROVED` hoặc `PAID`. Chi tiết: gross, OT, bảo hiểm, PIT, net.
- Nhận **thông báo** (PAYROLL_APPROVED) khi bảng lương của mình được DIRECTOR phê duyệt.
- **Không thể** xem bảng lương của người khác.
- **Không thể** xem khi bảng lương đang ở DRAFT hoặc PENDING_APPROVAL.

### Thông báo nhận được
| Loại | Khi nào |
|------|---------|
| `LEAVE_SUBMITTED` | Ngay sau khi tạo đơn nghỉ phép thành công |
| `PAYROLL_APPROVED` | Khi DIRECTOR approve bảng lương tháng của mình |
| `CONTRACT_EXPIRING` | Khi hợp đồng sắp hết hạn (trong vòng 30 ngày) |

---

## 2. LEADER — Trưởng nhóm

> LEADER có tất cả quyền của EMPLOYEE, cộng thêm:

### Phê duyệt đơn nghỉ phép — Cấp 1
- **Xem** danh sách đơn nghỉ phép của **tất cả nhân viên** trong hệ thống (backend không lọc theo department/team).
- Default filter hiển thị `TO_APPROVE` — trạng thái LEADER cần xử lý.
- **Approve** đơn `TO_APPROVE` → `LEADER_APPROVED`.
- **Reject** đơn `TO_APPROVE` → `REJECTED`.
- **Không thể** approve đơn đã ở `LEADER_APPROVED` trở lên.

### Phê duyệt đơn tăng ca — Cấp 1
- Tương tự Leave: approve/reject đơn OT ở `TO_APPROVE`.

### Danh sách nhân viên (đọc)
- **Xem** danh sách nhân viên để tra cứu khi phê duyệt.
- **Không thể** tạo, sửa, xóa nhân viên.

---

## 3. MANAGER — Quản lý phòng ban

> MANAGER có tất cả quyền của EMPLOYEE, cộng thêm:

### Phê duyệt đơn nghỉ phép — Cấp 2
- **Xem** danh sách đơn của **tất cả nhân viên**. Default filter: `LEADER_APPROVED`.
- **Approve** đơn `LEADER_APPROVED` → `MANAGER_APPROVED`.
- **Reject** đơn `LEADER_APPROVED` → `REJECTED`.
- **Không thể** approve đơn còn ở `TO_APPROVE` (phải đi qua LEADER trước).

### Phê duyệt đơn tăng ca — Cấp 2
- Tương tự: approve/reject OT ở `LEADER_APPROVED`.

### Chấm công (đọc)
- **Xem** dữ liệu chấm công toàn công ty (read-only).

### Danh sách nhân viên (đọc)
- **Xem** danh sách nhân viên. **Không thể** tạo, sửa, xóa.

---

## 4. HR_ADMIN — Nhân sự

### Quản lý Nhân viên
- **Tạo** nhân viên mới (tên, email, phone, username, password, department, role, JLPT, employee level, ngày sinh, CCCD, mã số thuế, mã BHXH, tài khoản ngân hàng).
- **Sửa** thông tin nhân viên, **upload** ảnh đại diện (jpeg/jpg/png/webp ≤5MB).
- **Xóa mềm** nhân viên (set TERMINATED, tài khoản không thể đăng nhập).
- **Xem** danh sách toàn bộ nhân viên, lọc theo department/status/role.

### Quản lý Phòng ban
- **Tạo, sửa, xóa mềm** phòng ban. **Gán manager** cho phòng ban.

### Quản lý Hợp đồng
- **Tạo** hợp đồng mới cho nhân viên.
- **Cập nhật** hợp đồng theo version control: version cũ bị supersede (`current=false`, `effectiveTo=today`), version mới được tạo.
- **Xem** lịch sử hợp đồng và danh sách hợp đồng sắp hết hạn.

### Người phụ thuộc giảm trừ thuế
- **Thêm/sửa/xóa** người phụ thuộc của nhân viên.

### Chấm công
- **Xem** dữ liệu chấm công toàn công ty, lọc theo nhân viên/tháng.
- **Sửa thủ công** bản ghi chấm công (chỉnh checkIn/checkOut — hệ thống tự tính lại các chỉ số).
- **Xóa mềm** bản ghi chấm công.
- **Xem** raw CheckinLog để debug khi Attendance không khớp.
- **Đóng kỳ chấm công**: kiểm tra vắng không phép → xem danh sách → quyết định force close. Kỳ đóng không thể mở lại.

### Ngày nghỉ lễ & Thiết bị
- **Tạo, sửa, xóa** ngày nghỉ lễ quốc gia.
- **Tạo thiết bị** chấm công, **tạo API Key** (raw key hiển thị 1 lần, lưu SHA-256 hash).

### Phê duyệt đơn nghỉ phép — Cấp 3 (cuối cùng)
- **Xem** tất cả đơn nghỉ phép mọi trạng thái, mọi nhân viên. Default filter: `MANAGER_APPROVED`.
- **Approve cuối** `MANAGER_APPROVED` → `APPROVED` (xác nhận trừ số dư ANNUAL nếu có).
- **Reject** `MANAGER_APPROVED` → `REJECTED` (hoàn trả số dư ANNUAL nếu có).

### Phê duyệt đơn tăng ca — Cấp 3
- Tương tự: approve/reject OT ở `MANAGER_APPROVED`.

### Bảng lương
- **Xem payslip cá nhân** của bản thân (khi APPROVED/PAID) qua PAY-01 giống EMPLOYEE.
- **Không có quyền** truy cập màn hình quản lý bảng lương (PAY-02 đến PAY-06).

### Thông báo nhận được
- Nhận các loại thông báo như EMPLOYEE (LEAVE_SUBMITTED khi nộp đơn của chính mình, PAYROLL_APPROVED khi lương mình được duyệt, CONTRACT_EXPIRING nếu HĐ của mình sắp hết).

---

## 5. FINANCE_ADMIN — Kế toán / Tính lương

### Bảng lương — Toàn quyền tính toán và vận hành
- **Tính lương đơn lẻ**: chọn nhân viên + tháng + KPI1 (A/B/C) → lưu DRAFT.
- **Tính lương hàng loạt**: chọn tháng/năm + số ngày công chuẩn → nhận `jobId` → polling tiến trình.
- **Xem** danh sách bảng lương **tất cả trạng thái** (DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, PAID).
- **Xem chi tiết** bảng lương: gross, OT pay chi tiết, bảo hiểm, PIT từng bậc, net salary.
- **Submit** DRAFT → PENDING_APPROVAL (gửi lên DIRECTOR).
- **Xóa** bảng lương đang ở DRAFT (để tính lại).
- **Mark-paid** APPROVED → PAID (xác nhận đã chuyển khoản).
- **Không thể** approve bảng lương — đó là quyền DIRECTOR.
- **Xem payslip cá nhân** của bản thân qua PAY-01 (khi bảng lương của mình APPROVED/PAID).

### Cấu hình hệ thống lương — Tạo nhưng không activate
- **Tạo** phiên bản config mới (SALARY_GRADE, ALLOWANCE, PIT, INSURANCE) ở trạng thái inactive.
- **Xem** tất cả phiên bản config và version đang active.
- **Không thể** activate config — đó là quyền SYSTEM_ADMIN.

> **Lý do tách quyền tạo/activate (Two-man rule)**: FINANCE_ADMIN chuẩn bị nội dung cấu hình (nghiệp vụ), SYSTEM_ADMIN quyết định khi nào đưa vào áp dụng (kỹ thuật). Tránh trường hợp một người vừa soạn vừa kích hoạt bảng lương mới mà không có kiểm soát.

### Ngày nghỉ lễ
- **Tạo, sửa, xóa** ngày nghỉ lễ (cần cho tính lương OT ngày lễ ×3.0).

### Hợp đồng (đọc)
- **Xem** hợp đồng nhân viên để tra cứu baseSalary, positionCode, insuranceBase khi tính lương.

### Người phụ thuộc (đọc)
- **Xem** người phụ thuộc để tính giảm trừ gia cảnh khi tính PIT.

### Thông báo nhận được
- Nhận thông báo cá nhân như EMPLOYEE (PAYROLL_APPROVED của bản thân, CONTRACT_EXPIRING nếu có).
- Hiện tại **không có thông báo hệ thống** khi một job batch hoàn thành — FINANCE_ADMIN phải tự polling qua GET `/api/payrolls/jobs/{jobId}`.

---

## 6. DIRECTOR — Giám đốc

### Bảng lương — Phê duyệt cuối
- **Xem** danh sách bảng lương. Default filter: `PENDING_APPROVAL`. Có thể mở rộng xem `APPROVED`/`PAID` (báo cáo tổng).
- **Không thấy** bảng lương ở trạng thái DRAFT (chưa submit).
- **Approve** `PENDING_APPROVAL` → `APPROVED` (nhân viên liên quan nhận thông báo PAYROLL_APPROVED).
- **Reject** `PENDING_APPROVAL` → `REJECTED` kèm lý do (FINANCE_ADMIN cần tính lại từ đầu).
- **Xem chi tiết** bảng lương trước khi approve.

### Bảng lương cá nhân
- **Xem payslip** của bản thân khi bảng lương của mình được approve.

### Thông báo nhận được
- `PAYROLL_APPROVED` — khi bảng lương của bản thân DIRECTOR được phê duyệt (nếu DIRECTOR cũng là nhân viên có bảng lương).
- `CONTRACT_EXPIRING` — nếu HĐ của bản thân sắp hết hạn.

> **Điểm cần lưu ý**: Hiện tại hệ thống **không gửi thông báo cho DIRECTOR** khi FINANCE_ADMIN submit bảng lương lên `PENDING_APPROVAL`. DIRECTOR phải chủ động vào màn hình PAY-03 để kiểm tra. Đây là một gap UX — cần cân nhắc thêm event `PayrollSubmittedEvent` trong tương lai.

---

## 7. SYSTEM_ADMIN — Quản trị hệ thống

### Cấu hình hệ thống — Toàn quyền
- **Tạo** phiên bản config mới, **xem** lịch sử tất cả phiên bản.
- **Activate** phiên bản config: version cũ tự động deactivate, in-memory cache được reload ngay lập tức.

### Quản lý Thiết bị
- **Tạo** thiết bị chấm công, **tạo/deactivate API Key**.

### Bảng lương — Quyền approve ngang DIRECTOR
- **Xem** và **approve/reject** bảng lương `PENDING_APPROVAL`.
- Đây là quyền kỹ thuật được cấu hình trong `@PreAuthorize`: `hasAuthority('DIRECTOR') or hasAuthority('SYSTEM_ADMIN')`. Không phải "trường hợp khẩn cấp" — đây là thiết kế hệ thống trao quyền cho admin kỹ thuật để xử lý các tình huống vận hành (DIRECTOR vắng mặt, cần giải phóng luồng thanh toán).

### Các quyền đọc
- **Xem** danh sách nhân viên, hợp đồng, raw CheckinLog.

### Thông báo nhận được
- Nhận thông báo cá nhân như EMPLOYEE.

---

## Ma trận Phân quyền Tóm tắt

| Tính năng | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Xem/sửa hồ sơ cá nhân | R | R | R | RW | — | R | — |
| CRUD nhân viên | — | — | — | RW | — | — | — |
| Xem DS nhân viên | — | R | R | RW | — | — | R |
| CRUD phòng ban | — | — | — | RW | — | — | — |
| Tạo/sửa hợp đồng | — | — | — | RW | — | — | — |
| Xem hợp đồng | R(own) | — | — | RW | R | — | R |
| Xem chấm công cá nhân | R | R | R | — | — | — | — |
| Xem chấm công toàn công ty | — | — | R | RW | — | — | — |
| Sửa/xóa bản ghi chấm công | — | — | — | RW | — | — | — |
| Xem CheckinLog thô | — | — | — | R | — | — | R |
| Đóng kỳ chấm công | — | — | — | RW | — | — | — |
| Tạo đơn nghỉ phép | RW | RW | RW | RW | — | — | — |
| Approve Leave cấp 1 (TO_APPROVE) | — | RW | — | — | — | — | — |
| Approve Leave cấp 2 (LEADER_APPROVED) | — | — | RW | — | — | — | — |
| Approve Leave cấp 3 (MANAGER_APPROVED) | — | — | — | RW | — | — | — |
| Tạo đơn tăng ca | RW | RW | RW | RW | — | — | — |
| Approve OT cấp 1 | — | RW | — | — | — | — | — |
| Approve OT cấp 2 | — | — | RW | — | — | — | — |
| Approve OT cấp 3 | — | — | — | RW | — | — | — |
| Tính lương (single/batch) | — | — | — | — | RW | — | — |
| Submit lương DRAFT→PENDING | — | — | — | — | RW | — | — |
| Approve lương PENDING→APPROVED | — | — | — | — | — | RW | RW† |
| Mark-paid lương | — | — | — | — | RW | — | — |
| Xóa lương DRAFT | — | — | — | — | RW | — | — |
| Xem payslip **của bản thân** | R | R | R | R | R | R | — |
| Xem bảng lương tất cả (admin) | — | — | — | — | RW(all) | R(≥PENDING) | R(≥PENDING) |
| Cấu hình lương (tạo version) | — | — | — | — | RW | — | RW |
| Activate cấu hình | — | — | — | — | — | — | RW |
| Quản lý thiết bị + API Key | — | — | — | RW | — | — | RW |
| Ngày nghỉ lễ | — | — | — | RW | RW | — | RW |
| Người phụ thuộc | — | — | — | RW | R | — | RW |
| Thông báo cá nhân | R | R | R | R | R | R | R |

> †`SYSTEM_ADMIN` có quyền approve lương theo thiết kế hệ thống (`@PreAuthorize`), không phải ngoại lệ.

---

## [GAP] Luồng Yêu cầu Điều chỉnh Chấm công *(chưa có trong backend)*

Hiện tại HR_ADMIN sửa trực tiếp bản ghi chấm công, không có bước nhân viên xác nhận lý do. Trong thực tế cần một luồng:

1. **Nhân viên tạo yêu cầu điều chỉnh**: chọn ngày, loại điều chỉnh (quên check-in / quên check-out / thiết bị lỗi / công tác ngoài), giờ đề nghị, lý do.
2. **HR_ADMIN xem danh sách yêu cầu**: approve → ghi đè Attendance tự động; reject kèm lý do.

Luồng này cần bổ sung: entity `AttendanceAdjustmentRequest`, controller/service tương ứng, và trigger cập nhật Attendance khi approve. Xem chi tiết màn hình đề xuất trong [screen-inventory.md — phần GAP](screen-inventory.md).
