**ĐẠI HỌC BÁCH KHOA HÀ NỘI**
**TRƯỜNG CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG**

---

**Mẫu ĐATN 02**

# PHIẾU GIAO NHIỆM VỤ ĐỒ ÁN TỐT NGHIỆP HỆ CỬ NHÂN
**KỲ: 20252**

### Thông tin về sinh viên
| | | | |
| :--- | :--- | :--- | :--- |
| **Họ và tên sinh viên:** | Nguyễn Thanh Bách | **MSSV:** | 20204812 |
| **Điện thoại liên lạc:** |  | **Lớp:** | Kỹ thuật phần mềm - K65 |
| **Email:** | bach.nt204812@sis.hust.edu.vn | **Mã lớp:** | IT4-K65 |

### Thông tin giáo viên hướng dẫn
| | |
| :--- | :--- |
| **Họ và tên GVHD:** | Nguyễn Thị Thanh Nga |
| **Đồ án được thực hiện tại:** | Trường Công nghệ thông tin và Truyền thông |
| **Thời gian làm ĐATN:** | Từ ngày 23/02/2026 đến ngày 30/07/2026 |

---

### 1. Tên đề tài:
**Xây dựng hệ thống quản lý nhân sự tích hợp chấm công nhận diện khuôn mặt (FaceZ HRMS)**

### 2. Lĩnh vực đề tài:
*   **Lựa chọn 1:** Phần mềm doanh nghiệp
*   **Lựa chọn 2:** Hệ thống thông tin quản lý
*   **Lựa chọn 3:**
*   Nếu lĩnh vực không nằm trong danh sách có sẵn, giáo viên hướng dẫn có thể đề xuất:

---

### 3. Mục tiêu của ĐATN:

#### 3.1. Kiến thức sinh viên thu thập được:
*   Nắm vững toàn bộ quy trình phát triển phần mềm doanh nghiệp: từ khảo sát yêu cầu nghiệp vụ thực tiễn, phân tích và thiết kế hệ thống, xây dựng cơ sở dữ liệu cho đến triển khai đầy đủ trên cả hai tầng Backend và Frontend.
*   Hiểu sâu về nghiệp vụ quản lý nhân sự trong doanh nghiệp công nghệ Việt Nam: quy trình chấm công, nghỉ phép, tăng ca, tính lương theo quy định pháp luật (BHXH, BHYT, BHTN, Thuế TNCN lũy tiến theo Thông tư 111/2013/TT-BTC), và phê duyệt đa cấp.
*   Nắm được nguyên tắc phân tách nhiệm vụ (Separation of Duties) trong kiểm soát tài chính nội bộ: vai trò HR chuẩn bị dữ liệu đầu vào, Kế toán tính lương, Giám đốc phê duyệt chi trả — và cách hệ thống phần mềm số hóa các kiểm soát đó thay thế chữ ký vật lý trên giấy tờ.
*   Thiết kế và triển khai kiến trúc bảo mật đa tầng: xác thực JWT (Access/Refresh Token), phân quyền theo vai trò (RBAC) với 7 cấp quyền, rate limiting chống brute-force, và quản lý phiên đăng nhập qua Redis.
*   Xây dựng hệ thống migration cơ sở dữ liệu kiểm soát phiên bản (Flyway), đảm bảo mọi thay đổi schema có thể rollback và kiểm toán.

#### 3.2. Công nghệ sinh viên thu thập được:
*   **Backend:** Spring Boot 4.0.0-M3 (Java 21), Spring Security, Spring Data JPA, Spring Events, SpringDoc OpenAPI (Swagger), Flyway, Bucket4j.
*   **Frontend Web:** Next.js 15 (App Router), React 19, TypeScript, Recharts, TailwindCSS, Context API.
*   **Bảo mật:** JWT (SimpleJWT với HTTP-only cookie Refresh Token), RBAC 7 vai trò (`EMPLOYEE`, `LEADER`, `MANAGER`, `HR_ADMIN`, `FINANCE_ADMIN`, `DIRECTOR`, `SYSTEM_ADMIN`), Bucket4j-Redis rate limiting.
*   **Cơ sở dữ liệu:** PostgreSQL 15 (partial unique index, JSONB, database view), Flyway migration (V1–V17), JPA Auditing (`@CreatedBy`, `@LastModifiedBy`).
*   **Cache & Message:** Redis 7 (refresh token blacklist, rate limit state chia sẻ qua `RedissonBasedProxyManager`).
*   **Xử lý bất đồng bộ:** Spring `@Async` với custom thread pool, Spring Application Events (`@TransactionalEventListener`) để tách biệt các service mà không tạo circular dependency.
*   **Tính lương tuân thủ pháp luật Việt Nam:** Công thức lương gộp theo hệ số bậc lương, thuế TNCN lũy tiến 7 bậc, trần đóng bảo hiểm (20× lương tối thiểu pháp lý), chi phí phía chủ sử dụng lao động (BHXH 17%, BHYT 3%, BHTN 1%, TNLĐ-BNN 0,5%).

#### 3.3. Kỹ năng sinh viên phát triển được:
*   **Phân tích nghiệp vụ thực tiễn:** Chuyển đổi quy trình vận hành thực tế của doanh nghiệp (HR, Kế toán, Ban Giám đốc) thành mô hình dữ liệu, luồng trạng thái và phân quyền trong hệ thống phần mềm. Nhận diện sai lệch quyền sở hữu quy trình và đề xuất tái thiết kế phù hợp.
*   **Thiết kế hệ thống phân quyền phức tạp:** Xây dựng SecurityConfig với các quy tắc phân quyền chi tiết theo HTTP method, đảm bảo một endpoint có thể có quyền truy cập khác nhau tùy role mà không xung đột.
*   **Kỹ năng thiết kế cơ sở dữ liệu nâng cao:** Xây dựng migration chiến lược (cột song song khi đổi kiểu dữ liệu, partial unique index cho nullable column, database view tối ưu truy vấn), xử lý lịch sử hợp đồng và cơ chế trừ hai giai đoạn cho số dư nghỉ phép chống race condition.
*   **Xây dựng luồng phê duyệt đa cấp:** Triển khai state machine cho các đối tượng có vòng đời phức tạp (PayrollStatus, RequestStatus) với các transition được bảo vệ bởi role và điều kiện nghiệp vụ.
*   **Kiểm soát chất lượng và kiểm thử:** Kiểm thử API với Postman, kiểm thử unit test cho PayrollCalculationEngine với đầy đủ tổ hợp hệ số (ngày thường/cuối tuần/ngày lễ × ban ngày/ca đêm).

#### 3.4. Sản phẩm kỳ vọng:
*   Hệ thống HRMS hoàn chỉnh vận hành ổn định, đáp ứng đầy đủ nghiệp vụ quản lý nhân sự của doanh nghiệp công nghệ quy mô vừa và nhỏ tại Việt Nam, với khả năng mở rộng khi tăng số lượng nhân viên.
*   Backend RESTful API (Spring Boot 4.0.0-M3, Java 21) với 17 migration Flyway kiểm soát phiên bản schema; tài liệu API đầy đủ qua Swagger UI. Toàn bộ luồng nghiệp vụ tuân thủ quy trình phân tách nhiệm vụ đúng chuẩn: HR chuẩn bị dữ liệu → Finance tính lương → Director phê duyệt.
*   Frontend Web đa vai trò (Next.js 15, React 19) với giao diện phù hợp từng role: trang chấm công cá nhân cho Employee, dashboard phê duyệt cho Manager/Leader, quản lý nhân sự cho HR Admin, quản lý bảng lương cho Finance Admin, phê duyệt chi lương cho Director, và cấu hình hệ thống cho System Admin.
*   Module tính lương tuân thủ đầy đủ quy định pháp luật Việt Nam: thuế TNCN lũy tiến 7 bậc, trần đóng bảo hiểm theo lương tối thiểu pháp lý, đóng góp phía chủ sử dụng lao động, và báo cáo nộp BHXH/BHYT/BHTN phục vụ Kế toán.
*   Hệ thống vận hành an toàn với cơ chế xác thực JWT hai token (access + refresh), rate limiting chống brute-force, audit trail tự động ghi nhận `createdBy`/`updatedBy` trên mọi thao tác nghiệp vụ, và log có cấu trúc JSON phục vụ giám sát môi trường production.

#### 3.5. Vấn đề thực tiễn đồ án giải quyết:
*   **Số hóa quy trình nhân sự thủ công:** Chuyển đổi toàn bộ hoạt động quản lý nhân sự từ bảng tính và giấy tờ sang hệ thống tập trung, giảm thiểu sai sót trong tính lương, theo dõi chấm công và quản lý nghỉ phép.
*   **Khôi phục kiểm soát tài chính nội bộ:** Tái tạo sự phân tách nhiệm vụ mà quy trình giấy tờ thực hiện qua chữ ký vật lý (HR → Kế toán → Giám đốc) trong môi trường số — một vấn đề thường bị bỏ qua trong các hệ thống HRMS tự phát triển.
*   **Tuân thủ pháp luật Việt Nam về lao động và thuế:** Hệ thống hóa tính toán thuế TNCN theo biểu lũy tiến, bảo hiểm xã hội theo đúng quy định hiện hành, và quản lý người phụ thuộc theo Mẫu 02/CK-TNCN (Thông tư 80/2021/TT-BTC), thay thế tính toán thủ công dễ sai sót của bộ phận Kế toán.
*   **Tự động hóa pipeline chấm công nhận diện khuôn mặt:** Xử lý tự động chuỗi sự kiện từ thiết bị check-in nhận diện khuôn mặt đến bản ghi chấm công đã xử lý, loại bỏ bước xử lý thủ công của HR và đảm bảo dữ liệu đầu vào tính lương luôn cập nhật.
*   **Quy trình phê duyệt đa cấp có kiểm soát:** Số hóa luồng phê duyệt nghỉ phép và tăng ca với các cấp phê duyệt (LEADER → MANAGER → HR_ADMIN), ngăn chặn việc phê duyệt bỏ cấp và đảm bảo truy vết đầy đủ.

---

### 4. Các nội dung sẽ thực hiện và kế hoạch triển khai:
*Lưu ý: khối lượng yêu cầu đối với đồ án tốt nghiệp hệ cử nhân là 6(0-0-12-12), i.e. 12 tiết làm việc/tuần trong 17 tuần.*

**Nội dung 1: Tìm hiểu tổng quan về bài toán** (từ Tuần 1 đến Tuần 3)
*   Khảo sát quy trình quản lý nhân sự thực tiễn trong doanh nghiệp công nghệ Việt Nam: vòng đời nhân viên, phê duyệt nghỉ phép/tăng ca, tính lương và quy trình chi trả.
*   Phân tích quyền sở hữu quy trình theo từng bộ phận tổ chức: xác định ranh giới trách nhiệm giữa HR, Kế toán/Tài chính và Ban Giám đốc để thiết kế RBAC đúng thực tế.
*   Nghiên cứu các quy định pháp luật liên quan: Bộ Luật Lao Động 2019 (nghỉ phép năm, giới hạn OT 40h/tháng 200h/năm), Thông tư 111/2013/TT-BTC (biểu thuế TNCN 7 bậc), Luật BHXH (tỷ lệ đóng, trần đóng).
*   Xác định các tính năng cốt lõi: quản lý nhân viên, phòng ban, hợp đồng, chấm công nhận diện khuôn mặt, nghỉ phép, tăng ca, tính lương, phê duyệt bảng lương, cấu hình hệ thống.

**Nội dung 2: Tìm hiểu tổng quan về công nghệ liên quan** (từ Tuần 2 đến Tuần 5)
*   **Backend:** Spring Boot 4.0.0-M3 (Java 21), Spring Security, Spring Data JPA, Spring Events; Flyway migration management; SpringDoc OpenAPI.
*   **Frontend:** Next.js 15 (App Router), React 19, TypeScript; Context API cho quản lý trạng thái xác thực; Recharts cho biểu đồ dashboard.
*   **Hạ tầng:** PostgreSQL 15 (partial unique index, JSONB, database view); Redis 7 (token blacklist, rate limiting); Docker Compose cho môi trường phát triển.
*   **Bảo mật:** JWT (access token 5 phút + refresh token 14 ngày, HTTP-only cookie); Bucket4j-Redis rate limiting; RBAC với `@PreAuthorize`.

**Nội dung 3: Phân tích thiết kế** (từ Tuần 4 đến Tuần 8)
*   Xây dựng mô hình phân quyền 7 vai trò: xác định rõ từng endpoint thuộc quyền role nào dựa trên chủ sở hữu quy trình nghiệp vụ thực tế.
*   Thiết kế cơ sở dữ liệu quan hệ: 13 bảng chính + lịch sử hợp đồng, số dư nghỉ phép, người phụ thuộc thuế, ngày lễ, kỳ chấm công, API key thiết bị; lộ trình migration V1–V17.
*   Thiết kế luồng trạng thái: `PayrollStatus` (DRAFT → PENDING_APPROVAL → APPROVED → PAID, REJECTED), `RequestStatus` (DRAFT → TO_APPROVE → LEADER_APPROVED → MANAGER_APPROVED → APPROVED/REJECTED).
*   Thiết kế kiến trúc module: `controller → service → repository` với `PayrollCalculationEngine` tách biệt logic tính lương khỏi transaction, `PayrollBatchService` dùng `@Async` cho xử lý hàng loạt.
*   Thiết kế mockup giao diện dashboard theo từng vai trò; thiết kế API spec cho tất cả module.

**Nội dung 4: Xây dựng chương trình** (từ Tuần 7 đến Tuần 15)
*   **Phase 0 — Nền tảng hạ tầng:** Thiết lập Flyway migrations (V1–V2), externalize secrets ra biến môi trường, chuẩn hóa `AuditableEntity`, cấu hình Bucket4j-Redis rate limiting, tạo environment profiles (dev/staging/prod).
*   **Phase 1 — Kiến trúc phân quyền:** Thêm vai trò `FINANCE_ADMIN`, `DIRECTOR`; chuẩn hóa `PayrollStatus`; triển khai endpoint submit/approve/reject bảng lương; thêm bước chốt kỳ chấm công `AttendancePeriodClose`; rewrite `SecurityConfig`.
*   **Phase 2 — Dữ liệu nhân viên pháp lý:** Bổ sung 11 trường pháp lý vào `EmployeeInfo`; triển khai `TaxDependent` entity và CRUD API.
*   **Phase 3 — Tự động hóa chấm công:** Kết nối `CheckinLogService` → `AttendanceService` qua Spring Events; cấu hình giờ làm việc linh hoạt qua `SystemConfig`; quản lý lịch ngày lễ.
*   **Phase 4 — Quản lý nghỉ phép:** Thêm `LeaveType` enum; triển khai `LeaveBalance` với cơ chế trừ hai giai đoạn; đối chiếu vắng mặt khi chốt tháng.
*   **Phase 5 — Vòng đời hợp đồng:** Sửa kiểu ngày `VARCHAR → LocalDate` (migration cột song song); lưu lịch sử hợp đồng; cảnh báo hết hạn định kỳ.
*   **Phase 6 — Tuân thủ OT:** Giới hạn pháp lý 40h/tháng, 200h/năm; phân loại ca đêm theo chồng lấp thực tế với khung 22:00–06:00; database view tối ưu truy vấn.
*   **Phase 7 — Chức năng kế toán:** Tính chi phí phía chủ sử dụng lao động (BHXH 17%, BHYT 3%, BHTN 1%, TNLĐ-BNN 0,5%); thuế TNCN lũy tiến 7 bậc đọc từ `SystemConfig`; 3 báo cáo kế toán (chi phí lao động, nộp bảo hiểm, PIT summary); phiếu lương cá nhân.
*   **Phase 8 — Vận hành và bảo mật:** Hệ thống thông báo in-app qua Spring Events; xác thực thiết bị check-in bằng API key; migration ảnh đại diện sang object storage (3 release an toàn); Spring Boot Actuator; structured logging JSON.
*   **Frontend:** Xây dựng đầy đủ các trang theo role; dashboard analytics (Recharts); sidebar điều hướng role-aware; global error handling và toast notification.

**Nội dung 5: Thử nghiệm và đánh giá** (từ Tuần 15 đến Tuần 17)
*   Kiểm thử API toàn diện qua Swagger UI: kiểm tra phân quyền (đảm bảo role sai nhận HTTP 403), kiểm tra state machine payroll (không thể nhảy cóc trạng thái), kiểm tra guard chốt kỳ chấm công.
*   Kiểm thử unit test `PayrollCalculationEngine`: 6 tổ hợp hệ số OT (ngày thường/cuối tuần/ngày lễ × ban ngày/ca đêm); tính thuế TNCN theo từng bậc; trần đóng bảo hiểm.
*   Kiểm thử luồng end-to-end: check-in nhận diện khuôn mặt → tạo Attendance → HR chốt tháng → Finance tính lương → Director phê duyệt → Finance đánh dấu đã trả → Employee xem phiếu lương.
*   Kiểm thử race condition trong cơ chế trừ hai giai đoạn số dư nghỉ phép; kiểm thử giới hạn OT khi nhiều request đồng thời.
*   Kiểm thử giao diện người dùng trên các kích thước màn hình khác nhau; kiểm thử luồng đăng nhập/đăng xuất và hết hạn token.
*   Triển khai lên môi trường staging với `application-staging.yml`; kiểm tra Flyway migration hoàn thành không lỗi; xác minh health endpoint và structured logging.

---

### 5. Lời cam đoan của sinh viên đã nhận được nhiệm vụ
Em xin cam kết sẽ hoàn thành các nhiệm vụ theo đúng kế hoạch.

*Hà Nội, ngày 23 tháng 04 năm 2026*
**Sinh viên**
*(Ký và ghi rõ họ tên)*

*(Đã ký)*
**Nguyễn Thanh Bách**

---

### 6. Xác nhận của giáo viên hướng dẫn về việc giao nhiệm vụ cho sinh viên

*Hà Nội, ngày ...... tháng ...... năm ......*
**Giảng viên hướng dẫn**
*(Ký và ghi rõ họ tên)*

**Nguyễn Thị Thanh Nga**
