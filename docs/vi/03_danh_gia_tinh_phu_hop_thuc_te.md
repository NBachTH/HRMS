# FaceZ HRMS — Đánh Giá Tính Phù Hợp Thực Tế
### Đánh Giá Mức Độ Sẵn Sàng Triển Khai Sản Xuất
**Phiên bản:** 1.0 | **Ngày:** 10-04-2026 | **Người phân tích:** Claude Code

---

## 1. Tóm Tắt Đánh Giá

FaceZ HRMS là hệ thống được thiết kế tốt và triển khai nhất quán cho công ty công nghệ vừa và nhỏ hoạt động theo luật lao động Việt Nam. Bộ máy tính lương cốt lõi có kỹ thuật tinh vi và bao phủ các yêu cầu tuân thủ HR phức tạp nhất (khấu trừ BHXH/BHYT/BHTN, thuế TNCN lũy tiến, chấm điểm KPI nhiều cấp, hệ số nhân OT). Mã nguồn tuân theo nguyên tắc kiến trúc phân lớp rõ ràng xuyên suốt.

Tuy nhiên, hệ thống có một số **thiếu sót nghiêm trọng** sẽ ngăn triển khai an toàn trong môi trường tính lương sản xuất. Đây không phải là lỗi nhỏ — chúng là các tính năng còn thiếu, lỗ hổng kiểm toán và rủi ro toàn vẹn dữ liệu cần được giải quyết trước khi hệ thống có thể được sử dụng để chi lương thực tế.

**Kết luận chung: Chưa sẵn sàng sản xuất.** Hệ thống phù hợp cho môi trường phát triển hoặc thí điểm. Khoảng 60–70% yêu cầu sản xuất đã được đáp ứng. Các thiếu sót còn lại được xác định rõ ràng và có thể triển khai với nỗ lực tập trung.

---

## 2. Chấm Điểm Theo Lĩnh Vực

| Lĩnh vực                  | Điểm | Nhận xét                                                |
|---------------------------|:----:|---------------------------------------------------------|
| Xác thực & Bảo mật        | 7/10 | Thiết kế JWT + Redis vững chắc; thiếu sót cấu hình     |
| Quản lý nhân viên         | 6/10 | CRUD cơ bản hoạt động; thiếu tiếp nhận/thôi việc       |
| Theo dõi chấm công        | 4/10 | Nhập nhật ký hoạt động; thiếu xử lý tự động            |
| Luồng nghỉ phép & tăng ca | 6/10 | Phê duyệt nhiều cấp đúng; không có thông báo           |
| Tính lương                | 8/10 | Tinh vi, phù hợp pháp luật VN; thiếu sót nhỏ          |
| Quản lý hợp đồng          | 4/10 | Hoạt động nhưng không có phiên bản hoặc vòng đời       |
| Cấu hình hệ thống         | 7/10 | Cấu hình JSON có phiên bản tốt; không có kiểm tra schema|
| UX Frontend               | 7/10 | Giao diện theo vai trò rõ ràng; xác thực form hạn chế |
| Toàn vẹn dữ liệu          | 5/10 | Xóa mềm tốt; không có nhật ký kiểm toán, không có xác thực FK |
| Sẵn sàng vận hành         | 3/10 | Không có migrations, không có giám sát, không có health check |

---

## 3. Điểm Mạnh

### 3.1 Bộ Máy Tính Lương
`PayrollCalculationEngine` là điểm nổi bật kỹ thuật của hệ thống. Nó triển khai đúng:
- Cơ cấu lương Việt Nam (các thành phần Lhq × KPItb + Li + HTi).
- Tự động chấm điểm KPI từ dữ liệu chấm công (giảm gánh nặng nhập liệu thủ công).
- Tiền OT với ba hệ số nhân (ngày thường ×1,5, cuối tuần ×2,0, ban đêm ×1,3).
- Khấu trừ theo quy định Việt Nam đúng đắn: BHXH (8%), BHYT (1,5%), BHTN (1%).
- Thuế TNCN lũy tiến với giảm trừ bản thân và người phụ thuộc, đọc từ SystemConfig có thể cấu hình.
- Mức trần cơ sở đóng bảo hiểm (46,8 triệu VNĐ) được áp dụng nhất quán.
- Lớp tính toán thuần túy (không truy cập cơ sở dữ liệu) cho phép kiểm thử đơn vị không cần hạ tầng.

### 3.2 Cấu Hình Hệ Thống Có Phiên Bản
Bảng `system_config` với `configType`, `version`, `effectiveDate`, `legalBasis` và cờ `active` là thiết kế xuất sắc. Nó cho phép:
- Nhập trước các thay đổi quy định và kích hoạt vào ngày cụ thể.
- Lưu lịch sử đầy đủ các cấu hình cũ để kiểm toán và giải quyết tranh chấp.
- Tách rời thay đổi cấu hình khỏi triển khai code.

### 3.3 Hiệu Suất Tính Lương Hàng Loạt
Dịch vụ tính lương hàng loạt sử dụng mẫu truy vấn được tối ưu: 4 truy vấn cơ sở dữ liệu để tải tất cả dữ liệu cho tất cả nhân viên, nhóm trong bộ nhớ và một lần ghi `saveAll()`. Điều này tránh anti-pattern N×3 truy vấn và sẽ mở rộng tốt đến hàng trăm nhân viên.

### 3.4 Kiến Trúc Xác Thực
Thiết kế JWT + cookie HttpOnly an toàn và theo tiêu chuẩn ngành:
- Access token ngắn hạn (5 phút) chỉ trong bộ nhớ.
- Refresh token dài hạn trong cookie HttpOnly (chống XSS).
- Thu hồi dựa trên JTI trong Redis (cho phép đăng xuất tức thì dù token chưa hết hạn).
- Xoay vòng refresh token sau mỗi lần sử dụng.

### 3.5 Quy Trình Phê Duyệt Nhiều Cấp
Quy trình phê duyệt nghỉ phép và tăng ca ba cấp (LEADER → MANAGER → HR_ADMIN) được triển khai đúng bằng máy trạng thái. Chuyển đổi kiểm soát theo vai trò ngăn người phê duyệt hành động không đúng thứ tự.

---

## 4. Thiếu Sót Nghiêm Trọng (Phải Sửa Trước Khi Sản Xuất)

### TH-001: Chưa Triển Khai Xử Lý Tự Động Chấm Công ⚠️ CAO

**Vấn đề:** Pipeline từ `CheckinLog` sang `Attendance` chưa hoàn chỉnh. Sự kiện check-in/out từ thiết bị được lưu trong `check_in_log`, nhưng bản ghi `Attendance` tương ứng **không được tự động tạo hoặc cập nhật**. `AttendanceService.buildAttendance()` tồn tại nhưng không bao giờ được `CheckinLogService` gọi sau khi lưu nhật ký.

**Tác động:** Như đã triển khai, **không có bản ghi chấm công nào tồn tại** trừ khi HR xây dựng thủ công. Tính toán lương phụ thuộc vào bản ghi `Attendance` cho `NCtt` (ngày công được tính lương). Chạy lương trên hệ thống không có bản ghi chấm công sẽ tạo ra bảng lương không ngày công hoặc lỗi dữ liệu thiếu.

**Khuyến nghị:** Trong `CheckinLogService.processRealTime()`, sau khi lưu nhật ký, kích hoạt `AttendanceService.buildAttendance()` cho nhân viên và ngày liên quan. Với nhật ký batch, kích hoạt tạo lại chấm công sau khi tất cả nhật ký trong ngày được nhập.

---

### TH-002: Không Có Nhật Ký Kiểm Toán ⚠️ CAO

**Vấn đề:** Hệ thống ghi lại timestamps `createdAt` và `updatedAt`, nhưng không có `createdBy`, `updatedBy` hay nhật ký thao tác. Sửa đổi bản ghi chấm công, bảng lương, hồ sơ nhân viên và hợp đồng bị ghi đè hoàn toàn mà không có bản ghi giá trị trước hay danh tính người thay đổi.

**Tác động:**
- Tranh chấp lương không thể điều tra — không có hồ sơ về ai tính gì, với đầu vào gì.
- Điều chỉnh chấm công không thể xem lại — thời gian check-in/out gốc đã mất.
- Vi phạm yêu cầu kiểm toán HR tiêu chuẩn ở hầu hết các quốc gia.

**Khuyến nghị:**
1. Thêm trường `createdBy` và `updatedBy` cho các thực thể quan trọng (tối thiểu: `Payroll`, `Attendance`, `Contract`).
2. Với `Attendance`, cân nhắc giữ nguyên bản ghi `CheckinLog` gốc (đã thực hiện) như nguồn sự thật và ghi lại các điều chỉnh thủ công dưới dạng sự kiện điều chỉnh.
3. Với `Payroll`, ghi lại đầu vào KPI, giá trị phụ cấp và phiên bản cấu hình đang hoạt động được sử dụng tại thời điểm tính lương.

---

### TH-003: Không Có Quản Lý Migration Cơ Sở Dữ Liệu ⚠️ CAO

**Vấn đề:** Ứng dụng sử dụng `spring.jpa.hibernate.ddl-auto: update` để quản lý schema. Điều này có nghĩa Hibernate sẽ cố gắng áp dụng thay đổi DDL tự động khi khởi động.

**Tác động:**
- `ddl-auto: update` **không thể xóa cột hoặc bảng** — nó chỉ thêm. Bất kỳ đổi tên cột nào tạo cột mới và để lại cột cũ, âm thầm làm hỏng schema theo thời gian.
- Trong môi trường nhóm, thay đổi schema không thể được xem xét, phiên bản hóa hay rollback.
- Khởi động thất bại do xung đột migration có thể khiến cơ sở dữ liệu ở trạng thái không nhất quán một phần.
- Không thể chấp nhận với hệ thống lưu trữ dữ liệu lương và việc làm.

**Khuyến nghị:** Chuyển sang Flyway (đã là dependency trong `pom.xml`). Đặt `ddl-auto: none` và viết các script migration SQL có phiên bản rõ ràng trong `src/main/resources/db/migration/`.

---

### TH-004: Kho Job Tính Lương Batch Trong Bộ Nhớ ⚠️ TRUNG BÌNH

**Vấn đề:** `PayrollJobStore` lưu bản ghi job batch và bộ đếm tiến độ trong `ConcurrentHashMap` ở bộ nhớ JVM. `AsyncConfig` của ứng dụng tạo thread pool nhưng không có lưu trữ trạng thái job.

**Tác động:**
- Nếu ứng dụng khởi động lại (crash, triển khai) trong quá trình xử lý batch, tất cả trạng thái job bị mất. Các bản ghi `Payroll` đã ghi một phần vẫn còn trong cơ sở dữ liệu, nhưng HR không có cách biết bao nhiêu đã thành công hay thất bại.
- Trên triển khai đa instance (mở rộng ngang), job được tạo trên instance A không thấy được ở instance B.

**Khuyến nghị:** Lưu bản ghi `PayrollJob` trong cơ sở dữ liệu. Spring Batch (đã là dependency) cung cấp mô hình lưu trữ thực thi job đầy đủ — xem xét áp dụng cho tính lương batch.

---

### TH-005: Không Có Quản Lý Số Ngày Phép ⚠️ TRUNG BÌNH

**Vấn đề:** Đơn nghỉ phép được nộp và phê duyệt mà không kiểm tra đối chiếu với định mức. Nhân viên có thể xin nghỉ không giới hạn, và hệ thống sẽ phê duyệt.

**Tác động:** Nghỉ phép được phê duyệt độc lập với quyền lợi tích lũy. HR không thấy được mức tiêu thụ so với số dư phép, và khấu trừ lương cho nghỉ quá phép không thể tự động hóa.

**Khuyến nghị:** Triển khai thực thể `LeaveBalance` hoặc `LeaveEntitlement` theo dõi:
- Loại phép (thường niên, ốm đau, hiếu hỷ, không lương, v.v.)
- Quyền lợi hàng năm (ngày)
- Ngày đã dùng (tổng phép đã duyệt theo loại)
- Số dư còn lại

Kiểm tra khi nộp đơn nghỉ phép cần xác nhận số dư còn đủ cho loại yêu cầu.

---

### TH-006: Lịch Sử Hợp Đồng Không Được Lưu ⚠️ TRUNG BÌNH

**Vấn đề:** Mỗi nhân viên chỉ có một bản ghi hợp đồng (quan hệ `OneToOne`). Khi hợp đồng được cập nhật (ví dụ thăng chức với bậc lương mới), các điều khoản hợp đồng trước đó bị ghi đè.

**Tác động:**
- Bản ghi lương lịch sử tham chiếu giá trị hợp đồng hiện tại, không phải giá trị có hiệu lực tại thời điểm tính. Nếu hợp đồng được cập nhật, bản ghi lương cũ trở nên không nhất quán với hợp đồng đã lưu.
- Không có hồ sơ về lịch sử lương, thăng chức hay gia hạn hợp đồng.

**Khuyến nghị:**
1. Chuyển quan hệ sang `OneToMany`, mỗi bản ghi đại diện cho hợp đồng có hiệu lực trong khoảng ngày (với `effectiveFrom` và `effectiveTo`).
2. Bộ máy tính lương nên tải hợp đồng có hiệu lực cho kỳ lương, không phải hợp đồng hiện tại.
3. Hoặc snapshot các trường hợp đồng quan trọng (`baseSalary`, `positionCode`, `salaryStep`, `insuranceBase`) vào bản ghi `Payroll` tại thời điểm tính lương.

---

### TH-007: Cấu Hình Hệ Thống JSON Không Có Xác Thực Schema ⚠️ TRUNG BÌNH

**Vấn đề:** `SystemConfig.configData` được lưu dưới dạng `JsonNode` (PostgreSQL JSONB). Tầng service không thực hiện xác thực cấu trúc JSON trước khi lưu. Config không hợp lệ hoặc thiếu (ví dụ thiếu mục bậc thuế TNCN) chỉ lỗi tại thời điểm tính lương, không phải khi tạo config.

**Tác động:** SYSTEM_ADMIN nhập config sai định dạng sẽ không nhận lỗi cho đến lần tính lương đầu tiên, có thể ảnh hưởng đến toàn bộ lần chạy batch.

**Khuyến nghị:** Định nghĩa và áp dụng JSON schema (hoặc dùng thực thể có kiểu riêng) cho mỗi `configType`. Tối thiểu, kiểm tra rằng tất cả khóa bắt buộc tồn tại và giá trị số là dương khi lưu config.

---

### TH-008: Endpoint Nhật Ký Check-in Không Xác Thực ⚠️ TRUNG BÌNH

**Vấn đề:** `POST /api/checkin-logs` và `GET /api/checkin-logs` có thể truy cập không cần xác thực. Được ghi nhận là cố ý cho tích hợp thiết bị, nhưng tạo rủi ro chèn dữ liệu giả.

**Tác động:**
- Bất kỳ client nào trên mạng có thể gửi nhật ký check-in giả mạo cho bất kỳ nhân viên nào, thao túng chấm công và do đó bảng lương.
- Endpoint `GET /api/checkin-logs` trả về tất cả dữ liệu check-in của nhân viên cho ngày cho trước cho bất kỳ người gọi chưa xác thực nào, đây là rò rỉ quyền riêng tư.

**Khuyến nghị:**
- Cấp API key hoặc token theo thiết bị cho các thiết bị đã đăng ký và xác thực chúng tại endpoint check-in.
- Giới hạn `GET /api/checkin-logs` cho các vai trò HR đã xác thực.

---

### TH-009: Danh Sách Phòng Ban Có Thể Truy Cập Công Khai ⚠️ THẤP

**Vấn đề:** `GET /api/departments` và `GET /api/departments/{id}` không yêu cầu xác thực.

**Tác động:** Cơ cấu tổ chức (tên phòng ban, phân công quản lý) hiển thị cho người dùng chưa xác thực. Trong mạng công ty rủi ro thấp, nhưng vi phạm nguyên tắc đặc quyền tối thiểu và không chấp nhận được với triển khai internet-facing.

**Khuyến nghị:** Yêu cầu ít nhất xác thực cơ bản (`isAuthenticated()`) cho tất cả endpoint đọc phòng ban.

---

## 5. Thiếu Sót Chức Năng (Nên Sửa để Có Đầy Đủ Tính Năng)

### CN-001: Không Có Hệ Thống Thông Báo
Người phê duyệt không được thông báo về đơn nghỉ phép hoặc tăng ca đang chờ. HR không được thông báo khi lô tính lương hoàn thành. Nhân viên không được thông báo khi đơn được duyệt hoặc từ chối.

**Khuyến nghị:** Triển khai dịch vụ thông báo hướng sự kiện (email qua SMTP, hoặc chuông thông báo trong ứng dụng) được kích hoạt khi chuyển đổi trạng thái trong quy trình phê duyệt nghỉ phép/tăng ca và khi trạng thái lương thay đổi.

### CN-002: Phân Loại Loại Nghỉ Phép
Tất cả nghỉ phép không có kiểu (không phân biệt nghỉ phép năm, nghỉ ốm, nghỉ hiếu hỷ). Điều này ngăn theo dõi số dư phép chính xác, khấu trừ lương cho nghỉ không lương và báo cáo nghỉ phép theo quy định.

### CN-003: Giờ Làm Việc Cố Định Trong Code
Giờ bắt đầu (08:30) và số giờ/ngày (8) là hằng số `static final` trong `AttendanceService`. Công ty có giờ làm linh hoạt, lao động theo ca hay nhiều múi giờ không thể cấu hình được.

**Khuyến nghị:** Chuyển các hằng số này vào cấu hình `WorkSchedule` mới trong `SystemConfig` (hoặc theo chính sách từng phòng ban).

### CN-004: Không Tự Tính OT Từ Chấm Công
Bản ghi chấm công tính `workingHour` nhưng không tự động tạo đơn OT khi nhân viên làm quá 8 giờ. Đơn tăng ca hoàn toàn thủ công.

**Khuyến nghị:** Xem xét tự tạo bản ghi `OTRequest` (ở trạng thái `DRAFT` để nhân viên xem xét) khi `workingHour > 8` trong bất kỳ ngày nào.

### CN-005: Ngày Hợp Đồng Là Chuỗi
`Contract.startDate` và `Contract.endDate` được lưu dưới dạng `String`, không phải `LocalDate`. Điều này ngăn:
- Cảnh báo hết hạn hợp đồng.
- Xác thực ngày (ngày kết thúc > ngày bắt đầu).
- Báo cáo theo kỳ hợp đồng.

**Khuyến nghị:** Chuyển sang `LocalDate` với Flyway migration.

### CN-006: Không Tính Chi Phí Bảo Hiểm Phía Sử Dụng Lao Động
Bộ máy tính lương chỉ tính khấu trừ **phía nhân viên**. Đóng góp của người sử dụng lao động (BHXH: 17%, BHYT: 3%, BHTN: 1%, TNLĐ-BNN: 0,5%) không được tính ở đâu. Nếu thiếu điều này, tổng chi phí việc làm thực tế cho mỗi nhân viên không thấy được.

**Khuyến nghị:** Thêm trường khấu trừ phía sử dụng lao động vào thực thể `Payroll` và tính trong bộ máy tính toán.

### CN-007: Ảnh Đại Diện Lưu Trong Cơ Sở Dữ Liệu
`EmployeeInfo.profilePicture` là `byte[]` (`@Lob`) được lưu trực tiếp trong bảng `employee_info`. Điều này sẽ làm giảm hiệu suất truy vấn cơ sở dữ liệu khi số nhân viên tăng.

**Khuyến nghị:** Lưu ảnh đại diện trong object storage (AWS S3, MinIO hoặc tương tự) và chỉ lưu URL trong thực thể `EmployeeInfo`.

### CN-008: Không Có Xuất Lương / PDF Phiếu Lương
Nhân viên có thể xem dữ liệu phiếu lương trên màn hình, nhưng không có xuất PDF hay định dạng in được. HR không thể xuất lần chạy lương tháng sang bảng tính để tạo file ngân hàng.

### CN-009: Không Có Logic Chuyển/Tích Lũy Phép Năm
Ngay cả khi số dư phép được triển khai (TH-005), sẽ cần xử lý chuyển năm (ví dụ phép chưa dùng từ năm trước chuyển sang năm tiếp theo, tối đa một giới hạn nhất định).

---

## 6. Thiếu Sót Sẵn Sàng Vận Hành

### VH-001: Không Có Giám Sát Sức Khỏe Ứng Dụng
Spring Boot Actuator chưa được kích hoạt. Không có `/actuator/health`, `/actuator/metrics` hay probe sẵn sàng/liveness. Điều này ngăn:
- Kiểm tra sức khỏe triển khai Kubernetes.
- Kiểm tra sức khỏe load balancer.
- Dashboard vận hành.

### VH-002: Không Có Logging Cấu Trúc hay Tracing
Ứng dụng dùng logging Spring Boot mặc định không có correlation ID, định dạng log có cấu trúc hay distributed tracing. Debug lần chạy lương batch thất bại qua nhiều dòng log rất khó.

### VH-003: Không Có Rate Limiting
Endpoint đăng nhập không có bảo vệ brute-force (không rate limiting, không khóa tài khoản). Kẻ tấn công có thể thử mật khẩu không giới hạn lần.

### VH-004: CORS Cố Định là localhost:3000
Backend chỉ cho phép CORS từ `http://localhost:3000`. Phải được externalize ra thuộc tính cấu hình trước bất kỳ triển khai nào không phải local.

### VH-005: Thông Tin Đăng Nhập CSDL Cố Định Trong Code
`application.yml` chứa thông tin đăng nhập cơ sở dữ liệu (`postgres/postgres`) ở dạng văn bản thuần. Phải được externalize ra biến môi trường hoặc quản lý secret trước khi triển khai sản xuất.

### VH-006: show-sql: true trong application.yml
`spring.jpa.show-sql: true` được kích hoạt, sẽ làm tràn log sản xuất với các câu lệnh SQL. Phải tắt trong profile sản xuất.

---

## 7. Nợ Kỹ Thuật

| Mục                                           | Vị trí                      | Rủi ro   |
|-----------------------------------------------|-----------------------------|:--------:|
| `ddl-auto: update` trong sản xuất            | `application.yml`            | CAO      |
| `WORK_START = 08:30` cố định                  | `AttendanceService.java`     | TRUNG BÌNH|
| Ngày hợp đồng dưới dạng `String`             | `Contract.java`              | TRUNG BÌNH|
| Ảnh đại diện là BLOB trong CSDL              | `EmployeeInfo.java`          | TRUNG BÌNH|
| `PayrollJobStore` trong bộ nhớ               | `PayrollBatchService.java`   | TRUNG BÌNH|
| Không có xác thực JSON schema cho `SystemConfig` | `SystemConfigService.java` | TRUNG BÌNH|
| `show-sql: true`                              | `application.yml`            | THẤP     |
| CORS cố định là localhost                    | `SecurityConfig.java`        | THẤP     |
| Thông tin đăng nhập CSDL trong file cấu hình | `application.yml`            | CAO      |
| Không có rate limiting request               | `SecurityConfig.java`        | TRUNG BÌNH|

---

## 8. Tóm Tắt Rủi Ro

| Rủi ro                                              | Khả năng | Tác động | Biện pháp                       |
|-----------------------------------------------------|:--------:|:--------:|---------------------------------|
| Lương tính với chấm công bằng 0 (TH-001)           | CAO      | CAO      | Triển khai xử lý chấm công tự động |
| Nhật ký check-in giả mạo ảnh hưởng lương (TH-008) | TRUNG BÌNH| CAO     | Thêm xác thực thiết bị           |
| Hỏng schema từ ddl-auto:update (VH-005)            | TRUNG BÌNH| CAO     | Chuyển sang Flyway               |
| Tranh chấp lương không giải quyết được (TH-002)    | CAO      | CAO      | Thêm logging kiểm toán           |
| Brute-force thông tin đăng nhập (VH-003)           | TRUNG BÌNH| TRUNG BÌNH| Thêm rate limiting và khóa tài khoản |
| Mất dữ liệu nếu app khởi động lại khi batch (TH-004)| THẤP   | TRUNG BÌNH| Lưu trạng thái job vào CSDL     |
| Vượt định mức phép không được phát hiện (TH-005)  | CAO      | THẤP     | Triển khai theo dõi số dư phép  |

---

## 9. Lộ Trình Phát Triển Đề Xuất

### Giai đoạn 1 — Các Vấn Đề Chặn Sản Xuất (Phải hoàn thành trước khi ra mắt)
1. **TH-001** — Triển khai tạo bản ghi `Attendance` tự động từ sự kiện `CheckinLog`.
2. **TH-002** — Thêm trường kiểm toán `createdBy`/`updatedBy` cho Payroll, Attendance, Contract.
3. **TH-003** — Chuyển quản lý schema từ `ddl-auto: update` sang Flyway.
4. **VH-005** — Externalize tất cả thông tin đăng nhập và cấu hình theo môi trường ra biến môi trường.
5. **TH-008** — Thêm xác thực API key thiết bị cho endpoint nhật ký check-in.

### Giai đoạn 2 — Hoàn Thiện Tính Năng Cốt Lõi (Cho đầy đủ tính năng HR)
6. **TH-005** — Triển khai phân loại loại nghỉ phép và theo dõi số dư.
7. **TH-006** — Triển khai lịch sử hợp đồng (khoảng ngày hiệu lực, bảo toàn dữ liệu lịch sử).
8. **TH-007** — Thêm xác thực JSON schema cho `SystemConfig.configData`.
9. **CN-001** — Triển khai thông báo email cho sự kiện quy trình phê duyệt.
10. **CN-003** — Làm giờ bắt đầu và số giờ làm việc có thể cấu hình qua `SystemConfig`.

### Giai đoạn 3 — Mở Rộng và Vận Hành
11. **TH-004** — Thay thế `PayrollJobStore` trong bộ nhớ bằng kho job Spring Batch được lưu vào CSDL.
12. **CN-007** — Chuyển ảnh đại diện sang object storage.
13. **CN-005** — Sửa `Contract.startDate`/`endDate` sang kiểu `LocalDate`.
14. **VH-001** — Kích hoạt Spring Boot Actuator với endpoint health và metrics.
15. **VH-003** — Thêm rate limiting đăng nhập và chính sách khóa tài khoản.
16. **CN-006** — Thêm tính toán bảo hiểm và thuế phía sử dụng lao động.
17. **CN-008** — Triển khai tạo PDF phiếu lương và xuất CSV bảng lương.

---

## 10. Kết Luận

FaceZ HRMS thể hiện nền tảng kiến trúc vững chắc và bộ máy tính lương được triển khai đúng phù hợp với luật lao động Việt Nam. Code sạch, có cấu trúc tốt và tuân theo các mẫu Spring Boot và Next.js đã được thiết lập.

Các vấn đề chính ngăn sẵn sàng sản xuất không phải về kiến trúc — mà là **thiếu sót về tính hoàn chỉnh**. Nghiêm trọng nhất là pipeline check-in/chấm công bị ngắt kết nối (TH-001), nghĩa là hệ thống như đã triển khai sẽ tạo ra kết quả lương sai. Thiếu nhật ký kiểm toán (TH-002) và quản lý schema migration đúng (TH-003) là hai vấn đề chặn còn lại.

Với nỗ lực tập trung vào Giai đoạn 1 (5 mục), hệ thống có thể được triển khai an toàn cho nhóm thí điểm. Triển khai sản xuất đầy đủ phục vụ toàn bộ tổ chức sẽ yêu cầu hoàn thành Giai đoạn 2.

---

*Kết thúc Tài liệu 3*
