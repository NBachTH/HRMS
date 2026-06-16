# Nhận Xét Hệ Thống & Khuyến Nghị — FaceZ HRMS
### Đánh giá trên 4 trục: Hoàn thiện theo Business Rule thực tế · Tuân thủ Convention API · Bảo mật · Hiệu năng

**Phiên bản:** 1.0 | **Ngày:** 16-06-2026 | **Người đánh giá:** Claude Code
**Cơ sở đối chiếu:** mã nguồn thực tế (`facez/`, `facez-front/`), Flyway `V1`–`V27`, `SecurityConfig`,
`PayrollCalculationEngine`, `ApiResponse`, `GlobalExceptionHandler`.
**Tài liệu liên quan:** [Bộ design-spec](design-spec/00-README.md) · [Business Rules](design-spec/01-business/03-business-rules.md) · [Security Design](design-spec/02-technical/10-security-design.md)

> Tài liệu này nối tiếp loạt audit `01`–`06`. Nó **không** mô tả lại hệ thống (đã có ở bộ design-spec)
> mà tập trung **đánh giá mức độ hoàn thiện và đưa khuyến nghị**, có trích dẫn vị trí mã nguồn.

---

## 0. Tóm tắt điều hành (Executive Summary)

| Trục đánh giá | Điểm | Nhận định ngắn |
|---------------|:----:|----------------|
| Hoàn thiện theo Business Rule | **8.5/10** | Công thức lương, RBAC, workflow đa cấp, config hiệu lực theo ngày đều đã hiện thực đúng nghiệp vụ; còn vài rule chưa enforce chặt (leave balance, soft-delete). |
| Tuân thủ Convention API | **8.5/10** | Envelope `ApiResponse<T>` thống nhất + `GlobalExceptionHandler` chuẩn HTTP; điểm trừ: vài endpoint trả `T[]` lẫn `PageResponse<T>`, thiếu chuẩn 201/Location. |
| Bảo mật | **7/10** | Kiến trúc JWT + RBAC 2 lớp + device key hash tốt; **rủi ro nghiêm trọng: JWT secret mặc định hard-code trong `application.yml`**, log security ở mức DEBUG, chưa mã hóa field nhạy cảm. |
| Hiệu năng | **7/10** | Batch payroll bất đồng bộ hợp lý; rủi ro: vòng lặp OT theo từng phút, `PayrollJobStore` in-memory, nguy cơ N+1 khi pure-engine nạp dữ liệu rời rạc. |

**Kết luận:** Hệ thống đã ở mức **gần production-ready cho triển khai đơn-node**. Cần xử lý dứt điểm
**3 vấn đề bảo mật chặn release** (mục 3.1) và **2 vấn đề hiệu năng** (mục 4.1) trước khi vận hành thật.

---

## 1. Hoàn thiện theo Business Rule thực tế

### 1.1 Điểm đã làm tốt
- **Công thức lương đúng đặc tả** (`PayrollCalculationEngine.buildPayroll`): `baseGross = [(Lhq×KPItb)+Li+HTi]×(NCtt/Nt)`,
  có guard `Nt≤0`, làm tròn `HALF_UP`. Phụ cấp sinh hoạt prorate theo công thực tế (BR-PR-08). ✔
- **OT theo luật lao động VN**: thường ×1.5, cuối tuần ×2.0, lễ ×3.0, ca đêm 22:00–06:00 +0.3 (BR-PR-12..15). ✔
- **KPI2 tự suy diễn từ chấm công** (A/B/C → 1.04/1.02/1.00) đúng tham chiếu 01/2020/QC-VTI, cho phép override. ✔
- **Trần BHXH 20× lương tối thiểu** và **eligibility theo loại hợp đồng** đều áp dụng (BR-PR-16/17). ✔
- **Config hiệu lực theo ngày + maker-checker** (V27): engine chọn version `PUBLISHED` mới nhất có
  `effective_from ≤ kỳ lương` → tái lập được lương của bất kỳ kỳ lịch sử (BR-CFG-04). Đây là điểm
  thiết kế **xuất sắc** cho tuân thủ pháp lý. ✔
- **Tách bạch trách nhiệm (SoD)**: tính lương (Finance) ≠ duyệt lương (Director), enforce ở URL + role. ✔
- **Workflow đa cấp** leave/OT và payroll dùng state machine rõ ràng (`RequestStatus`, `PayrollStatus`). ✔
- **116 annotation `@PreAuthorize`** trong tầng domain → kiểm soát nghiệp vụ ở method-level khá dày. ✔

### 1.2 Khoảng trống / chưa enforce chặt (cần hoàn thiện)
| # | Vấn đề | Bằng chứng | Khuyến nghị |
|---|--------|-----------|-------------|
| BR-G1 | **Soft-delete chưa enforce toàn cục** — chỉ ~21 repository lọc `deleteFlag`; truy vấn khác có thể trả về bản ghi đã xóa mềm. | `grep deleteFlag` repository = 21 | Dùng Hibernate `@SQLRestriction("delete_flag = false")` trên entity, hoặc base repository lọc mặc định. |
| BR-G2 | **Kiểm tra số dư phép** nằm rải rác ở service, chưa có ràng buộc/transaction khóa rõ → nguy cơ vượt quỹ khi duyệt đồng thời. | `LeaveService` (BR-LV-05) | Khóa lạc quan (`@Version`) trên `leave_balance` + kiểm tra atomic khi APPROVED. |
| BR-G3 | **Trường tiền/ngày kiểu `VARCHAR` legacy** ở `contract`, `benefit` (start_date, base_salary VARCHAR) lẫn với cột typed mới. | V1 schema dòng 58–66 | Migration dọn dần sang typed; đánh dấu cột legacy `@Deprecated`. |
| BR-G4 | **`profile_picture` (OID LOB)** trùng lặp với `profile_picture_url`. | V1 dòng 104 + V16 | Bỏ cột OID sau khi backfill URL. |
| BR-G5 | **Vòng đời config `ARCHIVED`** chưa thấy tự động chuyển khi publish version mới (chỉ chặn trùng `effective_from`). | V27 partial unique index | Thêm bước archive version cũ khi publish để tránh tồn nhiều PUBLISHED. |
| BR-G6 | **KPI1 rating rỗng mặc định 1.00 (B)** — nếu Finance quên nhập, lương vẫn tính với hệ số trung bình, có thể sai lệch. | `resolveKpi1` default | Bắt buộc nhập KPI1 (validate) hoặc cảnh báo khi tính lương. |

**Đánh giá:** nghiệp vụ cốt lõi (lương, bảo hiểm, thuế, duyệt) đã đúng và đầy đủ; các khoảng trống còn
lại chủ yếu là **enforce toàn vẹn dữ liệu** chứ không phải sai công thức.

---

## 2. Tuân thủ Convention API

### 2.1 Điểm đã làm tốt
- **Envelope thống nhất `ApiResponse<T>`** `{success, message, data, timestamp}` với `@JsonInclude(NON_NULL)`;
  có factory `ok()/error()` chuẩn hóa (`common/response/ApiResponse.java`). ✔
- **`GlobalExceptionHandler` ánh xạ status chuẩn**: `ResourceNotFoundException`/`NoSuchElement`→404,
  `BadCredentials`→401, `MethodArgumentNotValid`/`BadRequest`→400, fallback `Exception`→500. ✔
- **Phân trang** dùng `Pageable`/`PageResponse<T>` rộng khắp (≈93 chỗ). ✔
- **Đặt tên tài nguyên RESTful** nhất quán: danh từ số nhiều (`/api/leaves`, `/api/payrolls`), action bằng
  sub-path (`/{id}/approve`, `/{id}/submit`), self-service `/my`. ✔
- **Tách biến đổi trạng thái dùng `PATCH`** (approve/mark-paid/publish) hợp lý về ngữ nghĩa. ✔

### 2.2 Điểm chưa nhất quán (cần chuẩn hóa)
| # | Vấn đề | Bằng chứng | Khuyến nghị |
|---|--------|-----------|-------------|
| API-G1 | **List endpoint trả `T[]` lẫn `PageResponse<T>`** tùy query param → client phải `Array.isArray(...)`. | CLAUDE.md note + apiClient | Luôn trả `PageResponse<T>` cho list; nếu cần list đầy đủ, thêm endpoint `/all` rõ ràng. |
| API-G2 | **POST tạo mới trả 200 thay vì 201 + `Location`** (đa số controller). | Pattern controller | Trả `201 Created` + header `Location` cho tạo tài nguyên. |
| API-G3 | **Trộn `PUT` và `PATCH` cho action**: leave dùng `PUT /{id}/approve`, payroll dùng `PATCH /{id}/approve`. | LeaveController vs PayrollController | Thống nhất `PATCH` cho chuyển trạng thái. |
| API-G4 | **Lỗi nghiệp vụ "mềm" trả 200** (period-close dry-run `closed=false`). | AttendanceController | Chấp nhận được nhưng nên tài liệu hóa rõ; cân nhắc 200 + cờ trong `data` (đang làm) — giữ nhất quán. |
| API-G5 | **`message` lỗi có thể là tiếng Anh kỹ thuật** → khó dùng trực tiếp cho người dùng cuối VN. | engine error strings | Tách `code` máy đọc + `message` i18n; FE map sang thông báo tiếng Việt. |
| API-G6 | **Phiên bản hóa API**: chưa có `/v1`. | base path `/api/...` | Thêm `/api/v1` để mở đường nâng cấp không phá vỡ client. |

**Đánh giá:** convention nền tảng (envelope, status, naming) **tốt và nhất quán**; các điểm trừ là
chuẩn hóa chi tiết (pagination shape, 201/Location, PUT vs PATCH) — chi phí sửa thấp, nên làm sớm.

---

## 3. Bảo mật

### 3.1 🔴 Vấn đề chặn release (Critical)
| # | Vấn đề | Bằng chứng | Khắc phục |
|---|--------|-----------|-----------|
| SEC-C1 | **JWT secret mặc định hard-code** trong `application.yml`: `secret: ${JWT_SECRET:12345678abcdefgh12345678abcdefgh}`. Nếu prod quên set env, token ký bằng secret công khai → **giả mạo token tùy ý**. | `application.yml` dòng 40 | Bỏ default; fail-fast khi thiếu `JWT_SECRET`. Dùng secret ≥256-bit ngẫu nhiên, quản lý qua secret manager. |
| SEC-C2 | **MinIO credential mặc định** `admin/password123` trong cấu hình. | `application.yml` dòng 8–9 | Bắt buộc override; không để default trong file versioned. |
| SEC-C3 | **Log `org.springframework.security: DEBUG`** mặc định → rò rỉ chi tiết auth/token vào log ở mọi môi trường. | `application.yml` dòng 70–75 | Hạ `INFO/WARN` cho prod qua profile; không log token/secret. |

### 3.2 🟠 Cần cải thiện (Major)
| # | Vấn đề | Bằng chứng | Khắc phục |
|---|--------|-----------|-----------|
| SEC-M1 | **Chưa mã hóa field nhạy cảm** (nationalId, taxCode, socialInsuranceCode, số tài khoản ngân hàng) — chỉ giới hạn truy cập theo role. | `employee_info` | Mã hóa cấp cột (JPA `AttributeConverter`/pgcrypto) cho PII pháp lý. |
| SEC-M2 | **Chưa có bảng audit-log chuyên dụng** — chỉ có cột audit trên entity; khó truy vết hành vi (ai xem payslip ai). | `AuditableEntity` | Thêm append-only audit/event log cho hành động nhạy cảm (duyệt lương, đổi config, reset mật khẩu). |
| SEC-M3 | **Tài khoản admin seed `admin/admin123`** dễ quên đổi. | `DataInitializerConfig` | Bắt buộc đổi mật khẩu lần đầu; vô hiệu hóa seed ở prod. |
| SEC-M4 | **`/api/system-configs/**` chỉ yêu cầu `FINANCE_ADMIN`** dù comment nói "SysAdmin for all" — lệch giữa ý định và rule. | `SecurityConfig` dòng 104–105 | Rà soát lại ma trận quyền config legacy vs V27. |
| SEC-M5 | **CORS `allowedHeaders("*")` + `allowCredentials(true)`** — chấp nhận được vì origin bị giới hạn, nhưng rộng. | `SecurityConfig` dòng 119–124 | Thu hẹp header cho phép; xác nhận `CORS_ALLOWED_ORIGINS` đúng cho từng môi trường. |

### 3.3 🟢 Đã làm tốt
- JWT access ngắn (5 phút) + refresh xoay vòng/thu hồi qua Redis; access token giữ in-memory ở FE (chống XSS). ✔
- Device key **chỉ lưu SHA-256**, raw key hiện 1 lần, có deactivate để xoay. ✔
- RBAC 2 lớp (URL + `@PreAuthorize`), SoD trên payroll, rate limit login 10/15 phút/IP. ✔
- BCrypt mật khẩu, lưu `last_password_hash` chống tái sử dụng ngay. ✔
- `GlobalExceptionHandler` không trả stack trace ra client. ✔
- Refresh cookie `secure: true`, `sameSite: Lax`. ✔

**Đánh giá:** **kiến trúc bảo mật tốt** nhưng bị kéo điểm bởi **cấu hình mặc định nguy hiểm trong file
versioned** (SEC-C1..C3). Đây là các lỗi *cấu hình*, sửa nhanh nhưng **bắt buộc** trước production.

---

## 4. Hiệu năng

### 4.1 🟠 Rủi ro cần xử lý
| # | Vấn đề | Bằng chứng | Khắc phục |
|---|--------|-----------|-----------|
| PERF-1 | **Tính phút ca đêm OT theo vòng lặp từng phút** — `for i in 0..totalMinutes`, mỗi phút tạo `LocalDateTime`. OT dài/batch lớn tốn CPU & GC. Chính code đã ghi chú "optimise for production if needed". | `PayrollCalculationEngine.calculateNightOverlapMinutes` dòng 209–218 | Thay bằng tính khoảng giao [start,end) với cửa sổ đêm theo công thức (O(1) mỗi request), không lặp phút. |
| PERF-2 | **`PayrollJobStore` in-memory** — trạng thái job batch mất khi restart, không chia sẻ giữa node. | CLAUDE.md + PayrollBatchService | Lưu job vào Redis/DB; cần thiết khi scale-out (job vốn idempotent nên re-run được). |
| PERF-3 | **Nguy cơ N+1** khi engine "pure" cần caller nạp `Contract`, `WorkDay[]`, `OTRequest[]`, config rời rạc cho từng nhân viên trong batch. | thiết kế engine + PayrollConfigService | Trong batch: nạp theo lô (`findByEmployeeIdIn`, fetch-join), cache config theo kỳ (đọc 1 lần/kỳ thay vì mỗi nhân viên). |
| PERF-4 | **`existsByHolidayDate` gọi trong vòng lặp OT** — mỗi OTRequest 1 query DB. | engine dòng 188 | Nạp set ngày lễ của tháng 1 lần, kiểm tra in-memory. |

### 4.2 🟢 Đã làm tốt
- **Batch payroll `@Async`** + polling jobId → không chặn người vận hành (đáp ứng NFR-5). ✔
- **Engine thuần tính toán, không DB/transaction** → dễ test, tách I/O khỏi tính toán. ✔
- **Phân trang rộng khắp** tránh trả toàn bộ bảng. ✔
- **Index hợp lý**: unique `(employee, date)`, `(employee, year, month)`, lookup config `(status, effective_from)`. ✔
- **Redis** cho token & rate-limit giảm tải DB. ✔
- **`@Async` two-method** tránh self-invocation proxy. ✔

### 4.3 Khuyến nghị đo lường
- Bật `/actuator/metrics` (đã expose) + thêm timer cho `buildPayroll` và batch để có số liệu thực.
- Tải thử: batch 500–1000 nhân viên, burst chấm công đầu giờ (PT-01/PT-02 trong [Test Plan](design-spec/03-operational/12-test-plan.md)).
- Cân nhắc `show-sql`/p6spy ở staging để phát hiện N+1 thực tế.

---

## 5. Bảng khuyến nghị ưu tiên (Roadmap khắc phục)

| Ưu tiên | Hạng mục | Nỗ lực | Tác động |
|:-------:|----------|:------:|----------|
| **P0** | SEC-C1 bỏ JWT secret mặc định (fail-fast) | Thấp | Chặn giả mạo token |
| **P0** | SEC-C2 bỏ MinIO credential mặc định | Thấp | Chặn truy cập trái phép object store |
| **P0** | SEC-C3 hạ mức log security ở prod | Thấp | Ngừng rò rỉ thông tin auth |
| **P1** | PERF-1 thay vòng lặp phút ca đêm bằng O(1) | TB | Giảm CPU batch lương |
| **P1** | PERF-3/PERF-4 nạp lô + cache config/ngày lễ trong batch | TB | Giảm mạnh số query |
| **P1** | BR-G1 enforce soft-delete toàn cục | TB | Đúng đắn dữ liệu, tránh lộ bản ghi đã xóa |
| **P1** | SEC-M3 ép đổi mật khẩu admin lần đầu | Thấp | Giảm rủi ro tài khoản mặc định |
| **P2** | API-G1 chuẩn hóa list luôn `PageResponse` | TB | Giảm code phòng thủ ở FE |
| **P2** | API-G2/G3 chuẩn 201/Location, thống nhất PATCH | Thấp | Sạch convention |
| **P2** | SEC-M1 mã hóa PII pháp lý | TB-Cao | Tuân thủ bảo vệ dữ liệu |
| **P2** | PERF-2 đưa PayrollJobStore ra Redis/DB | TB | Sẵn sàng scale-out |
| **P3** | BR-G2 khóa lạc quan số dư phép | TB | Tránh vượt quỹ phép đồng thời |
| **P3** | BR-G3/G4 dọn cột legacy VARCHAR/OID | Cao | Gọn schema |
| **P3** | API-G6 versioning `/api/v1` | TB | Mở đường nâng cấp |

---

## 6. Kết luận

FaceZ HRMS là một hệ thống **được thiết kế tốt, bám sát nghiệp vụ tiền lương Việt Nam**, với hai điểm
sáng kiến trúc: **engine tính lương thuần** và **cấu hình hiệu lực theo ngày kiểu maker-checker** giúp
tái lập số liệu lịch sử và đổi quy định pháp lý không cần sửa code.

Mức độ hoàn thiện nghiệp vụ và convention API đều **khá cao (≈8.5/10)**. Rào cản thực sự để lên
production **không nằm ở nghiệp vụ mà ở cấu hình bảo mật mặc định** (JWT/MinIO secret, log DEBUG) —
đều là sửa nhanh ở mức P0. Sau khi xử lý nhóm P0 và 2–3 hạng mục hiệu năng P1, hệ thống **đủ điều kiện
vận hành thật cho mô hình đơn-node**; để scale-out cần thêm PERF-2 (job store) và externalize lưu trữ file.
