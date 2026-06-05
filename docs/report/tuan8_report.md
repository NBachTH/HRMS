# BÁO CÁO TIẾN ĐỘ TUẦN 8 — DỰ ÁN HRMS FACE-Z

> **Ngày báo cáo:** 21/05/2026
> **Giai đoạn:** Tuần 8 — Tổng kết hệ thống & Kế hoạch hoàn thiện và triển khai
> **Stack:** Spring Boot 4.0.0-M3 (Java 21) + Next.js 15 (TypeScript, React 19) + PostgreSQL 15 + Redis 7

---

## PHẦN 1: TỔNG QUAN CHỨC NĂNG HỆ THỐNG HRM HIỆN TẠI

### 1.1 Các chức năng cốt lõi của một hệ thống HRM

Một hệ thống Quản lý Nhân sự (HRM) hoàn chỉnh cần đảm bảo các nhóm chức năng sau:

| STT | Nhóm chức năng | Mô tả yêu cầu | Trạng thái |
|-----|----------------|---------------|------------|
| 1 | Xác thực & Phân quyền | Đăng nhập an toàn, phân quyền theo vai trò (RBAC), kiểm soát truy cập | ✅ Đầy đủ |
| 2 | Quản lý nhân viên | Hồ sơ nhân viên, thông tin pháp lý, người phụ thuộc giảm trừ thuế | ✅ Đầy đủ |
| 3 | Quản lý tổ chức | Phòng ban, cấu trúc tổ chức, phân công quản lý | ✅ Cơ bản |
| 4 | Chấm công & Điểm danh | Tích hợp thiết bị, ghi nhận giờ làm, đóng kỳ chấm công | ✅ Đầy đủ |
| 5 | Quản lý nghỉ phép | Đơn nghỉ, phê duyệt đa cấp, theo dõi số dư phép | ✅ Đầy đủ |
| 6 | Quản lý tăng ca | Đăng ký OT, phê duyệt, kiểm tra giới hạn theo luật | ✅ Đầy đủ |
| 7 | Quản lý hợp đồng | Lịch sử hợp đồng, cảnh báo hết hạn, các điều khoản lao động | ✅ Đầy đủ |
| 8 | Tính lương | Công thức lương Việt Nam, BHXH/BHYT/BHTN, thuế TNCN lũy tiến | ✅ Đầy đủ |
| 9 | Phê duyệt bảng lương | Luồng phê duyệt 3 bên: HR → Kế toán → Giám đốc | ✅ Đầy đủ |
| 10 | Cấu hình hệ thống | Bảng lương, phụ cấp, thuế suất, lịch làm việc, ngày lễ | ✅ Đầy đủ |
| 11 | Báo cáo nhân sự | Chi phí nhân sự, bảo hiểm, tổng hợp thuế TNCN | ✅ Cơ bản |
| 12 | Tự phục vụ nhân viên | Xem hồ sơ, nộp đơn, xem phiếu lương | ✅ Cơ bản |
| 13 | Thông báo nội bộ | Thông báo tự động theo sự kiện nghiệp vụ | ✅ Đầy đủ |
| 14 | Nhật ký kiểm toán | Ghi nhận người tạo/sửa, thời gian thao tác | ✅ Đầy đủ |

---

### 1.2 Chi tiết các chức năng đã triển khai

#### 1.2.1 Xác thực và Bảo mật

- **Đăng nhập JWT:** Access token (5 phút) lưu trong bộ nhớ frontend + Refresh token (14 ngày) trong HttpOnly cookie, không lộ token qua JavaScript
- **Phân quyền RBAC 7 cấp:** EMPLOYEE → LEADER → MANAGER → HR_ADMIN → FINANCE_ADMIN → DIRECTOR → SYSTEM_ADMIN, kiểm soát qua `@PreAuthorize` tại từng endpoint
- **Giới hạn đăng nhập:** Tối đa 10 lần thất bại / 15 phút mỗi IP (Redis-backed), trả về HTTP 429 kèm thời gian chờ
- **Xác thực thiết bị chấm công:** API key SHA-256, vòng đời key có thể thu hồi và xoay vòng
- **Nhật ký kiểm toán:** Trường `createdBy`, `updatedBy`, `createdDate`, `updatedDate` tự động ghi nhận qua Spring Data JPA Auditing

#### 1.2.2 Quản lý Nhân viên

- Thêm, sửa, xóa mềm hồ sơ nhân viên
- Thông tin pháp lý bắt buộc: CCCD/CMND (unique), Mã số thuế cá nhân (unique), Số sổ BHXH (unique), Số tài khoản ngân hàng, ngày sinh, giới tính, quê quán
- Quản lý người phụ thuộc giảm trừ thuế TNCN theo Mẫu 02/CK-TNCN (quan hệ, ngày hiệu lực, trạng thái hoạt động)
- Ảnh đại diện nhân viên
- Tài khoản hệ thống liên kết 1:1 với hồ sơ nhân viên

#### 1.2.3 Quản lý Phòng ban

- CRUD phòng ban, phân công quản lý
- Danh sách nhân viên theo phòng ban, yêu cầu xác thực

#### 1.2.4 Chấm công

- Ghi nhận check-in/check-out qua thiết bị nhận diện khuôn mặt (xác thực bằng Device API Key)
- Tự động chuyển dữ liệu thô → bản ghi chấm công qua Spring Events (`@TransactionalEventListener`)
- Cron bù vào nửa đêm để xử lý các bản ghi bị bỏ sót
- Quản lý lịch nghỉ lễ quốc gia
- **Đóng kỳ chấm công:** điều kiện bắt buộc trước khi tính lương — HR_ADMIN chính thức bàn giao dữ liệu cho Kế toán
- Đối chiếu phân loại vắng mặt: nghỉ có phép / vắng không phép

#### 1.2.5 Quản lý Nghỉ phép

- Đầy đủ loại nghỉ phép theo Bộ Luật Lao Động 2019: phép năm, ốm đau, thai sản, tang, cưới, học tập...
- Quản lý số dư phép hai giai đoạn: dự trữ (`pendingDays`) khi nộp đơn → xác nhận (`usedDays`) khi phê duyệt → hoàn trả khi từ chối
- Quy trình phê duyệt đa cấp: EMPLOYEE → LEADER → MANAGER → HR_ADMIN
- Thông báo tự động đến người phê duyệt tiếp theo khi có đơn mới

#### 1.2.6 Quản lý Tăng ca

- Đăng ký OT, quy trình phê duyệt đa cấp tương tự nghỉ phép
- Kiểm tra giới hạn OT theo Điều 107 BLLĐ: 40 giờ/tháng và 200 giờ/năm, trả về HTTP 400 kèm số giờ OT còn lại
- Tính phụ cấp đêm tỷ lệ theo thời gian thực tế trong khung 22:00–06:00 (tính theo phút)
- Hệ số OT: ×1.5 (ngày thường), ×2.0 (cuối tuần), ×3.0 (ngày lễ)

#### 1.2.7 Quản lý Hợp đồng

- Lưu lịch sử hợp đồng: mỗi hợp đồng có `effectiveFrom` / `effectiveTo` / cờ `current`, không ghi đè
- Cảnh báo hợp đồng sắp hết hạn: cron hàng ngày + thông báo nội bộ
- Ngày tháng lưu dạng `LocalDate` (chuẩn ISO-8601)
- API danh sách hợp đồng sắp hết hạn trong N ngày tới

#### 1.2.8 Tính lương

- **Công thức lương Việt Nam:** `Lhq × KPItb + Li + HTi` (tính theo ngày công thực tế trong kỳ)
- **Tự động tính điểm KPI trung bình** dựa trên dữ liệu chấm công của kỳ
- **Bảo hiểm người lao động:** BHXH 8%, BHYT 1.5%, BHTN 1% (trên lương đóng BHXH)
- **Bảo hiểm người sử dụng lao động:** BHXH 17%, BHYT 3%, BHTN 1%, TNLĐ-BNN 0.5%
- **Trần bảo hiểm:** 46.8 triệu VND áp dụng thống nhất cả hai phía
- **Thuế TNCN lũy tiến 7 bậc** đọc từ `SystemConfig` — không hardcode thuế suất
- **Tính lương tăng ca:** theo hệ số OT + phụ cấp đêm tỷ lệ

#### 1.2.9 Quy trình Phê duyệt Bảng lương (Phân tách trách nhiệm)

Quy trình bảng lương phân tách rõ ba bộ phận tổ chức:

```
HR_ADMIN  → Đóng kỳ chấm công (bàn giao dữ liệu cho Kế toán)
FINANCE_ADMIN → Tính lương (DRAFT) → Nộp duyệt (PENDING_APPROVAL)
DIRECTOR  → Phê duyệt (APPROVED) hoặc Từ chối kèm lý do (REJECTED)
FINANCE_ADMIN → Xác nhận đã thanh toán (PAID)
```

Vòng đời phiếu lương: `DRAFT → PENDING_APPROVAL → APPROVED → PAID` (hoặc `REJECTED`)

#### 1.2.10 Cấu hình Hệ thống

FINANCE_ADMIN quản lý toàn bộ cấu hình nghiệp vụ mà không cần can thiệp kỹ thuật:

- Bảng lương (`SALARY_GRADE`): mức lương theo ngạch/bậc
- Phụ cấp (`ALLOWANCE`): các khoản phụ cấp cố định
- Khung thuế TNCN (`PIT_BRACKET`): 7 bậc lũy tiến
- Tỷ lệ bảo hiểm (`INSURANCE_RATE`): BHXH, BHYT, BHTN
- Lịch làm việc (`WORK_SCHEDULE`): giờ bắt đầu, số giờ chuẩn mỗi ngày
- Lịch nghỉ lễ (`PUBLIC_HOLIDAY`): danh sách ngày nghỉ quốc gia theo năm

#### 1.2.11 Báo cáo

- Báo cáo chi phí nhân sự tổng hợp (lương + BHXH NSDLĐ)
- Báo cáo đóng bảo hiểm hàng tháng (remittance report)
- Báo cáo tổng hợp thuế TNCN hàng tháng
- Phiếu lương điện tử: nhân viên tự xem lương và các khoản khấu trừ

#### 1.2.12 Giao diện Người dùng

- Dashboard riêng biệt cho từng vai trò (EMPLOYEE, LEADER, MANAGER, HR_ADMIN, FINANCE_ADMIN, DIRECTOR, SYSTEM_ADMIN)
- Quản lý toàn bộ nghiệp vụ qua giao diện web (Next.js 15, React 19)
- Xác thực token tự động: làm mới access token khi hết hạn, không bắt người dùng đăng nhập lại

---

## PHẦN 2: KẾ HOẠCH CÔNG VIỆC TIẾP THEO

### 2.1 Hoàn thiện tính năng còn thiếu (Phase 9)

#### 2.1.1 Các vấn đề bảo mật cần xử lý trước tiên

| STT | Nhiệm vụ | Ưu tiên | Chi tiết |
|-----|----------|---------|---------|
| 1 | Xóa giá trị mặc định `JWT_SECRET` | 🔴 CRITICAL | Đổi `secret: ${JWT_SECRET:12345678...}` thành `secret: ${JWT_SECRET}` — ứng dụng phải từ chối khởi động nếu biến môi trường chưa được đặt |
| 2 | Chuyển log DEBUG về môi trường dev | 🟠 CAO | Chuyển `org.springframework.security: DEBUG` và `org.flywaydb: DEBUG` từ `application.yml` sang `application-dev.yml`; đặt mức `WARN` trong base config |

#### 2.1.2 Cải thiện độ ổn định và hoàn chỉnh tính năng

| STT | Nhiệm vụ | Ưu tiên | Chi tiết |
|-----|----------|---------|---------|
| 3 | Lưu trạng thái job tính lương vào database | 🟡 TRUNG BÌNH | Thay `PayrollJobStore` (ConcurrentHashMap in-memory) bằng entity `PayrollJob` + Flyway migration V20; trạng thái không mất khi restart |
| 4 | Validation cấu trúc JSON cho SystemConfig | 🟡 TRUNG BÌNH | Kiểm tra cấu trúc JSON theo từng loại config (`configType`) khi lưu — tránh lỗi phát hiện muộn trong quá trình tính lương batch |
| 5 | Xuất phiếu lương dạng PDF | 🟡 TRUNG BÌNH | Tạo endpoint xuất PDF (iText hoặc JasperReports) và nút "Tải phiếu lương" trên giao diện nhân viên |
| 6 | Kiểm tra trùng lịch nghỉ phép | 🟡 TRUNG BÌNH | Khi nộp đơn nghỉ, kiểm tra xem có đơn đang chờ/đã duyệt nào trùng ngày không; trả về HTTP 400 nếu có |
| 7 | Lưu ảnh đại diện trên cloud storage | 🟡 TRUNG BÌNH | Thay local file storage bằng MinIO/S3-compatible; cấu hình qua các biến môi trường `STORAGE_*` |
| 8 | Tự động chuyển số ngày phép năm (rollover) | 🟢 THẤP | Cron chạy ngày 02/01 hàng năm: tính số ngày phép tồn, áp dụng giới hạn `carryOverCap`, cộng vào `carriedOverDays` của năm mới |
| 9 | Versioning API | 🟢 THẤP | Đổi tiền tố từ `/api/` sang `/api/v1/` để hỗ trợ nâng cấp không phá vỡ client cũ |

---

### 2.2 Nhiệm vụ Triển khai (Deployment)

#### 2.2.1 Containerization

- Viết `Dockerfile` cho backend (Spring Boot executable JAR, multi-stage build)
- Viết `Dockerfile` cho frontend (Next.js, build static + serve)
- Cập nhật `compose.yaml` để bao gồm đầy đủ: backend, frontend, PostgreSQL, Redis, MinIO (nếu dùng cloud storage)
- Kiểm tra toàn bộ stack hoạt động đúng bằng `docker compose up`

#### 2.2.2 Cấu hình biến môi trường cho Production

Tất cả thông tin nhạy cảm phải được đặt qua biến môi trường — không có giá trị mặc định trong code:

| Biến môi trường | Bắt buộc | Mô tả |
|----------------|----------|-------|
| `JWT_SECRET` | ✅ | Chuỗi ngẫu nhiên tối thiểu 32 ký tự |
| `DB_URL` | ✅ | JDBC URL tới PostgreSQL production |
| `DB_USERNAME` | ✅ | Tài khoản database (không dùng `postgres`) |
| `DB_PASSWORD` | ✅ | Mật khẩu database |
| `REDIS_HOST` | ✅ | Hostname của Redis server |
| `REDIS_PORT` | ✅ | Port Redis (mặc định 6379) |
| `CORS_ALLOWED_ORIGINS` | ✅ | Domain frontend production (ví dụ: `https://hrm.company.vn`) |
| `STORAGE_ENDPOINT` | ⚠️ | URL MinIO/S3 (khi hoàn thành cloud storage) |
| `STORAGE_BUCKET` | ⚠️ | Tên bucket lưu ảnh |
| `STORAGE_ACCESS_KEY` | ⚠️ | Access key MinIO/S3 |
| `STORAGE_SECRET_KEY` | ⚠️ | Secret key MinIO/S3 |

#### 2.2.3 Cơ sở dữ liệu Production

- Tạo user PostgreSQL riêng với quyền hạn tối thiểu (không dùng superuser `postgres`)
- Kiểm tra Flyway tự động chạy đầy đủ 19+ migrations khi khởi động lần đầu
- Thiết lập backup tự động: `pg_dump` định kỳ hoặc snapshot ở mức infrastructure

#### 2.2.4 Bảo mật Production

- Bật HTTPS: cấu hình TLS certificate (Let's Encrypt hoặc cert nội bộ)
- Cấu hình reverse proxy (Nginx hoặc Traefik) trước backend và frontend
- Tắt Swagger UI: thêm `springdoc.swagger-ui.enabled: false` vào `application-prod.yml`
- Xác nhận lần cuối: `show-sql: false`, `ddl-auto: none`, log level `WARN` trong base config

#### 2.2.5 Kiểm thử trước khi triển khai

- Chạy toàn bộ test suite backend: `./mvnw test`
- Kiểm tra luồng nghiệp vụ đầu-cuối: check-in → đóng kỳ → tính lương → phê duyệt → xem phiếu lương
- Kiểm tra phân quyền: `HR_ADMIN` không gọi được `/api/payrolls/calculate`; `DIRECTOR` không gọi được API nhân sự
- Kiểm tra rate limiting: sau 10 lần đăng nhập sai, IP bị chặn và nhận HTTP 429
- Kiểm tra Flyway: migrations chạy đúng thứ tự trên DB production mới

#### 2.2.6 Giám sát sau triển khai (Monitoring)

- **Spring Boot Actuator** đã sẵn sàng: `/actuator/health` (public), `/actuator/metrics` (SYSTEM_ADMIN)
- Cấu hình thu thập log tập trung: ELK Stack hoặc Grafana Loki để tổng hợp log JSON từ backend
- Thiết lập cảnh báo cho các chỉ số quan trọng: CPU, bộ nhớ, connection pool database, tỷ lệ lỗi HTTP 5xx
- Kiểm tra định kỳ endpoint `/actuator/health` từ hệ thống monitoring ngoài (uptime check)

---

### 2.3 Tổng hợp công việc theo thứ tự ưu tiên

| Thứ tự | Nhiệm vụ | Loại | Ưu tiên |
|--------|----------|------|---------|
| 1 | Xóa `JWT_SECRET` mặc định | Bảo mật | 🔴 CRITICAL |
| 2 | Chuyển DEBUG log về dev profile | Bảo mật | 🟠 CAO |
| 3 | Viết Dockerfile (backend + frontend) | Triển khai | 🟠 CAO |
| 4 | Cấu hình biến môi trường production | Triển khai | 🟠 CAO |
| 5 | Lưu trạng thái job tính lương vào DB | Tính năng | 🟡 TRUNG BÌNH |
| 6 | Validation JSON cho SystemConfig | Tính năng | 🟡 TRUNG BÌNH |
| 7 | Xuất phiếu lương PDF | Tính năng | 🟡 TRUNG BÌNH |
| 8 | Kiểm tra trùng lịch nghỉ phép | Tính năng | 🟡 TRUNG BÌNH |
| 9 | Cloud storage cho ảnh đại diện | Hạ tầng | 🟡 TRUNG BÌNH |
| 10 | Cấu hình reverse proxy + HTTPS | Triển khai | 🟡 TRUNG BÌNH |
| 11 | Kiểm thử đầu-cuối toàn bộ luồng | Kiểm thử | 🟡 TRUNG BÌNH |
| 12 | Tự động rollover số ngày phép | Tính năng | 🟢 THẤP |
| 13 | Versioning API `/api/v1/` | Kỹ thuật | 🟢 THẤP |
| 14 | Cấu hình monitoring & cảnh báo | Vận hành | 🟢 THẤP |
