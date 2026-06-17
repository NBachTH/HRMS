# Screen Inventory — Danh sách Màn hình FaceZ HRMS

> Liệt kê toàn bộ màn hình/page cần thiết, mapping với module backend, kèm role được truy cập.

---

## Quy ước

- **R** = Read only (chỉ xem)
- **RW** = Read + Write (xem + thao tác)
- `✓` = có quyền truy cập
- `—` = không truy cập
- **[modal]** = không phải route riêng, là component dialog/drawer nằm trong màn hình cha

---

## AUTH — Xác thực

| # | Màn hình | Mô tả ngắn | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|---|----------|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| A-01 | **Trang đăng nhập** | Form username/password. Hiển thị lỗi nếu sai credentials hoặc bị rate-limit (429). | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| A-02 | **Đổi mật khẩu** | Form nhập mật khẩu cũ + mật khẩu mới. Accessible sau khi đăng nhập. | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## DASHBOARD — Trang chủ

| # | Màn hình | Mô tả ngắn | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|---|----------|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| D-01 | **Dashboard cá nhân** | Widgets cá nhân: ngày phép còn lại, trạng thái chấm công hôm nay, số thông báo chưa đọc, đơn đang chờ xử lý của bản thân. | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| D-02 | **Dashboard HR** | Widgets quản trị: tổng nhân viên active, hợp đồng sắp hết hạn (30 ngày), đơn Leave/OT chờ theo từng cấp, kỳ chấm công chưa đóng. Chỉ dành cho HR_ADMIN. | — | — | — | R | — | — | — |

> **Lý do bỏ MANAGER khỏi D-02**: MANAGER chỉ cần biết đơn đang chờ mình duyệt (LEADER_APPROVED), không cần toàn bộ metrics nhân sự. Thông tin đó hiển thị qua widget trong D-01 hoặc badge trong sidebar.

---

## PROFILE — Hồ sơ cá nhân

| # | Màn hình | Mô tả ngắn | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|---|----------|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| P-01 | **Hồ sơ cá nhân** | Thông tin cá nhân: họ tên, email, phone, phòng ban, ngày vào làm, trạng thái. EMPLOYEE chỉ xem. HR_ADMIN xem + sửa + upload ảnh. | R | R | R | RW | — | R | — |
| P-02 | **Hợp đồng của tôi** | Xem hợp đồng đang active của bản thân (loại HĐ, thời hạn, lương cơ bản). Không có edit. | R | R | R | — | — | R | — |

---

## EMPLOYEE — Quản lý Nhân viên

| # | Màn hình | Mô tả ngắn | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|---|----------|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| E-01 | **Danh sách nhân viên** | Bảng với filter (phòng ban, trạng thái, role), search tên/username. LEADER/MANAGER/SYS chỉ xem. HR_ADMIN có nút Tạo/Sửa/Xóa. | — | R | R | RW | — | — | R |
| E-02 | **Tạo nhân viên** | Form đầy đủ: họ tên, email, phone, username, password, role, phòng ban, JLPT, employee level, ngày sinh, giới tính, CCCD, mã số thuế, mã BHXH, tài khoản ngân hàng. | — | — | — | RW | — | — | — |
| E-03 | **Chi tiết / Sửa nhân viên** | Thông tin đầy đủ một nhân viên. HR_ADMIN sửa từng trường, upload ảnh đại diện (jpeg/jpg/png/webp ≤5MB). Bao gồm tab Người phụ thuộc. | — | — | — | RW | — | — | — |
| E-04 | **Người phụ thuộc** [tab trong E-03] | Danh sách người phụ thuộc của nhân viên: tên, CCCD, ngày sinh, quan hệ, active. HR/FIN/SYS thêm/sửa/xóa. | — | — | — | RW | R | — | RW |

---

## DEPARTMENT — Phòng ban

| # | Màn hình | Mô tả ngắn | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|---|----------|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| DEP-01 | **Danh sách phòng ban** | Bảng phòng ban: tên, trưởng phòng. Tạo/sửa/xóa mềm inline (HR_ADMIN). | — | — | — | RW | — | — | — |

---

## CONTRACT — Hợp đồng

| # | Màn hình | Mô tả ngắn | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|---|----------|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| C-01 | **Lịch sử hợp đồng** | Tất cả phiên bản hợp đồng của một nhân viên, sắp xếp mới → cũ. Nút tạo HĐ mới / cập nhật (supersede). FIN đọc để tra cứu lương. | — | — | — | RW | R | — | R |
| C-02 | **Hợp đồng sắp hết hạn** | Danh sách hợp đồng `current=true` hết hạn trong N ngày (default 30). Cảnh báo rõ từng trường hợp. | — | — | — | R | — | — | — |

---

## ATTENDANCE — Chấm công

| # | Màn hình | Mô tả ngắn | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|---|----------|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| AT-01 | **Chấm công của tôi** | Lịch sử chấm công cá nhân theo tháng: ngày, giờ vào, giờ ra, số giờ, trễ giờ, vi phạm (violate). Read-only. | R | R | R | — | — | — | — |
| AT-02 | **Quản lý chấm công (admin)** | Bảng chấm công toàn công ty. Filter: nhân viên, tháng/năm. MANAGER đọc. HR_ADMIN có nút **Sửa** (mở drawer inline) và **Xóa**. Không là màn hình riêng — sửa thực hiện qua drawer/modal trong AT-02. | — | — | R | RW | — | — | — |
| AT-03 | **Đóng kỳ chấm công** | Trang riêng (route: `/attendance/close-period`). Bước 1: chọn tháng/năm + notes → hệ thống trả về danh sách vắng không phép nếu có. Bước 2: xem danh sách → chọn force close hay hủy. Kỳ đóng không thể mở lại. | — | — | — | RW | — | — | — |
| AT-04 | **Ngày nghỉ lễ** | Danh sách ngày nghỉ lễ quốc gia. HR/FIN/SYS thêm/sửa/xóa. | — | — | — | RW | RW | — | RW |

> **Sửa bản ghi chấm công** không phải màn hình riêng — đây là drawer/modal mở từ nút Sửa trong AT-02. Không có route riêng.

---

## CHECKIN LOG — Lịch sử chấm công thô

| # | Màn hình | Mô tả ngắn | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|---|----------|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| CL-01 | **Lịch sử log chấm công thô** | Danh sách raw CheckinLog từ thiết bị: employee, device, logTime, logType (IN/OUT). Read-only. HR dùng để debug khi Attendance không khớp. | — | — | — | R | — | — | R |

> **Phân biệt AT-01/AT-02 vs CL-01**: AT-* hiển thị Attendance đã tổng hợp (checkIn, checkOut, paidHour, violate). CL-01 hiển thị raw events từng lần quẹt thẻ. CL-01 chủ yếu phục vụ debug, không cần trong luồng nghiệp vụ thông thường.

---

## DEVICE — Thiết bị chấm công

| # | Màn hình | Mô tả ngắn | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|---|----------|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| DV-01 | **Danh sách thiết bị** | Bảng thiết bị: tên, vị trí, trạng thái API key (active/inactive). Tạo thiết bị mới. Nút **"Tạo API Key"** mở modal con [DV-API] trong cùng trang. | — | — | — | RW | — | — | RW |

> **[DV-API] Modal tạo API Key** [component của DV-01]: Sau khi confirm, hiển thị raw key **một lần duy nhất** kèm cảnh báo rõ ràng. Đây là modal, không có route riêng.

---

## LEAVE — Nghỉ phép

| # | Màn hình | Mô tả ngắn | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|---|----------|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| L-01 | **Đơn nghỉ phép của tôi** | Danh sách đơn cá nhân. Filter theo trạng thái, loại phép. Nút tạo đơn mới. Xóa được đơn `TO_APPROVE`. | RW | RW | RW | RW | — | — | — |
| L-02 | **Tạo đơn nghỉ phép** | Form: loại nghỉ phép, ngày bắt đầu/kết thúc, lý do. Nếu chọn ANNUAL: hiển thị số dư phép còn lại trước khi submit. | RW | RW | RW | RW | — | — | — |
| L-03 | **Số dư nghỉ phép** | Widget/tab trong L-01: entitlementDays, usedDays, pendingDays, remainingDays. | R | R | R | R | — | — | — |
| L-04 | **Duyệt đơn nghỉ phép** | Màn hình dùng chung cho cả 3 cấp phê duyệt. Default filter theo role: LEADER → `TO_APPROVE`, MANAGER → `LEADER_APPROVED`, HR_ADMIN → `MANAGER_APPROVED` (có thể đổi filter). Nút Approve/Reject trên từng dòng. | — | RW | RW | RW | — | — | — |

> L-04 là một màn hình duy nhất với smart default filter theo role, không tách thành 3 trang.

---

## OT REQUEST — Tăng ca

| # | Màn hình | Mô tả ngắn | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|---|----------|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| OT-01 | **Đơn tăng ca của tôi** | Danh sách đơn OT cá nhân. Filter theo trạng thái. Nút tạo + xóa đơn `TO_APPROVE`. Hiển thị tổng giờ OT đã duyệt tháng/năm hiện tại. | RW | RW | RW | RW | — | — | — |
| OT-02 | **Tạo đơn tăng ca** | Form: ngày bắt đầu/kết thúc, lý do. Hiển thị giới hạn còn lại (tháng/năm). | RW | RW | RW | RW | — | — | — |
| OT-03 | **Duyệt đơn tăng ca** | Tương tự L-04: một màn hình, default filter theo role của người dùng. | — | RW | RW | RW | — | — | — |

---

## PAYROLL — Bảng lương

| # | Màn hình | Mô tả ngắn | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|---|----------|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| PAY-01 | **Payslip cá nhân** | Xem slip lương bản thân khi status = `APPROVED` hoặc `PAID`. Chi tiết: gross, OT, bảo hiểm, PIT, net salary. Mọi role đều xem được payslip **của bản thân**. | R | R | R | R | R | R | — |
| PAY-02 | **Danh sách bảng lương — FINANCE** | Toàn bộ bảng lương, **mọi trạng thái** (DRAFT → PAID). Filter: tháng/năm/trạng thái/nhân viên. Nút: Tính lương lẻ, Tính hàng loạt, Submit DRAFT, Mark-paid APPROVED, Xóa DRAFT. | — | — | — | — | RW | — | — |
| PAY-03 | **Danh sách bảng lương — DIRECTOR** | Bảng lương filter mặc định `PENDING_APPROVAL`. Có thể mở rộng xem `APPROVED`/`PAID` (báo cáo). Nút Approve/Reject. **Không thấy DRAFT.** | — | — | — | — | — | RW | RW* |
| PAY-04 | **Tính lương đơn lẻ** | Form: chọn nhân viên, tháng, năm, KPI1 (A/B/C). Preview kết quả tính trước khi lưu DRAFT. | — | — | — | — | RW | — | — |
| PAY-05 | **Tính lương hàng loạt** | Chọn tháng/năm + số ngày công chuẩn. Submit → nhận jobId → polling progress (total/succeeded/skipped/failed). | — | — | — | — | RW | — | — |
| PAY-06 | **Chi tiết bảng lương** | Xem đầy đủ một bảng lương: breakdown KPI, phụ cấp, OT theo từng ngày, bảo hiểm (NV+CTY), PIT từng bậc, net salary, lịch sử trạng thái. | — | — | — | — | RW | RW | — |

> *SYS_ADMIN có quyền approve theo code (`hasAuthority('DIRECTOR') or hasAuthority('SYSTEM_ADMIN')`). PAY-03 áp dụng cho cả SYS. Xem thêm giải thích trong use-cases-by-role.md.

> **HR_ADMIN và Payroll**: HR không có quyền truy cập bất kỳ màn hình payroll admin nào. HR chỉ xem payslip cá nhân của mình qua PAY-01.

---

## SYSTEM CONFIG — Cấu hình hệ thống lương

| # | Màn hình | Mô tả ngắn | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|---|----------|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| SC-01 | **Quản lý cấu hình hệ thống** | Bảng 4 loại: SALARY_GRADE, ALLOWANCE, PIT, INSURANCE. Mỗi loại hiển thị version active + lịch sử. FINANCE_ADMIN tạo version mới (inactive). SYSTEM_ADMIN tạo + activate. Nút **Activate** mở confirm dialog [SC-ACT] inline trong trang. | — | — | — | — | RW | — | RW |

> **[SC-ACT] Confirm dialog Activate** [component của SC-01]: Hiển thị cảnh báo "Version cũ sẽ bị deactivate. Cache sẽ được reload. Tiếp tục?" — không có route riêng. Chỉ SYSTEM_ADMIN thấy nút này.

---

## NOTIFICATION — Thông báo

| # | Màn hình | Mô tả ngắn | EMP | LDR | MGR | HR | FIN | DIR | SYS |
|---|----------|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| N-01 | **Danh sách thông báo** | Trang `/notifications`: danh sách thông báo cá nhân phân trang, mới nhất trên. Đánh dấu đọc từng cái hoặc "Đánh dấu tất cả". Badge số chưa đọc hiện trong navbar (polling unread-count). | R | R | R | R | R | R | R |

---

## [GAP] ATTENDANCE ADJUSTMENT REQUEST — Yêu cầu điều chỉnh công *(chưa có trong backend)*

> Phần này ghi nhận một gap nghiệp vụ. Hiện tại HR_ADMIN sửa trực tiếp bản ghi chấm công (AT-02 drawer), không có workflow nhân viên → HR. Trong thực tế, nhân viên thường cần submit yêu cầu điều chỉnh (quên chấm, thiết bị lỗi, out-of-office) để HR xác nhận trước khi sửa.

| # | Màn hình đề xuất | Mô tả | EMP | LDR | MGR | HR |
|---|------------------|-------|:---:|:---:|:---:|:---:|
| ADJ-01 | **Yêu cầu điều chỉnh công của tôi** | Danh sách yêu cầu điều chỉnh của bản thân. Tạo yêu cầu: chọn ngày, loại điều chỉnh (quên check-in/check-out), giờ đề nghị, lý do. | RW | RW | RW | — |
| ADJ-02 | **Duyệt yêu cầu điều chỉnh (HR)** | Danh sách yêu cầu điều chỉnh của toàn công ty. Approve → tự động ghi đè bản ghi Attendance. Reject kèm lý do. | — | — | — | RW |

> **Backend cần bổ sung**: Entity `AttendanceAdjustmentRequest`, workflow approve/reject, trigger cập nhật Attendance khi approve.

---

## Tóm tắt số màn hình theo module

| Module | Màn hình (route) | Component không có route |
|--------|:----------------:|:------------------------:|
| Auth | 2 | — |
| Dashboard | 2 | — |
| Profile | 2 | — |
| Employee | 4 | — |
| Department | 1 | — |
| Contract | 2 | — |
| Attendance | 4 | Drawer sửa bản ghi (trong AT-02) |
| Checkin Log | 1 | — |
| Device | 1 | Modal API Key (trong DV-01) |
| Leave | 4 | — |
| OT Request | 3 | — |
| Payroll | 6 | — |
| System Config | 1 | Confirm dialog Activate (trong SC-01) |
| Notification | 1 | — |
| **Tổng route** | **34** | **3 components** |
| [Gap] Adj. Request | (+2 đề xuất) | — |

---

## Navigation sidebar theo role

**EMPLOYEE / LEADER / MANAGER**
- Dashboard (D-01 + widget đơn chờ duyệt nếu là LDR/MGR)
- Chấm công của tôi (AT-01)
- Nghỉ phép: Đơn của tôi (L-01) | Duyệt (L-04) ← chỉ LDR/MGR/HR
- Tăng ca: Đơn của tôi (OT-01) | Duyệt (OT-03) ← chỉ LDR/MGR/HR
- Bảng lương → Payslip của tôi (PAY-01)
- Thông báo (N-01)

**HR_ADMIN**
- Dashboard HR (D-02)
- Nhân viên (E-01, E-02, E-03)
- Phòng ban (DEP-01)
- Hợp đồng (C-01, C-02)
- Chấm công: Quản lý (AT-02) | Đóng kỳ (AT-03) | Ngày lễ (AT-04) | Thiết bị (DV-01) | Log thô (CL-01)
- Nghỉ phép: Đơn của tôi (L-01) | Duyệt cấp 3 (L-04)
- Tăng ca: Đơn của tôi (OT-01) | Duyệt cấp 3 (OT-03)
- Thông báo (N-01)

**FINANCE_ADMIN**
- Dashboard (D-01)
- Bảng lương: Danh sách (PAY-02) | Chi tiết (PAY-06) | Tính lẻ (PAY-04) | Hàng loạt (PAY-05)
- Cấu hình hệ thống (SC-01) — chỉ tạo, không activate
- Ngày lễ (AT-04)
- Hợp đồng (C-01) — đọc
- Payslip của tôi (PAY-01)
- Thông báo (N-01)

**DIRECTOR**
- Dashboard (D-01)
- Bảng lương: Phê duyệt (PAY-03) | Chi tiết (PAY-06)
- Payslip của tôi (PAY-01)
- Thông báo (N-01)

**SYSTEM_ADMIN**
- Dashboard (D-01)
- Cấu hình hệ thống (SC-01) — full quyền
- Thiết bị chấm công (DV-01)
- Nhân viên (E-01) — đọc
- Log chấm công thô (CL-01)
- Bảng lương: Phê duyệt (PAY-03) — quyền ngang DIRECTOR
- Thông báo (N-01)
