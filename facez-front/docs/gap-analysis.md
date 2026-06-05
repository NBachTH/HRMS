# Gap Analysis — FaceZ Frontend vs. Business Requirements

> So sánh giữa tài liệu nghiệp vụ (`screen-inventory.md`, `use-cases-by-role.md`) và source code hiện tại.
> Ngày review: 2026-05-27 | Cập nhật lần cuối: 2026-05-27

---

## Tóm tắt nhanh

| Loại gap | Số lượng | Đã sửa |
|----------|:--------:|:------:|
| Route/trang còn thiếu | 10 | 0 |
| Route sai nghiệp vụ (cần xóa) | 1 | 0 |
| Sidebar thiếu / sai mục | 14 | 0 |
| Tính năng thiếu trong trang đã có | 7 | 0 |
| Service còn thiếu | 2 | 0 |
| Lỗi phân quyền (ProtectedRoute / render logic) | 7 | **7** ✅ |

---

## 1. Route / Trang còn thiếu

### 1.1 AT-02 — Quản lý chấm công (Admin)

- **Route cần tạo**: `src/app/hr/attendance/page.tsx`
- **Component cần tạo**: `src/app/components/attendance/AdminAttendanceContent.tsx`, `AdminAttendanceTable.tsx`
- **Roles**: HR_ADMIN (RW — có nút Sửa/Xóa), MANAGER (R — chỉ xem)
- **Yêu cầu**: Bảng chấm công toàn công ty, filter nhân viên/tháng/năm. Nút **Sửa** mở drawer inline để chỉnh `checkIn`/`checkOut`; backend tự tính lại các chỉ số. Nút **Xóa** xóa mềm bản ghi.
- **Lưu ý**: Không tạo route riêng cho màn hình sửa — là drawer trong AT-02.

### 1.2 AT-03 — Đóng kỳ chấm công

- **Route cần tạo**: `src/app/hr/attendance/close-period/page.tsx`
- **Component cần tạo**: `src/app/components/attendance/ClosePeriodContent.tsx`
- **Roles**: HR_ADMIN (RW)
- **Yêu cầu**: Bước 1 — chọn tháng/năm + notes → gọi backend trả danh sách vắng không phép. Bước 2 — xem danh sách → force close hoặc hủy. Kỳ đóng **không thể mở lại**; cần confirm dialog rõ ràng.
- **Backend endpoint**: Sử dụng `PeriodCloseRequest` / `PeriodCloseResponse` / `UnexplainedAbsenceDto` đã có trong `types/index.ts`.

### 1.3 CL-01 — Lịch sử log chấm công thô

- **Route cần tạo**: `src/app/hr/checkin-log/page.tsx`
- **Component cần tạo**: `src/app/components/attendance/CheckinLogContent.tsx`
- **Roles**: HR_ADMIN (R), SYSTEM_ADMIN (R)
- **Yêu cầu**: Bảng read-only các raw `CheckinLog` từ thiết bị: employee, device, logTime, logType (IN/OUT). Filter theo nhân viên/ngày.
- **Cần bổ sung**: `CheckinLogService.ts`, type `CheckinLog` trong `types/index.ts`.

### 1.4 DV-01 — Quản lý thiết bị chấm công

- **Route cần tạo**: `src/app/hr/devices/page.tsx`
- **Component cần tạo**: `src/app/components/device/DeviceContent.tsx`, `DeviceFormModal.tsx`
- **Roles**: HR_ADMIN (RW), SYSTEM_ADMIN (RW)
- **Yêu cầu**: Bảng thiết bị (tên, vị trí, trạng thái API key). Tạo thiết bị mới. Nút **"Tạo API Key"** mở modal hiển thị raw key **một lần duy nhất** kèm cảnh báo. Nút deactivate API key.
- **Cần bổ sung**: `DeviceService.ts`, types `Device` và `ApiKey` trong `types/index.ts`.

### 1.5 N-01 — Danh sách thông báo

- **Route cần tạo**: `src/app/notifications/page.tsx`
- **Component cần tạo**: `src/app/components/notification/NotificationContent.tsx`
- **Roles**: Tất cả roles (R)
- **Yêu cầu**: Danh sách thông báo cá nhân phân trang, mới nhất trên. Đánh dấu đọc từng cái hoặc "Đánh dấu tất cả đã đọc". Badge số chưa đọc hiện trong `Header` (polling unread-count).
- **Service đã có**: `NotificationService.ts` — kiểm tra xem đã có `getUnreadCount()` và `markAllRead()` chưa.
- **Lưu ý**: Badge số chưa đọc trên `Header.tsx` cần được thêm (hiện `Header.tsx` chưa có logic này).

### 1.6 P-02 — Hợp đồng của tôi (self-service)

- **Cần thêm**: Tab hoặc section trong `src/app/components/employee/MyProfileContent.tsx` (route `/employees/me/`)
- **Roles**: EMPLOYEE, LEADER, MANAGER, HR_ADMIN (đều là R — chỉ xem hợp đồng active của bản thân)
- **Yêu cầu**: Xem hợp đồng active hiện tại của bản thân: loại HĐ, ngày bắt đầu/kết thúc, lương cơ bản. Không có edit.
- **Service cần bổ sung trong `ContractService.ts`**: hàm `getMyContract()` gọi endpoint `/api/contracts/my` (hoặc tương đương).

### 1.7 PAY-04 — Tính lương đơn lẻ

- **Cần thêm**: Modal/form trong `FinancePayrollContent.tsx` hoặc route riêng `src/app/finance/payroll/calculate/page.tsx`
- **Roles**: FINANCE_ADMIN (RW)
- **Yêu cầu**: Form chọn nhân viên, tháng, năm, KPI1 (A/B/C). Preview kết quả tính trước khi lưu DRAFT. Nút "Tính thử" → hiển thị breakdown. Nút "Lưu DRAFT" → gọi `POST /api/payrolls/calculate`.
- **Service đã có**: `calculatePayroll()` trong `PayrollService.ts` — chưa có UI gọi hàm này.

### 1.8 PAY-05 — Tính lương hàng loạt

- **Cần thêm**: Modal/form trong `FinancePayrollContent.tsx` hoặc route riêng `src/app/finance/payroll/batch/page.tsx`
- **Roles**: FINANCE_ADMIN (RW)
- **Yêu cầu**: Form chọn tháng/năm + số ngày công chuẩn. Submit → nhận `jobId` → polling tiến độ (`total`, `succeeded`, `skipped`, `failed`) với progress bar.
- **Service đã có**: `batchCalculatePayroll()`, `pollPayrollJob()` trong `PayrollService.ts` — chưa có UI gọi các hàm này.

### 1.9 PAY-06 — Chi tiết bảng lương

- **Route cần tạo**: `src/app/finance/payroll/[id]/page.tsx` (và `src/app/director/approvals/[id]/page.tsx` nếu cần tách)
- **Component cần tạo**: `src/app/components/payroll/PayrollDetailContent.tsx`
- **Roles**: FINANCE_ADMIN (RW — xem + mark-paid), DIRECTOR (R — xem trước khi approve), SYSTEM_ADMIN (R)
- **Yêu cầu**: Breakdown đầy đủ: KPI, gross, phụ cấp, OT từng ngày, bảo hiểm (NV+CTY), PIT từng bậc, net salary, lịch sử trạng thái (audit trail).
- **Service đã có**: `getPayrollById()` trong `PayrollService.ts` — chưa có UI.

### 1.10 C-02 — Hợp đồng sắp hết hạn

- **Cần thêm**: Tab hoặc filter trong `src/app/components/contract/ContractContent.tsx`
- **Roles**: HR_ADMIN (R)
- **Yêu cầu**: Hiển thị hợp đồng `current=true` hết hạn trong N ngày (mặc định 30 ngày). Mỗi dòng cảnh báo rõ: tên nhân viên, ngày hết hạn, số ngày còn lại.
- **Backend**: Cần endpoint `GET /api/contracts/expiring?days=30` hoặc tương đương.

---

## 2. Route / Trang không đúng nghiệp vụ (cần xóa hoặc sửa)

### 2.1 `/hr/payroll/` — HR_ADMIN không có quyền quản lý payroll

- **File**: `src/app/hr/payroll/page.tsx`
- **Vấn đề**: Trang này render `PayrollContent` và chỉ cho phép `HR_ADMIN`. Tuy nhiên theo nghiệp vụ, **HR_ADMIN không có quyền truy cập bất kỳ màn hình payroll admin nào** (PAY-02 đến PAY-06). HR_ADMIN chỉ xem payslip cá nhân qua `/employees/payroll/`.
- **Hành động cần làm**: Xóa file `src/app/hr/payroll/page.tsx`.
- **Sidebar**: Xóa mục "Payroll" trong section HR Admin của `Sidebar.tsx` (dòng 118–119).

---

## 3. Sidebar — Thiếu / Sai mục điều hướng

### 3.1 Personal section (tất cả roles) — thiếu 2 mục

| Mục thiếu | Route | Ghi chú |
|-----------|-------|---------|
| "My Profile" | `/employees/me/` | Trang đã có nhưng không có link trong sidebar |
| "Notifications" | `/notifications/` | Trang chưa có (xem gap 1.5) |

### 3.2 Manager section (MANAGER, LEADER, HR_ADMIN) — thiếu 1 mục

| Mục thiếu | Route | Ghi chú |
|-----------|-------|---------|
| "Attendance (Read)" | `/hr/attendance/` | MANAGER được xem chấm công toàn công ty (AT-02 read-only) |

### 3.3 HR Admin section — 1 mục sai + 5 mục thiếu

| Thay đổi | Mục | Route |
|---------|-----|-------|
| **XÓA** | "Payroll" | `/hr/payroll/` — sai nghiệp vụ (xem gap 2.1) |
| Thêm | "Departments" | `/managers/department/` (có thể dùng lại route hiện có) |
| Thêm | "Attendance" | `/hr/attendance/` (cần tạo) |
| Thêm | "Close Period" | `/hr/attendance/close-period/` (cần tạo) |
| Thêm | "Checkin Log" | `/hr/checkin-log/` (cần tạo) |
| Thêm | "Devices" | `/hr/devices/` (cần tạo) |

> **Lưu ý DEP-01**: Hiện tại `/managers/department/` phục vụ cả MANAGER đọc lẫn HR CRUD. Cần đảm bảo HR_ADMIN thấy đủ nút Tạo/Sửa/Xóa, MANAGER chỉ thấy danh sách.

### 3.4 Finance section (FINANCE_ADMIN) — thiếu 3 mục

| Mục thiếu | Route | Ghi chú |
|-----------|-------|---------|
| "System Config" | `/system/config/` | FINANCE_ADMIN tạo version mới, không activate — cần mở quyền ProtectedRoute |
| "Public Holidays" | `/hr/holidays/` | FINANCE_ADMIN cần xem/quản lý ngày lễ để tính lương OT |
| "Contracts" | `/hr/contract/` | FINANCE_ADMIN đọc để tra cứu baseSalary khi tính lương |

### 3.5 Director section (DIRECTOR) — cần review

Hiện có "Approvals" (`/director/approvals/`) và "Reports" (`/finance/reports/`). Khi PAY-06 được tạo, cần đảm bảo DIRECTOR có thể click từ PAY-03 vào detail (PAY-06) — có thể thông qua link trong bảng mà không cần thêm mục sidebar riêng.

### 3.6 System Admin section — thiếu 3 mục

| Mục thiếu | Route | Ghi chú |
|-----------|-------|---------|
| "Devices" | `/hr/devices/` | SYSTEM_ADMIN có RW trên DV-01 |
| "Checkin Log" | `/hr/checkin-log/` | SYSTEM_ADMIN có R trên CL-01 |
| "Payroll Approve" | `/director/approvals/` | SYSTEM_ADMIN có quyền ngang DIRECTOR theo thiết kế hệ thống |

---

## 4. Tính năng còn thiếu trong trang / component đã có

### 4.1 E-04 — Tab Người phụ thuộc trong màn hình nhân viên

- **File liên quan**: `src/app/components/employee/EmployeeContent.tsx` (hoặc `EmployeeFormModal.tsx`)
- **Vấn đề**: `TaxDependentService.ts` đã có đầy đủ, nhưng không có component nào render danh sách / form người phụ thuộc.
- **Cần làm**: Thêm tab "Dependants" trong màn hình chi tiết/sửa nhân viên (E-03). Tạo component `TaxDependentTab.tsx` với danh sách, thêm/sửa/xóa.
- **Roles**: HR_ADMIN (RW), FINANCE_ADMIN (R), SYSTEM_ADMIN (RW).

### 4.2 FinancePayrollContent — nút Approve không đúng nghiệp vụ

- **File**: `src/app/components/finance/FinancePayrollContent.tsx`
- **Vấn đề**: Component import `approvePayroll` và có hàm `handleApprove`. **FINANCE_ADMIN không có quyền approve bảng lương** — đó là quyền của DIRECTOR/SYSTEM_ADMIN.
- **Cần làm**: Xóa `handleApprove` và mọi nút "Approve" khỏi `FinancePayrollContent`. Approve chỉ nằm trong `DirectorApprovalContent`.

### 4.3 FinancePayrollContent — thiếu nút Tính lương (PAY-04/05)

- **File**: `src/app/components/finance/FinancePayrollContent.tsx`
- **Vấn đề**: Service functions `calculatePayroll()`, `batchCalculatePayroll()`, `pollPayrollJob()` đã có nhưng không được gọi ở đâu.
- **Cần làm**: Thêm 2 nút trong header của FinancePayrollContent: "Tính lẻ" (mở modal PAY-04) và "Tính hàng loạt" (mở modal PAY-05 với progress bar).

### 4.4 DashboardContent — thiếu case DIRECTOR

- **File**: `src/app/components/dashboard/DashboardContent.tsx`
- **Vấn đề**: `switch(role)` không có case `'DIRECTOR'` — DIRECTOR fall through vào `EmployeeDashboard`. Theo CLAUDE.md đây là đúng thiết kế, nhưng cần xác nhận với team: DIRECTOR có cần dashboard riêng với tổng quan payroll không?
- **Đề xuất**: Nếu cần, tạo `DirectorDashboard.tsx` hiển thị số bảng lương đang PENDING_APPROVAL và tổng chi phí lương tháng hiện tại.

### 4.5 SystemConfigContent — FINANCE_ADMIN cần tạo được version

- **File**: `src/app/components/config/SystemConfigContent.tsx`
- **Vấn đề**: Route `/system/config/` chỉ cho phép `SYSTEM_ADMIN` (`ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}`). Nhưng theo nghiệp vụ, FINANCE_ADMIN có thể **tạo** version mới (inactive), chỉ không được **activate**.
- **Cần làm**:
  1. Sửa `ProtectedRoute` tại `src/app/system/config/page.tsx` để cho phép cả `FINANCE_ADMIN`.
  2. Trong `SystemConfigContent`, ẩn nút "Activate" nếu role là `FINANCE_ADMIN`.

### 4.6 Header — thiếu badge thông báo chưa đọc

- **File**: `src/app/components/Header.tsx`
- **Yêu cầu N-01**: Badge số thông báo chưa đọc hiển thị trong navbar, cần polling `getUnreadCount()` định kỳ.
- **Cần làm**: Thêm icon chuông + badge vào `Header.tsx`, polling unread count mỗi 30–60 giây.

### 4.7 MyProfileContent — thiếu link / tab hợp đồng (P-02)

- **File**: `src/app/components/employee/MyProfileContent.tsx`
- **Xem chi tiết tại gap 1.6**.

---

## 5. Service còn thiếu

| File cần tạo | Dùng cho | Endpoints chính |
|-------------|---------|-----------------|
| `src/app/services/DeviceService.ts` | DV-01 | `GET /api/devices`, `POST /api/devices`, `POST /api/devices/{id}/api-keys`, `PATCH /api/devices/{id}/api-keys/{keyId}/deactivate` |
| `src/app/services/CheckinLogService.ts` | CL-01 | `GET /api/checkin-logs?employeeId=&from=&to=&page=` |

---

## 6. Lỗi phân quyền

| # | File | Vấn đề | Cần sửa |
|---|------|---------|---------|
| P1 | `src/app/hr/payroll/page.tsx` | HR_ADMIN không có quyền payroll admin | Xóa file (xem gap 2.1) |
| P2 | `src/app/components/finance/FinancePayrollContent.tsx` | Import và sử dụng `approvePayroll` cho FINANCE_ADMIN — sai nghiệp vụ | Xóa `handleApprove` và nút Approve (xem gap 4.2) |
| P3 | `src/app/system/config/page.tsx` | ProtectedRoute chỉ allow SYSTEM_ADMIN; FINANCE_ADMIN không vào được dù có quyền tạo config | Thêm `FINANCE_ADMIN` vào `allowedRoles`, ẩn nút Activate theo role (xem gap 4.5) |

---

## 7. Types còn thiếu trong `src/app/commons/types/index.ts`

| Type | Dùng cho |
|------|---------|
| `CheckinLog` | CL-01 — raw checkin log entity (employeeId, deviceId, logTime, logType: `'IN' \| 'OUT'`) |
| `Device` | DV-01 — thiết bị chấm công (id, name, location, active) |
| `ApiKey` | DV-01 — API key entity (id, rawKey?: string, active, createdAt) |
| `MyContractResponse` | P-02 — hợp đồng active của bản thân (có thể dùng lại `Contract` nếu backend trả cùng shape) |

---

## 8. Gap nghiệp vụ đã được ghi nhận (chưa có backend — để tham khảo)

Theo tài liệu `screen-inventory.md` phần GAP:

**ADJ-01/ADJ-02 — Yêu cầu điều chỉnh chấm công**: Nhân viên submit yêu cầu điều chỉnh (quên check-in/out), HR duyệt → tự động cập nhật Attendance. **Backend chưa có** entity `AttendanceAdjustmentRequest`. Frontend chưa cần làm; cần đồng bộ với team backend khi có API.

---

## Thứ tự ưu tiên đề xuất

| Ưu tiên | Hạng mục |
|---------|---------|
| **Cao** | Gap 2.1 (xóa `/hr/payroll/`), Gap 4.2 (xóa Approve trong FinancePayrollContent), Gap 4.3 (thêm PAY-04/05 UI) |
| **Cao** | Gap 1.5 (N-01 Notifications + Header badge), Gap 4.5 (FINANCE_ADMIN vào System Config) |
| **Trung bình** | Gap 1.1 (AT-02), Gap 1.2 (AT-03), Gap 1.3 (CL-01), Gap 1.4 (DV-01) |
| **Trung bình** | Gap 4.1 (Tax Dependent tab), Gap 1.9 (PAY-06 detail), Gap 1.6 (P-02 My Contract) |
| **Thấp** | Gap 1.10 (C-02 expiring contracts), Gap 4.4 (Director dashboard), Gap 1.8 (PAY-05 batch) |
