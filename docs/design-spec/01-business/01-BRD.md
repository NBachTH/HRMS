# Tài liệu Yêu cầu Nghiệp vụ (BRD) — FaceZ HRMS

**Phiên bản:** 1.0 | **Ngày:** 16-06-2026 | **Đối tượng:** Stakeholder, nhà tài trợ, product owner
**Liên quan:** [Use Cases](02-use-cases.md) · [Business Rules](03-business-rules.md) · [Process Flows](04-process-flows-bpmn.md)

---

## 1. Mục đích

Tài liệu này nêu *FaceZ HRMS phải đạt được điều gì* cho doanh nghiệp và *tại sao*, độc lập với cách
hiện thực. Đây là bản cam kết giữa tổ chức tài trợ và đội phát triển. Đối tượng kỹ thuật nên đọc
[Tài liệu Kiến trúc Hệ thống](../02-technical/05-system-architecture.md).

## 2. Bối cảnh & Bài toán nghiệp vụ

Một công ty công nghệ quy mô vừa hoạt động theo **luật lao động Việt Nam** đang vận hành HR trên các
công cụ rời rạc: chấm công bằng bảng tính xuất từ máy sinh trắc học, nghỉ phép/OT qua email, tính lương
bằng Excel, hợp đồng nằm trên ổ chia sẻ. Hệ quả:

- **Sai sót và tranh chấp lương** — nhập tay dữ liệu chấm công vào bảng lương; không có vết kiểm toán;
  bảo hiểm bắt buộc và thuế TNCN tính tay theo các mức luật thay đổi liên tục.
- **Duyệt chậm, thiếu minh bạch** — duyệt nghỉ phép/OT thất lạc trong email, không lưu ai duyệt, lúc nào.
- **Không tách bạch trách nhiệm** — một người có thể vừa tính vừa duyệt lương, rủi ro tuân thủ.
- **Rủi ro pháp lý** — số liệu nộp BHXH/BHYT/BHTN và thuế TNCN không thể tái lập hay kiểm toán.

FaceZ HRMS hợp nhất tất cả vào một hệ thống: **chấm công nhận diện khuôn mặt → bảng công → duyệt đa cấp
→ tính lương tách bạch vai trò → báo cáo tài chính**, kèm vết kiểm toán đầy đủ.

## 3. Mục tiêu nghiệp vụ (đo lường được)

| # | Mục tiêu | Hiện trạng (thủ công) | Đích đến |
|---|----------|------------------------|----------|
| O1 | Loại bỏ nhập tay dữ liệu chấm công | 100% thủ công | 100% từ thiết bị, bảng công tự tính |
| O2 | Giảm thời gian chuẩn bị lương mỗi kỳ | ~3 ngày | < 4 giờ cho một lần chạy batch toàn công ty |
| O3 | Tách bạch trách nhiệm trên payroll | không có | Tính (Finance) và duyệt (Director) là vai trò khác nhau, hệ thống enforce |
| O4 | Mọi quyết định duyệt đều truy vết được | chỉ email | 100% quyết định leave/OT/payroll có actor + timestamp |
| O5 | An toàn khi thay đổi mức luật | hard-code trong Excel | Config hiệu lực theo ngày; đổi mức = version mới, không sửa code |
| O6 | Tự phục vụ cho nhân viên | qua HR | Nhân viên tự xem chấm công, phiếu lương, số dư phép, gửi yêu cầu |

## 4. Các bên liên quan & Người dùng

| Bên liên quan | Mối quan tâm | Vai trò hệ thống |
|---------------|--------------|------------------|
| Nhân viên | Gửi leave/OT, xem chấm công & phiếu lương | `EMPLOYEE` |
| Trưởng nhóm | Duyệt cấp 1 cho nhóm | `LEADER` |
| Trưởng bộ phận | Duyệt cấp 2, giám sát phòng ban | `MANAGER` |
| Quản trị HR | Vòng đời nhân sự, hợp đồng, chốt công, duyệt cuối leave/OT | `HR_ADMIN` |
| Quản trị Tài chính | Tính lương, quản lý config pháp lý, báo cáo | `FINANCE_ADMIN` |
| Giám đốc | Phê duyệt (duyệt/từ chối) lương | `DIRECTOR` |
| Quản trị Hệ thống | Cấu hình hệ thống, quản trị tài khoản, override | `SYSTEM_ADMIN` |
| Máy chấm công | Đẩy dữ liệu chấm công (actor máy) | Device API key (`DEVICE_CHECKIN`) |

## 5. Phạm vi

### 5.1 Trong phạm vi
- Quản lý nhân viên, phòng ban, tài khoản người dùng.
- Vòng đời hợp đồng có lịch sử (hiệu lực theo ngày, một hợp đồng hiện hành mỗi nhân viên).
- **Chấm công** nhận diện khuôn mặt qua thiết bị; log thô → chấm công ngày → **bảng công/timesheet** đối soát;
  **chốt kỳ** hằng tháng.
- Yêu cầu **nghỉ phép** và **OT** với duyệt đa cấp và theo dõi số dư phép.
- **Tính lương** (đơn + batch), duyệt maker-checker, phiếu lương, và **báo cáo tài chính**
  (chi phí lao động, đối chiếu bảo hiểm, tổng hợp thuế TNCN).
- **Cấu hình pháp lý hiệu lực theo ngày** (bậc lương, phụ cấp, biểu thuế TNCN, tỷ lệ bảo hiểm).
- **Thông báo** trong ứng dụng cho các sự kiện quan trọng.
- **Lịch nghỉ lễ** và **người phụ thuộc thuế** ảnh hưởng tới lương.

### 5.2 Ngoài phạm vi (bản nền hiện tại)
- Tuyển dụng / quản lý ứng viên; quy trình đánh giá hiệu suất ngoài đầu vào KPI cho lương.
- Sinh file ngân hàng / thực thi chi trả (lương được đánh dấu *đã trả*; chuyển khoản thực hiện bên ngoài).
- App mobile native (frontend web responsive nhưng không đóng gói app).
- Bản thân việc nhận diện khuôn mặt — thiết bị tự nhận diện và gửi `employeeId`; FaceZ thu nhận kết quả,
  không chạy mô hình sinh trắc.
- Multi-company / multi-tenant; triển khai cho một tổ chức.

## 6. Giả định & Ràng buộc

- **Phạm vi pháp lý:** luật lao động VN; tiền tệ VND; giờ địa phương cho kỳ lương.
- **Mức luật thay đổi theo thời gian** và phải biểu diễn được mà không cần redeploy (config hiệu lực theo ngày).
- **Kết nối:** thiết bị có thể tạm offline và phải **upload batch** các lần chấm công đã đệm.
- **Một hợp đồng hiện hành mỗi nhân viên**, giữ đầy đủ lịch sử.
- **Tách bạch trách nhiệm** bắt buộc cho payroll (tính ≠ duyệt).
- Nền tảng công nghệ cố định: backend Spring Boot (Java 21), frontend Next.js (React), PostgreSQL, Redis.

## 7. Yêu cầu chức năng cấp cao

| ID | Yêu cầu | Mục tiêu |
|----|---------|----------|
| FR-1 | HR tạo/sửa/vô hiệu nhân viên, phòng ban, tài khoản | O6 |
| FR-2 | Thiết bị đẩy sự kiện chấm công; hệ thống tự dựng chấm công ngày và bảng công | O1 |
| FR-3 | Nhân viên gửi leave/OT; định tuyến Leader → Manager → HR duyệt | O4 |
| FR-4 | Đơn nghỉ kiểm tra và trừ số dư phép năm theo loại | O4 |
| FR-5 | HR chốt kỳ chấm công; kỳ đã chốt bất biến với payroll | O1 |
| FR-6 | Finance tính lương theo nhân viên hoặc batch toàn công ty từ config hiện hành | O2 |
| FR-7 | Director duyệt/từ chối lương đã gửi; Finance đánh dấu lương đã duyệt là đã trả | O3 |
| FR-8 | Hệ thống tính bảo hiểm và thuế TNCN từ config hiệu lực theo ngày | O5 |
| FR-9 | Finance sinh báo cáo chi phí lao động, đối chiếu bảo hiểm, tổng hợp thuế (xuất CSV) | O5 |
| FR-10 | Nhân viên xem chấm công, số dư phép, yêu cầu, phiếu lương của mình | O6 |
| FR-11 | Thay đổi config được version hóa, hiệu lực theo ngày, duyệt maker-checker | O5 |
| FR-12 | Sự kiện quan trọng phát thông báo trong app tới người dùng liên quan | O4 |

## 8. Yêu cầu phi chức năng (góc nhìn nghiệp vụ)

| ID | Hạng mục | Yêu cầu |
|----|----------|---------|
| NFR-1 | Bảo mật | Truy cập có xác thực; phân quyền theo vai trò; tách bạch trách nhiệm trên payroll |
| NFR-2 | Khả năng kiểm toán | Lưu actor + timestamp tạo/sửa trên entity; quyết định duyệt truy vết được |
| NFR-3 | Tuân thủ | Tính toán pháp lý tái lập được cho mọi kỳ lịch sử từ config khi đó |
| NFR-4 | Khả dụng | Chịu được thiết bị mất kết nối tạm thời nhờ đệm offline + upload batch |
| NFR-5 | Hiệu năng | Batch lương toàn công ty chạy bất đồng bộ, không chặn người vận hành |
| NFR-6 | Toàn vẹn dữ liệu | Một hợp đồng hiện hành/nhân viên; một bản chấm công/nhân viên/ngày; một payroll/nhân viên/kỳ |
| NFR-7 | Khả dụng (UX) | Nhân viên tự phục vụ các tác vụ thông thường không cần HR |

## 9. Tiêu chí thành công

Dự án đạt mục tiêu khi: một chu kỳ tháng đầy đủ (chốt công → batch lương → Director duyệt → phiếu lương
+ báo cáo pháp lý) chạy thông suốt trên dữ liệu thiết bị thật, mọi quyết định duyệt và tính toán đều
kiểm toán và tái lập được, và mức luật thay đổi được chỉ qua cấu hình.

## 10. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
|-----------|---------|
| BHXH / BHYT / BHTN | Bảo hiểm Xã hội / Y tế / Thất nghiệp |
| PIT | Thuế thu nhập cá nhân (TNCN) |
| KPI1 / KPI2 | Hệ số hiệu suất (A/B/C thủ công) / hệ số từ chấm công, đầu vào tính lương |
| Chốt kỳ | Khóa chấm công một tháng để không đổi sau khi tính lương |
| Maker-checker | Một vai trò chuẩn bị (maker), vai trò khác phê duyệt (checker) |
| Config hiệu lực theo ngày | Một version cấu hình có hiệu lực từ một ngày, chọn theo kỳ lương |
| Bảng công / timesheet | Bản ghi ngày đối soát gộp chấm công, nghỉ phép và ngày lễ |
