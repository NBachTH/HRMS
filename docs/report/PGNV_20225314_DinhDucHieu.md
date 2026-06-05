# ĐẠI HỌC BÁCH KHOA HÀ NỘI
## TRƯỜNG CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG

### PHIẾU GIAO NHIỆM VỤ ĐỒ ÁN TỐT NGHIỆP HỆ CỬ NHÂN
**KỲ 20252**

#### Thông tin về sinh viên
*   **Họ và tên sinh viên:** Đinh Đức Hiếu
*   **MSSV:** 20225314
*   **Điện thoại liên lạc:** 856596998
*   **Lớp:** Kỹ thuật máy tính 02 - K67
*   **Email:** Hieu.DD225314@sis.hust.edu.vn
*   **Mã lớp:** IT2-02

#### Thông tin giáo viên hướng dẫn
*   **Họ và tên GVHD:** Nguyễn Thị Thanh Nga
*   **Đồ án được thực hiện tại:** Trường Công nghệ thông tin và Truyền thông
*   **Thời gian làm ĐATN:** Từ ngày 23/2/2026 đến ngày 30/6/2026

---

#### 1. Tên đề tài:
Thiết kế và xây dựng hệ thống cảnh báo sạt lở đất thời gian thực

#### 2. Lĩnh vực đề tài:
*   **Lựa chọn 1:** AIoT

#### 3. Mục tiêu của ĐATN:

**3.1. Kiến thức sinh viên thu thập được:**
*   Nắm vững kiến thức về cảm biến, vi điều khiển và kiến trúc hệ thống nhúng IoT ứng dụng trong quan trắc môi trường.
*   Phát triển các thành phần của một hệ thống ứng dụng trên nền Web hiện đại (frontend, backend, database, realtime, websocket, AI).
*   Cách phân tích các yêu cầu của hệ thống, luồng hoạt động và các vấn đề liên quan.

**3.2. Công nghệ sinh viên thu thập được:**
*   **Công nghệ IoT:**
    *   Sử dụng vi điều khiển ESP32 lập trình bằng C++ để thu thập dữ liệu từ cảm biến.
    *   Áp dụng thuật toán băm SHA-256 nhằm đảm bảo tính toàn vẹn và bảo mật của dữ liệu truyền đi.
    *   Sử dụng công nghệ LoRa để truyền dữ liệu giữa các node không có kết nối Internet và Gateway.
    *   Áp dụng giao thức MQTT để truyền dữ liệu thời gian thực từ Gateway tới Backend Server.
*   **Công nghệ Web Frontend:**
    *   Sử dụng Next.js (App Router), React, và TypeScript để xây dựng giao diện người dùng.
    *   Sử dụng Tailwind CSS kết hợp với các component UI từ shadcn/ui để phát triển giao diện nhanh và nhất quán.
    *   Tích hợp thư viện biểu đồ (Recharts) để hiển thị dữ liệu cảm biến.
    *   Sử dụng Leaflet để hiển thị bản đồ và vị trí thiết bị.
    *   Sử dụng Socket.IO Client để cập nhật dữ liệu thời gian thực.
*   **Công nghệ phát triển Backend:**
    *   Xây dựng hệ thống Backend bằng Node.js và Express theo mô hình REST API.
    *   Sử dụng PostgreSQL để lưu trữ dữ liệu và Redis cho caching và quản lý session.
    *   Tích hợp MQTT client để nhận dữ liệu từ Gateway.
    *   Sử dụng Socket.IO để truyền dữ liệu realtime tới frontend.
    *   Áp dụng JWT và bcrypt để xác thực và bảo mật người dùng.
    *   Sử dụng node-cron để giám sát trạng thái thiết bị theo lịch.
*   **Công nghệ Trí tuệ nhân tạo (AI/ML):**
    *   Sử dụng Python kết hợp với thư viện scikit-learn.
    *   Áp dụng mô hình Random Forest để phân loại mức độ cảnh báo (SAFE, WARNING, DANGER).
*   **Dịch vụ bên thứ ba và tích hợp:**
    *   Sử dụng SendGrid để gửi email cảnh báo.
    *   Sử dụng bản đồ nền từ OpenStreetMap.
*   **Triển khai hệ thống lên cloud:**
    *   Sử dụng Neon PostgreSQL để triển khai cơ sở dữ liệu.
    *   Backend Server được triển khai trên Render.
    *   Frontend được triển khai trên Vercel.
    *   Sử dụng HiveMQ để triển khai broker MQTT.

**3.3. Kỹ năng sinh viên phát triển được:**
*   Thiết kế và xây dựng hệ thống IoT: thu thập dữ liệu từ cảm biến, truyền dữ liệu qua LoRa và xử lý tại Gateway.
*   Xây dựng hệ thống Backend: phát triển REST API, xử lý dữ liệu thời gian thực thông qua MQTT và Socket.IO.
*   Phát triển giao diện Web: xây dựng dashboard hiển thị dữ liệu cảm biến, biểu đồ và bản đồ trực quan.
*   Làm việc với cơ sở dữ liệu: thiết kế và quản lý dữ liệu bằng PostgreSQL, tối ưu truy vấn và lưu trữ.
*   Triển khai hệ thống lên môi trường cloud: đưa hệ thống vào hoạt động thực tế, đảm bảo khả năng truy cập từ xa và hoạt động ổn định.
*   Xây dựng và tích hợp mô hình AI: sử dụng mô hình học máy để phân loại mức độ cảnh báo (SAFE, WARNING, DANGER).
*   Xử lý hệ thống thời gian thực: đồng bộ dữ liệu giữa các thành phần IoT, Backend và Frontend.
*   Xử lý lỗi hệ thống: xác định và khắc phục lỗi giữa các thành phần như thiết bị, mạng truyền thông và server.
*   Phân tích và giải quyết vấn đề: đưa ra phương án tối ưu trong quá trình thiết kế và triển khai hệ thống.

**3.4. Sản phẩm kỳ vọng:**
*   **Xây dựng hệ thống giám sát và cảnh báo sạt lở dựa trên nền tảng IoT**, cho phép thu thập và phân tích dữ liệu cảm biến theo thời gian thực.
*   **Mô hình phần cứng IoT:**
    *   Hệ thống các thiết bị Node (sử dụng vi điều khiển ESP32, module giao tiếp LoRa và các cảm biến đo lường gồm độ ẩm đất, lượng mưa, góc, rung).
    *   Thiết bị Gateway (sử dụng vi điều khiển ESP32 và module giao tiếp LoRa) làm nhiệm vụ thu thập dữ liệu từ các Node và truyền tải lên máy chủ.
*   **Hệ thống Backend Server & API:**
    *   Máy chủ xử lý lưu trữ dữ liệu và gọi API module AI theo thời gian thực từ Gateway thông qua giao thức MQTT.
    *   Hệ thống RESTful API phục vụ việc quản lý thiết bị, lưu trữ dữ liệu cảm biến và xác thực người dùng.
*   **Ứng dụng Web Quản trị và Giám sát:**
    *   Dashboard trực quan: Hiển thị dữ liệu cảm biến theo thời gian thực (biểu đồ, trạng thái hoạt động của thiết bị).
    *   Bản đồ định vị: Tích hợp bản đồ hiển thị vị trí các node và phân vùng cảnh báo theo khu vực địa lý.
    *   Hệ thống cảnh báo: Gửi thông báo ngay lập tức tới người dùng khi hệ thống phát hiện dấu hiệu bất thường.
    *   Giao diện cho phép cấu hình, thêm/sửa/xóa các thiết bị phần cứng và tra cứu lịch sử dữ liệu.
*   **Module Trí tuệ nhân tạo:**
    *   Mô hình học máy được huấn luyện để phân tích chuỗi dữ liệu cảm biến và phân loại mức độ rủi ro (SAFE, WARNING, DANGER).
    *   Thuật toán hỗ trợ dự báo và phát hiện sớm các nguy cơ tiềm ẩn.
*   **Hạ tầng triển khai:**
    *   Toàn bộ hệ thống (Web, Backend, Database) được đóng gói và vận hành ổn định trên môi trường Điện toán đám mây (Cloud), đảm bảo khả năng truy cập từ xa và hoạt động liên tục 24/7 qua Internet.

**3.5. Vấn đề thực tiễn đồ án giải quyết:**
*   Giải quyết vấn đề sạt lở đất thường xảy ra bất ngờ, gây thiệt hại lớn về người và tài sản trong thực tế.
*   Khắc phục hạn chế của các hệ thống giám sát truyền thống:
    *   Cung cấp dữ liệu theo thời gian thực.
    *   Triển khai tại các khu vực địa hình phức tạp, thiếu kết nối Internet thông qua công nghệ LoRa.
    *   Tự động phân tích và đưa ra cảnh báo thông qua mô hình AI.
    *   Giám sát từ xa thông qua ứng dụng Web.

---

#### 4. Các nội dung sẽ thực hiện và kế hoạch triển khai:
*Lưu ý: khối lượng yêu cầu đối với đồ án tốt nghiệp hệ cử nhân là 6(0-0-12-12), i.e. 12 tiết làm việc/tuần trong 17 tuần.*

**Nội dung 1: Tìm hiểu tổng quan về bài toán** (từ Tuần 1 đến Tuần 2)
*   Khảo sát thực trạng các phương pháp giám sát sạt lở hiện nay (thủ công và sử dụng cảm biến).
*   Phân tích các hạn chế của hệ thống hiện tại (không liên tục, thiếu kết nối Internet, thiếu cảnh báo sớm).
*   Nghiên cứu các công nghệ áp dụng: IoT (ESP32), LoRa, MQTT, Web (Frontend/Backend), AI.
*   Xác định yêu cầu chức năng: Thu thập, lưu trữ, hiển thị dữ liệu, bản đồ, cảnh báo.
*   Xác định yêu cầu phi chức năng: Hoạt động ổn định, độ trễ thấp, khả năng mở rộng.

**Nội dung 2: Tìm hiểu tổng quan về công nghệ liên quan** (từ Tuần 3 đến Tuần 4)
*   **Công nghệ IoT:** ESP32 thu thập dữ liệu; LoRa truyền dữ liệu tầm xa; MQTT truyền dữ liệu lên Backend Server.
*   **Công nghệ Backend:** Node.js, Express xây dựng REST API.
*   **Cơ sở dữ liệu:** PostgreSQL lưu trữ dữ liệu cảm biến và lịch sử cảnh báo.
*   **Công nghệ Frontend:** React và Next.js xây dựng giao diện; Socket.IO hỗ trợ realtime.
*   **Công nghệ AI:** scikit-learn và mô hình Random Forest để phân loại mức độ cảnh báo.

**Nội dung 3: Phân tích thiết kế** (từ Tuần 5 đến Tuần 8)
*   **Thiết kế kiến trúc tổng thể:** Mô hình Client-Server kết hợp kiến trúc IoT nhiều tầng (Thu thập, Truyền dẫn, Xử lý, Hiển thị).
*   **Thiết kế cơ sở dữ liệu:** PostgreSQL với các bảng chính (Device, Node, SensorDataHistory, Alert, User).
*   **Thiết kế luồng dữ liệu:**
    1.  Cảm biến thu thập dữ liệu.
    2.  Node gửi dữ liệu qua LoRa đến Gateway.
    3.  Gateway so sánh ngưỡng và gửi dữ liệu lên MQTT.
    4.  Backend nhận, xử lý và lưu vào DB.
    5.  Mô hình AI phân tích và xác định mức cảnh báo.
    6.  Backend gửi dữ liệu và cảnh báo realtime tới frontend.
*   **Thiết kế API và giao tiếp:** Các RESTful API và Socket.IO cho realtime.
*   **Thiết kế giao diện người dùng:** Dashboard, bản đồ, trang quản lý thiết bị, cảnh báo, lịch sử và tài khoản.

**Nội dung 4: Xây dựng chương trình** (từ Tuần 9 đến Tuần 15)
*   **Xây dựng hệ thống IoT:** Lập trình ESP32 (C++), mã hóa SHA-256, truyền nhận dữ liệu qua LoRa và MQTT.
*   **Xây dựng Backend:** Triển khai API bằng Node.js/Express, module xử lý dữ liệu, PostgreSQL, Socket.IO, SendGrid.
*   **Xây dựng Frontend:** Phát triển Dashboard, trang quản lý cảnh báo, tích hợp bản đồ OpenStreetMap, các trang chức năng (CRUD node, lịch sử, tài khoản), Socket.IO client.
*   **Tích hợp mô hình AI:** Chuẩn bị tập dữ liệu (thực tế và giả lập), huấn luyện mô hình Random Forest, xây dựng AI service riêng biệt giao tiếp qua API.

**Nội dung 5: Thử nghiệm và đánh giá** (từ Tuần 16 đến Tuần 17)
*   **Kiểm tra các chức năng chính:** Thu thập dữ liệu, hiển thị, quản lý thiết bị, xử lý cảnh báo.
*   **Kiểm tra API Backend:** Độ chính xác dữ liệu và khả năng chịu tải (nhiều request đồng thời).
*   **Thử nghiệm hệ thống IoT:** Khả năng thu thập của node, độ ổn định truyền dẫn LoRa và MQTT.
*   **Thử nghiệm realtime:** Độ trễ cập nhật Dashboard và hiển thị cảnh báo tức thời.
*   **Thử nghiệm mô hình AI:** Đánh giá độ chính xác phân loại (SAFE, WARNING, DANGER).
*   **Thử nghiệm triển khai:** Kiểm tra hoạt động ổn định trên môi trường Cloud (Neon, Render, Vercel, HiveMQ).

---

#### 5. Lời cam đoan của sinh viên đã nhận được nhiệm vụ
Em xin cam kết sẽ hoàn thành các nhiệm vụ theo đúng kế hoạch.

*Hà Nội, ngày 19 tháng 04 năm 2026*
**Sinh viên**
*(Ký và ghi rõ họ tên)*

**Đinh Đức Hiếu**

---

#### 6. Xác nhận của giáo viên hướng dẫn về việc giao nhiệm vụ cho sinh viên
*Hà Nội, ngày ... tháng ... năm ...*
**Giảng viên hướng dẫn**
*(Ký và ghi rõ họ tên)*

**Nguyễn Thị Thanh Nga**