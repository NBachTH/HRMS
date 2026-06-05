**ĐẠI HỌC BÁCH KHOA HÀ NỘI**  
**TRƯỜNG CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG**

### PHIẾU GIAO NHIỆM VỤ ĐỒ ÁN TỐT NGHIỆP HỆ CỬ NHÂN
**KỲ 20252**

#### Thông tin về sinh viên
| | | | |
| :--- | :--- | :--- | :--- |
| **Họ và tên sinh viên:** | Vũ Thu Trang | **MSSV:** | 20225232 |
| **Điện thoại liên lạc:** | 389470788 | **Lớp:** | Kỹ thuật máy tính 04-K67 |
| **Email:** | trang.vt225232@sis.hust.edu.vn | **Mã lớp:** | IT2-04-K67 |

#### Thông tin giáo viên hướng dẫn
| | |
| :--- | :--- |
| **Họ và tên GVHD:** | Nguyễn Thị Thanh Nga |
| **Đồ án được thực hiện tại:** | Trường Công nghệ thông tin và truyền thông |
| **Thời gian làm ĐATN:** | Từ ngày 9/3/2026 đến ngày 24/07/2026 |

---

#### 1. Tên đề tài:
**Hệ thống quản lý chung cư**

#### 2. Lĩnh vực đề tài:
*   **Lựa chọn 1:** Phần mềm doanh nghiệp
*   **Lựa chọn 2:** 
*   **Lựa chọn 3:** 
*   Nếu lĩnh vực không nằm trong danh sách có sẵn, giáo viên hướng dẫn có thể đề xuất:

#### 3. Mục tiêu của ĐATN:
**3.1. Kiến thức sinh viên thu thập được:**
*   Làm chủ quy trình phát triển phần mềm toàn diện: Từ phân tích yêu cầu nghiệp vụ, thiết kế và phân tích hệ thống, xây dựng cơ sở dữ liệu PostgreSQL cho đến triển khai mã nguồn thực tế trên cả ba nền tảng: Backend, Web và Mobile App.
*   Thiết kế và chuẩn hóa hệ thống RESTful API đảm bảo sự đồng bộ và toàn vẹn dữ liệu thời gian thực giữa Backend Django với Frontend (ReactJS) và ứng dụng di động (React Native).
*   Thiết kế hệ thống bảo mật đa tầng: Triển khai cơ chế xác thực JWT (Access/Refresh Token), phân quyền vai trò (RBAC) chặt chẽ và ứng dụng giao thức OAuth2 trong việc kết nối an toàn với dịch vụ Google Mail để thực hiện quy trình khôi phục mật khẩu.
*   Phát triển ứng dụng di động đa nền tảng và thanh toán số: Sử dụng React Native (TypeScript) và framework Expo để tối ưu hiệu năng ứng dụng cho cư dân, đồng thời tích hợp thành công giải pháp tự động hóa thanh toán qua mã QR (SePay).
*   Tối ưu hóa hiệu năng và xử lý tác vụ nền: Lập lịch định kỳ với Celery, sử dụng Redis làm Message Broker và bộ nhớ đệm (Cache) để giảm tải cho cơ sở dữ liệu, đảm bảo hệ thống vận hành mượt mà với lượng dữ liệu lớn.
*   Quản trị vận hành và bảo mật: Triển khai cơ chế Logging toàn diện để theo dõi vết hoạt động và thiết lập các lớp bảo mật chống tấn công phổ biến (SQL Injection, XSS/CSRF), đảm bảo an toàn và khả năng phục hồi của hệ thống.

**3.2. Công nghệ sinh viên thu thập được:**
*   **Backend:** Django, Django REST Framework (DRF), Django Signals, Python-dotenv, Celery.
*   **Frontend Web:** React, SCSS, Axios, Chart.js, React Router, Redux Toolkit.
*   **Mobile App:** React Native, Expo, TypeScript, Async Storage, React Navigation, Redux Toolkit.
*   **Bảo mật:** JWT với SimpleJWT, Role-based Access Control (RBAC), OAuth2 (kết nối an toàn Google Mail SMTP), Password Reset via Email.
*   **Cơ sở dữ liệu & Cache:** PostgreSQL, Redis cache.
*   **Thanh toán:** SePay API (Tự động hóa thanh toán QR Code).
*   **Lưu trữ Multimedia:** Cloudinary

**3.3. Kỹ năng sinh viên phát triển được:**
*   **Kỹ năng phân tích yêu cầu và thiết kế hệ thống:** Chuyển đổi các nghiệp vụ quản lý chung cư thành mô hình dữ liệu và luồng xử lý logic, đảm bảo tính nhất quán trên cả hai nền tảng Web và Mobile.
*   **Kỹ năng thiết kế cơ sở dữ liệu quan hệ:** Làm chủ kỹ thuật thiết kế Database trên PostgreSQL, xử lý các quan hệ phức tạp, đảm bảo toàn vẹn dữ liệu và khả năng mở rộng hệ thống.
*   **Kỹ năng xây dựng luồng bảo mật và xác thực:** Triển khai hoàn chỉnh cơ chế JWT (Access/Refresh Token), quy trình khôi phục mật khẩu qua Email và hệ thống phân quyền vai trò (RBAC), bảo mật phòng chống tấn công web.
*   **Kỹ năng phát triển ứng dụng đa nền tảng:** Xây dựng giao diện bằng React và ứng dụng di động cho cư dân bằng React Native (TypeScript/Expo), áp dụng Redux Toolkit để quản lý trạng thái.
*   **Kỹ năng tích hợp dịch vụ và triển khai thực tế:** Kết nối các dịch vụ bên thứ ba (SePay API cho thanh toán QR, Cloudinary cho lưu trữ multimedia) và đưa sản phẩm từ môi trường phát triển lên vận hành thực tế.
*   **Kỹ năng kiểm thử và giải quyết vấn đề (Debug):** Thành thạo việc kiểm thử API, theo dõi luồng dữ liệu liên thông giữa Web - App và xử lý các lỗi phát sinh trong quá trình đồng bộ hóa dữ liệu.

**3.4. Sản phẩm kỳ vọng:**
*   Hệ thống vận hành ổn định trên môi trường máy chủ thực tế, đảm bảo khả năng xử lý đồng thời các yêu cầu từ Ban quản lý (Web) và Cư dân (Mobile) với độ trễ thấp và tính toàn vẹn dữ liệu cao.
*   Sản phẩm đáp ứng trải nghiệm người dùng đồng nhất trên đa thiết bị: Giao diện Web tối ưu cho quản trị viên và ứng dụng di động mượt mà, trực quan dành riêng cho cư dân.
*   Đảm bảo an toàn thông tin thông qua cơ chế bảo mật, xác thực mạnh, phân quyền chặt chẽ; các tính năng như thanh toán qua mã QR và gửi thông báo được thực hiện chính xác theo thời gian thực.
*   Khả năng mở rộng và Bảo trì: Hệ thống được xây dựng trên cấu trúc mã nguồn chuẩn hóa, giúp dễ dàng nâng cấp, sửa chữa trong tương lai.

**3.5. Vấn đề thực tiễn đồ án giải quyết:**
*   Chuyển đổi toàn bộ việc quản lý căn hộ, cư dân, phương tiện và hóa đơn từ cách tính thủ công sang hệ thống quản lý tập trung, giúp giảm thiểu sai sót và thất thoát dữ liệu.
*   Chuẩn hóa quy trình tính toán và thu phí hàng tháng thông qua giải pháp thanh toán QR Code, giúp cập nhật trạng thái hóa đơn tức thì và minh bạch hóa các khoản thu.
*   Tối ưu hóa tương tác, rút ngắn khoảng cách tiếp nhận và xử lý kiến nghị, đảm bảo mọi ý kiến của cư dân đều được ghi nhận, theo dõi tiến độ và phản hồi kịp thời.
*   Xây dựng nền tảng số giúp truyền tải đầy đủ các thông tin vận hành, quy định và tiện ích của tòa nhà đến cư dân một cách tập trung.
*   Cư dân có thể dễ dàng tiếp nhận các thông báo quan trọng từ Ban quản lý trực tiếp trên giao diện ứng dụng theo thời gian thực.

#### 4. Các nội dung sẽ thực hiện và kế hoạch triển khai:
*Lưu ý: khối lượng yêu cầu đối với đồ án tốt nghiệp hệ cử nhân là 6(0-0-12-12), i.e. 12 tiết làm việc/tuần trong 17 tuần.*

**Nội dung 1: Tìm hiểu tổng quan về bài toán**, từ **Tuần 1** đến **Tuần 4**
*Chi tiết:*
*   Nghiên cứu các hệ thống quản lý chung cư thông minh phổ biến.
*   Tìm hiểu quy trình vận hành chung cư trong thực tế.
*   Xác định các tính năng cốt lõi: quản lý căn hộ, quản lý cư dân, quản lý khoản phí, quản lý phương tiện, quản lý kiến nghị, quản lý thông báo, quản lý tiện ích, quản lý tài sản/tài liệu, quản lý tài khoản.

**Nội dung 2: Tìm hiểu tổng quan về công nghệ liên quan**, từ **Tuần 2** đến **Tuần 5**
*Chi tiết:*
*   Tìm hiểu React, React Router và Redux Toolkit để xây dựng Web.
*   Tìm hiểu React Native, Expo và TypeScript để phát triển ứng dụng di động cho cư dân.
*   Tìm hiểu Django REST Framework và SimpleJWT để xây dựng API và phân quyền (RBAC).
*   Tìm hiểu PostgreSQL để thiết kế cơ sở dữ liệu quan hệ và Cloudinary để lưu trữ multimedia.
*   Tìm hiểu cơ chế SMTP qua OAuth2 để gửi mail reset mật khẩu tài khoản và SePay API để tự động hóa thanh toán.

**Nội dung 3: Phân tích thiết kế**, từ **Tuần 5** đến **Tuần 9**
*Chi tiết:*
*   Xây dựng biểu đồ Use case cho 4 tác nhân: Cư dân, Khách thuê, Admin và Superadmin.
*   Xây dựng biểu đồ trình tự cho mỗi usecase.
*   Xây dựng biểu đồ lớp phân tích cho từng module quản lý.
*   Thiết kế kiến trúc phân tầng cho hệ thống.
*   Thiết kế chi tiết lớp theo mô hình MVC.
*   Thiết kế cơ sở dữ liệu quan hệ.
*   Thiết kế mockup giao diện.

**Nội dung 4: Xây dựng chương trình**, từ **Tuần 8** đến **Tuần 15**
*Chi tiết:*
*   Xây dựng hệ thống các API services.
*   Xây dựng các module quản lý, phân quyền và xác thực.
*   Xây dựng quy trình tự động hóa thanh toán hóa đơn qua SePay API.
*   Xây dựng giao diện Web cho cư dân và ban quản trị.
*   Xây dựng ứng dụng di động cho cư dân.
*   Xây dựng hệ thống xử lý tác vụ ngầm: Cấu hình Celery và Redis.
*   Triển khai cơ chế Logging.
*   Thực hiện các biện pháp bảo mật: Chống tấn công XSS/CSRF và SQL Injection.

**Nội dung 5: Thử nghiệm và đánh giá**, từ **Tuần 10** đến **Tuần 17**
*Chi tiết:*
*   Kiểm thử API qua Postman: kiểm tra các trường hợp hợp lệ, không hợp lệ và phân quyền người dùng.
*   Kiểm thử luồng thanh toán: xác minh việc tự động thanh toán khi có biến động số dư qua SePay.
*   Kiểm thử trải nghiệm người dùng trên Mobile.
*   Triển khai lên môi trường vận hành thực tế.

---

#### 5. Lời cam đoan của sinh viên đã nhận được nhiệm vụ
Em xin cam kết sẽ hoàn thành các nhiệm vụ theo đúng kế hoạch.

*Hà Nội, ngày...... tháng...... năm......*
**Sinh viên**
*(Ký và ghi rõ họ tên)*

*(Đã ký)*
**Vũ Thu Trang**

#### 6. Xác nhận của giáo viên hướng dẫn về việc giao nhiệm vụ cho sinh viên
*Hà Nội, ngày...... tháng...... năm......*
**Giảng viên hướng dẫn**
*(Ký và ghi rõ họ tên)*

*(Đã ký)*
**Nguyễn Thị Thanh Nga**