# 📅 Kế Hoạch Hoàn Thiện Dự Án HRMS Face-Z (8 Tuần - Revised)

Lộ trình này đã được điều chỉnh để tập trung vào các tính năng kỹ thuật quan trọng như Payroll, Tích hợp máy chấm công và Nghiên cứu kiến trúc Microservices.

---

## 🏗 Giai Đoạn 1: Hoàn Thiện Giao Diện & Dashboard (Tuần 1 - 2)

### Tuần 1: Hoàn thiện UI/UX & Nghiệp vụ Hiện tại
- **Mục tiêu:** Xử lý triệt để các module đã có (Employee, Leave, OT, Department).
- **Công việc:**
    - Xây dựng **Create/Edit Modals** cho toàn bộ 4 module trên (Hiện tại UI mới chỉ có bảng danh sách).
    - Hoàn thiện nghiệp vụ Duyệt/Từ chối đa cấp cho Leave & OT phía Backend.
    - Tích hợp **Form Validation** (Zod) và Thông báo (Toast) hoàn chỉnh.

### Tuần 2: Real-time Dashboard & Analytics
- **Mục tiêu:** Kết nối biểu đồ với dữ liệu thực tế từ Database.
- **Công việc:**
    - Xây dựng API thống kê: Headcount, tỷ lệ đi làm muộn, số đơn phê duyệt đang chờ.
    - Biểu đồ Dashboard: Chuyển dữ liệu Mock sang dữ liệu thật từ API.
    - Hoàn thiện trang **Profile cá nhân** hiển thị tổng hợp mọi thông tin của nhân viên.

---

## 💰 Giai Đoạn 2: Module Lương & Tích hợp Thiết bi (Tuần 3 - 5)

### Tuần 3: Payroll Module (Logic Backend & Engine)
- **Mục tiêu:** Xây dựng hệ thống tính lương tự động.
- **Công việc:**
    - Thiết lập bảng cấu hình lương (Cơ bản, Phụ cấp, Thuế, Bảo hiểm).
    - Viết logic tổng hợp: **(Dữ liệu Chấm công + OT Approved) -> Bảng lương tháng**.
    - API chốt bảng lương và tính toán thu nhập cho từng nhân sự.

### Tuần 4: Payslip PDF & Xuất Báo Cáo
- **Mục tiêu:** Xuất dữ liệu ra các định dạng chuẩn văn phòng.
- **Công việc:**
    - Tích hợp `iText/OpenPDF` xuất **Phiếu lương PDF** gửi cho nhân viên.
    - Tích hợp `Apache POI` xuất **Báo cáo nhân sự/Bảng công Excel** cho HR.
    - UI trang **My Payslip** hiển thị lịch sử nhận lương hàng tháng.

### Tuần 5: Batch Real-time Attendance API
- **Mục tiêu:** Xây dựng cổng tiếp nhận dữ liệu từ Máy chấm công vật lý.
- **Công việc:**
    - Thiết kế API Endpoint chuyên biệt để nhận **Batch Request** từ thiết bị.
    - Xử lý logic đồng bộ dữ liệu số lượng lớn (Batch processing) vào Database nhanh chóng.
    - Cơ chế log lỗi và retry khi dữ liệu từ máy chấm công gửi về bị sai định dạng.

---

## 🔬 Giai Đoạn 3: Nghiên cứu Microservices (Tuần 6 - 7)

### Tuần 6: Tách dịch vụ & Cấu trúc Microservices
- **Mục tiêu:** Chia nhỏ Backend thành các dịch vụ độc lập.
- **Công việc:**
    - Tách logic thành 3 Service chính: **Employee Service**, **Attendance Service**, **Payroll Service**.
    - Triển khai **API Gateway** và **Service Discovery** (Spring Cloud Gateway, Eureka).
    - Cấu hình **Config Server** quản lý cấu hình tập trung.

### Tuần 7: Inter-service Communication & Data Sync
- **Mục tiêu:** Kết nối các dịch vụ rời rạc hoạt động thống nhất.
- **Công việc:**
    - Thiết lập giao tiếp giữa các Service qua **OpenFeign** hoặc **Message Broker** (RabbitMQ/Kafka) để đồng bộ dữ liệu nhân viên sang Attendance/Payroll.
    - Xử lý vấn đề Transaction phân tán (Distributed Transaction) cơ bản.
    - Container hóa từng dịch vụ bằng **Docker**.

---

## 🧪 Giai Đoạn 4: Deployment & Documentation (Tuần 8)

### Tuần 8: Triển khai Demo & Hoàn thiện Hồ sơ
- **Mục tiêu:** Chốt sản phẩm và tài liệu.
- **Công việc:**
    - Deploy hệ thống (Docker Compose) lên môi trường Demo.
    - Viết tài liệu kỹ thuật về kiến trúc Microservices đã triển khai.
    - Quay video Demo các kịch bản: Chấm công vân tay (giả lập batch API) -> Phê duyệt OT -> Tính lương -> Xuất PDF.
    - Hoàn thiện báo cáo tổng kết đồ án.

---

| Tuần | Nhiệm vụ chính | Ghi chú kỹ thuật |
|---|---|---|
| **W1-W2** | Done UI/UX & Dashboard | React Modals & Analytics API |
| **W3-W4** | Payroll & PDF Reports | Logic tính toán & iText Generator |
| **W5** | Device Integration API | Batch API & High-concurrency |
| **W6-W7** | Microservices Migration | Spring Cloud, Eureka, Docker |
| **W8** | Final Ops & Docs | Deploy Demo & Final Report |
