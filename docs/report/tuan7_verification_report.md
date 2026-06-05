# Báo Cáo Xác Minh — Tuần 6–7 vs Trạng Thái Thực Tế Codebase
**Ngày xác minh:** 21/05/2026
**Tài liệu gốc:** `tuan7_report.md` (23/04/2026)
**Xác minh dựa trên:** Kiểm tra trực tiếp source code + tài liệu v2.0 (01–06)

---

## 1. Tóm Tắt Kết Luận

| Nhóm | Số lượng |
|------|:--------:|
| ✅ Hoàn thành đúng như báo cáo | 28 |
| ⚠️ Hoàn thành nhưng có sai lệch kỹ thuật so với báo cáo | 4 |
| ❌ Báo cáo nói "đang chạy / đã xong" nhưng thực tế chưa làm | 2 |
| 🔲 Kế hoạch tiếp theo (báo cáo liệt kê) chưa thực hiện | 5 |
| 🆕 Vấn đề mới phát hiện trong v2.0, không có trong báo cáo | 6 |

**Đánh giá tổng thể:** Phần lớn nghiệp vụ cốt lõi (Phase 0–8) đã hoàn thành đúng. Có **4 sai lệch kỹ thuật đáng chú ý** và **2 hạng mục báo cáo mô tả sai trạng thái** (quan trọng nhất là vấn đề `JWT_SECRET` và Object Storage). Ngoài ra có **6 gap mới** phát hiện khi rà soát v2.0 mà báo cáo tuần 6–7 không đề cập.

---

## 2. Xác Minh Chi Tiết Từng Hạng Mục

---

### 2.1 Phase 0 — Nền Tảng Hạ Tầng

| Hạng mục | Báo cáo nói | Thực tế code | Trạng thái |
|----------|-------------|-------------|:----------:|
| Flyway thay `ddl-auto: update` | ✅ Hoàn thành, V1–V17 | ✅ Hoàn thành — thực tế có V1–**V19** (2 file thêm: V18 notification, V19 final corrections) | ✅ |
| `ddl-auto: none` | ✅ | ✅ Xác nhận trong `application.yml` | ✅ |
| **`JWT_SECRET` không có default** | `secret: ${JWT_SECRET}` — **"bắt buộc set tường minh"** | `secret: ${JWT_SECRET:`**`12345678abcdefgh12345678abcdefgh`**`}` — **default vẫn còn trong code** | ❌ |
| CORS từ env var | ✅ | ✅ `${CORS_ALLOWED_ORIGINS:http://localhost:3000}` | ✅ |
| `AuditableEntity` | ✅ `@CreatedBy`, `@LastModifiedBy`, `@CreatedDate`, `@LastModifiedDate` | ✅ Xác nhận — `JpaAuditingConfig.java` riêng biệt | ✅ |
| **Rate limiting — Bucket4j-Redis** | "Bucket4j với `RedissonBasedProxyManager`" | **`LoginRateLimiter.java` dùng `RedisTemplate.opsForValue().increment()`** — plain Redis counter, **KHÔNG phải Bucket4j**. Không có dependency Bucket4j trong `pom.xml`. | ⚠️ |
| Rate limiting — chức năng | 10 req/15 phút/IP, HTTP 429, `Retry-After` | ✅ Chức năng đúng — chỉ implementation khác | ✅ |
| Environment profiles (dev/staging/prod) | ✅ | ✅ Ba file yml đều có | ✅ |
| V2 — audit columns | ✅ | ✅ `created_by`, `updated_by` | ✅ |

> **❌ Rủi ro cao — JWT_SECRET default:** Báo cáo ghi nhận đã xóa default và yêu cầu set tường minh. Thực tế `application.yml` vẫn có fallback `12345678abcdefgh12345678abcdefgh`. Bất kỳ môi trường production nào không set biến `JWT_SECRET` sẽ chấp nhận token giả mạo ký bằng key đã biết này. **Cần sửa gấp trước khi deploy.**

---

### 2.2 Phase 1 — Kiến Trúc Phân Quyền

| Hạng mục | Báo cáo nói | Thực tế code | Trạng thái |
|----------|-------------|-------------|:----------:|
| Vai trò `FINANCE_ADMIN` và `DIRECTOR` | ✅ | ✅ Xác nhận trong `Role` enum | ✅ |
| `PayrollStatus`: 5 trạng thái | `DRAFT → PENDING_APPROVAL → APPROVED → PAID / REJECTED` | ✅ Xác nhận, kèm `rejection_reason` VARCHAR(500) | ✅ |
| Sửa lỗi `approve()` guard sai | "Guard cũ so sánh với `DRAFT` thay vì `PENDING_APPROVAL`" | ✅ Xác nhận đã sửa | ✅ |
| `FINANCE_ADMIN` sở hữu `/calculate`, `/batch-calculate` | ✅ | ✅ HTTP 403 nếu HR_ADMIN gọi | ✅ |
| `DIRECTOR` sở hữu `/approve`, `/reject` | ✅ | ✅ | ✅ |
| Period close guard trong `PayrollService` | ✅ BadRequestException nếu chưa chốt | ✅ Xác nhận | ✅ |
| `GET /api/departments` → `authenticated()` | ✅ | ✅ Không còn public | ✅ |
| `FINANCE_ADMIN` quản lý `SystemConfig` | ✅ | ✅ | ✅ |
| SecurityConfig — `DeviceApiKeyFilter` trước `JwtAuthFilter` | ✅ | ✅ Dùng `UsernamePasswordAuthenticationFilter.class` làm anchor (Spring Security 7.x yêu cầu) | ✅ |

---

### 2.3 Phase 2 — Dữ Liệu Nhân Viên

| Hạng mục | Báo cáo nói | Thực tế code | Trạng thái |
|----------|-------------|-------------|:----------:|
| 11 trường pháp lý trên `EmployeeInfo` | `nationalId`, `taxCode`, `socialInsuranceCode`, `bankAccountNumber`, `bankName`, `bankBranch`, `dateOfBirth`, `gender`, `hometown`, + 2 trường issue date/place | ✅ + `profilePictureUrl` | ✅ |
| Partial unique index cho nullable fields | `WHERE column IS NOT NULL` | ✅ V6 migration | ✅ |
| Entity `TaxDependent` | ✅ — Mẫu 02/CK-TNCN | ✅ Xác nhận | ✅ |
| `TaxDependentController` | 3 endpoint | ✅ | ✅ |
| DTO cập nhật | ✅ | ✅ | ✅ |

---

### 2.4 Phase 3 — Pipeline Chấm Công

| Hạng mục | Báo cáo nói | Thực tế code | Trạng thái |
|----------|-------------|-------------|:----------:|
| Spring Events tách `CheckinLog → Attendance` | `@TransactionalEventListener(AFTER_COMMIT)` | ✅ Xác nhận — `@Transactional(propagation = REQUIRES_NEW)` đúng chuẩn Spring 7.x | ✅ |
| `WORK_SCHEDULE` config linh hoạt | ✅ V8 seed | ✅ | ✅ |
| `PublicHoliday` entity + seed 2026 | ✅ V9 | ✅ | ✅ |
| `AttendancePeriodClose` entity + endpoint | ✅ V5 | ✅ + kiểm tra vắng mặt chưa giải thích | ✅ |
| `AttendanceSchedule` cron nửa đêm | ✅ | ✅ | ✅ |

---

### 2.5 Phase 4 — Quản Lý Nghỉ Phép

| Hạng mục | Báo cáo nói | Thực tế code | Trạng thái |
|----------|-------------|-------------|:----------:|
| `LeaveType` enum (9 loại) | ✅ | ✅ | ✅ |
| Guard `PUBLIC_HOLIDAY`, `COMPENSATORY` | ✅ HTTP 400 | ✅ | ✅ |
| `LeaveBalance` entity | ✅ 5 trường: entitlement/carryOver/pending/used/remaining | ✅ + `carryOverCap` | ✅ |
| Cơ chế trừ hai giai đoạn | ✅ | ✅ — release pendingDays khi reject/delete | ✅ |
| V10, V11 migration | ✅ | ✅ | ✅ |
| Endpoints leave balance | 3 endpoint | ✅ | ✅ |
| Đối chiếu vắng mặt khi chốt tháng | ✅ | ✅ trong `PeriodCloseService` | ✅ |

---

### 2.6 Phase 5 — Vòng Đời Hợp Đồng

| Hạng mục | Báo cáo nói | Thực tế code | Trạng thái |
|----------|-------------|-------------|:----------:|
| `String → LocalDate` an toàn (cột song song) | ✅ V12 — kiểm tra regex trước | ✅ | ✅ |
| Lịch sử hợp đồng (`effectiveFrom`/`effectiveTo`/`current`) | ✅ V13 — xóa unique FK | ✅ | ✅ |
| `ContractExpiryScheduler` 08:00 hàng ngày | ✅ + `ContractExpiringEvent` → notification | ✅ | ✅ |
| `GET /api/contracts/expiring-soon` | ✅ | ✅ | ✅ |

---

### 2.7 Phase 6 — Tuân Thủ OT

| Hạng mục | Báo cáo nói | Thực tế code | Trạng thái |
|----------|-------------|-------------|:----------:|
| Giới hạn 40h/tháng và 200h/năm tính bằng phút | ✅ 2400 phút / 12000 phút | ✅ | ✅ |
| View `ot_monthly_summary` | ✅ V14a | ✅ | ✅ |
| Ca đêm tính chồng lấp từng phút | ✅ — ví dụ OT 20:00–23:00 → 60 phút ca đêm | ✅ `calculateNightOverlapMinutes()` | ✅ |
| Công thức OT đúng | `(hourlyRate/60) × (dayMin×base + nightMin×(base+0.3))` | ✅ | ✅ |

---

### 2.8 Phase 7 — Chức Năng Kế Toán

| Hạng mục | Báo cáo nói | Thực tế code | Trạng thái |
|----------|-------------|-------------|:----------:|
| 6 trường chi phí chủ sử dụng lao động | `bhxhEmployer` 17%, `bhytEmployer` 3%, `bhtnEmployer` 1%, accident 0.5%, `totalEmployerContributions`, `totalEmploymentCost` | ✅ V14b | ✅ |
| Trần BHXH từ `SystemConfig` (20 × lương tối thiểu) | ✅ | ✅ | ✅ |
| PIT lũy tiến 7 bậc từ `SystemConfig` | ✅ V15 seed | ✅ — giảm trừ bản thân 11M, phụ thuộc 4.4M | ✅ |
| 3 báo cáo kế toán (`labour-cost`, `insurance-remittance`, `pit-summary`) | ✅ | ✅ `PayrollReportService` | ✅ |
| Phiếu lương cá nhân `GET /api/payrolls/my/{year}/{month}/slip` | ✅ — chỉ APPROVED/PAID, chỉ xem của mình | ✅ | ✅ |

---

### 2.9 Phase 8 — Vận Hành và Bảo Mật

| Hạng mục | Báo cáo nói | Thực tế code | Trạng thái |
|----------|-------------|-------------|:----------:|
| Hệ thống thông báo | 5 loại event | ✅ V18 migration — `LeaveRequestSubmittedEvent`, `PayrollApprovedEvent`, `ContractExpiringEvent` xác nhận | ✅ |
| Actuator + Structured Logging | ✅ JSON log, RequestLoggingFilter | ✅ `logback-spring.xml`, V19 migration | ✅ |
| **`ApiKey.keyHash` — bcrypt** | Báo cáo ghi **"bcrypt hash"** | Thực tế `ApiKeyService.java` dùng **`sha256Hex()`** — SHA-256, KHÔNG phải bcrypt | ⚠️ |
| Device API key — chức năng | Deactivate key cũ, hiển thị 1 lần, không lưu plaintext | ✅ Chức năng đúng — chỉ thuật toán hash khác với mô tả | ✅ |
| **Object Storage Release B** | Báo cáo: "**migration job đang chạy**; Release C chờ xác minh" | **Không triển khai.** `ProfilePictureService` lưu file local. Không có cấu hình MinIO/S3 trong code. | ❌ |
| V16a — cột `profile_picture_url` | ✅ | ✅ | ✅ |
| `POST /api/employees/{id}/profile-picture` | ✅ multipart | ✅ — local disk, validate JPEG/PNG/WebP, max 5MB | ⚠️ |
| V18, V19 migrations | **Không đề cập** (báo cáo dừng ở V17) | ✅ V18 (`notification` table), V19 (sửa tên cột notification) | ✅ |

---

## 3. Ma Trận Tổng Hợp Sai Lệch

### 3.1 Sai Lệch Kỹ Thuật (hoạt động đúng nhưng implementation khác báo cáo)

| # | Hạng mục | Báo cáo mô tả | Thực tế |
|---|----------|---------------|---------|
| S1 | Rate limiting | Bucket4j + `RedissonBasedProxyManager` | Plain Redis counter (`RedisTemplate.increment`) |
| S2 | API key hash | bcrypt | SHA-256 hex (`sha256Hex()`) |
| S3 | `profile_picture` BLOB | Chưa xóa cột BLOB | Cột BLOB chưa tồn tại trong baseline — chỉ có `profile_picture_url` |
| S4 | Migrations | "V1–V17 hoàn thành" | V1–V19 thực tế (thêm V18, V19) |

> **Nhận xét S1:** bcrypt không phù hợp cho API key lookup vì bcrypt không thể so sánh hash trực tiếp — mỗi lần phải hash input và so sánh. SHA-256 là lựa chọn đúng đắn hơn cho use case này. **Thực tế implementation đúng hơn báo cáo.**

> **Nhận xét S2:** Bucket4j cung cấp sliding window chính xác hơn. Redis counter đơn giản dễ có race condition nhỏ ở edge case. Về bảo mật thực tế ở scale hiện tại là chấp nhận được.

---

### 3.2 Sai Lệch Về Trạng Thái (báo cáo nói "đã làm" nhưng chưa)

| # | Hạng mục | Báo cáo nói | Thực tế | Mức độ |
|---|----------|-------------|---------|:------:|
| **E1** | `JWT_SECRET` không có default | "Bắt buộc set tường minh" | Default `12345678abcdefgh12345678abcdefgh` vẫn trong `application.yml` | 🔴 **Cao** |
| **E2** | Object Storage Release B | "Migration job đang chạy" | Chưa triển khai — chỉ có local file storage | 🟡 **Trung bình** |

---

### 3.3 Kế Hoạch Tiếp Theo (báo cáo liệt kê, chưa thực hiện — đã biết)

| # | Nhiệm vụ | Ưu tiên (theo báo cáo) |
|---|----------|:---------------------:|
| P1 | Object Storage Release C (V16b — xóa BLOB) | Cao |
| P2 | PDF Payslip Export | Trung bình |
| P3 | Excel Reports | Trung bình |
| P4 | Frontend hoàn thiện (các trang 90%) | Trung bình |
| P5 | Account Management (unlock, reset, login history) | Thấp |

---

### 3.4 Gap Mới Phát Hiện Trong v2.0 (không có trong báo cáo tuần 6–7)

| # | Gap | Mức độ | Phase 9 ref |
|---|-----|:------:|------------|
| **N1** | `org.springframework.security: DEBUG` và `org.flywaydb: DEBUG` trong base `application.yml` (áp dụng cả môi trường production) | 🟡 Trung bình | Phase 9.1 |
| **N2** | `PayrollJobStore` vẫn lưu trạng thái batch payroll trong bộ nhớ (`ConcurrentHashMap`) — mất dữ liệu nếu restart | 🟡 Trung bình | Phase 9.2 |
| **N3** | Không có validation schema JSON cho `SystemConfig.configData` — cấu hình sai chỉ bị phát hiện khi tính lương | 🟡 Trung bình | Phase 9.3 |
| **N4** | Không có API versioning prefix (`/api/v1/`) | 🟢 Thấp | Phase 9.6 |
| **N5** | Không có kiểm tra nghỉ phép trùng ngày cho cùng nhân viên | 🟢 Thấp | Phase 9.7 |
| **N6** | Không có job rollover số dư nghỉ phép hàng năm (field `carryOverCap` có nhưng không dùng) | 🟢 Thấp | Phase 9.5 |

---

## 4. Trạng Thái Thực Tế So Với Bảng Tiến Độ Của Báo Cáo

Báo cáo tuần 6–7 ước tính **~97% hoàn thành**. Sau xác minh v2.0:

| Module | Báo cáo (%) | Thực tế (%) | Chênh lệch |
|--------|:-----------:|:-----------:|:----------:|
| Authentication & RBAC | BE:100 / FE:100 | ~98 | JWT_SECRET gap |
| Employee Management | BE:100 / FE:90 | ~95 | Đúng |
| Department Management | BE:100 / FE:100 | 100 | Đúng |
| Attendance + Period Close | BE:100 / FE:90 | ~95 | Đúng |
| Leave Management | BE:100 / FE:90 | ~92 | Không có overlap check |
| OT Management | BE:100 / FE:100 | 100 | Đúng |
| Contract Management | BE:100 / FE:90 | ~95 | Đúng |
| Payroll — Roles | BE:100 / FE:95 | ~95 | Đúng |
| Payroll — Accounting | BE:100 / FE:85 | ~90 | In-memory JobStore |
| Payslip (Employee) | BE:100 / FE:90 | ~90 | Không có PDF |
| System Config | BE:100 / FE:100 | ~95 | Không có JSON validation |
| Flyway Migrations | 100 | 100 | V1–V19 (nhiều hơn báo cáo) |
| Notifications | BE:100 / FE:90 | ~90 | Đúng |
| **Object Storage** | **BE:80 / FE:70** | **~30** | **Release B chưa làm** |
| Device API Key Auth | 100 | 100 | SHA-256 ≠ bcrypt (nhưng đúng) |
| Actuator + Logging | 100 | ~95 | DEBUG log trong base config |
| PDF/Excel Export | 0 | 0 | Đúng |

**Ước tính thực tế tổng thể: ~90%** (thay vì 97% báo cáo) do hai hạng mục bị đánh giá cao hơn thực tế: JWT_SECRET và Object Storage.

---

## 5. Hành Động Cần Thực Hiện

Sắp xếp theo mức độ ưu tiên:

### 🔴 Khẩn cấp — Trước khi deploy bất kỳ môi trường nào ngoài localhost

**[A1] Xóa default của `JWT_SECRET`**

```yaml
# Sửa trong application.yml:
# Từ:
secret: ${JWT_SECRET:12345678abcdefgh12345678abcdefgh}
# Thành:
secret: ${JWT_SECRET}
```

Ứng dụng sẽ fail-fast khi khởi động nếu không set biến môi trường. Cần document biến này trong README hoặc deployment guide.

---

### 🟡 Trung bình — Nên hoàn thành trước khi pilot

**[A2] Chuyển DEBUG logging về dev profile**

```yaml
# Di chuyển từ application.yml → application-dev.yml:
logging:
  level:
    org.springframework.security: DEBUG
    org.flywaydb: DEBUG

# Thêm vào application.yml:
logging:
  level:
    org.springframework.security: WARN
    org.flywaydb: INFO
```

**[A3] Làm rõ trạng thái Object Storage**

Release B (migration job BLOB → MinIO/S3) chưa triển khai. Cần quyết định:
- Nếu chấp nhận local storage trong pilot: cần mount persistent volume và ghi nhận đây là giới hạn khi scale.
- Nếu cần cloud storage: implement `StorageService` interface với implementation MinIO/S3.

**[A4] Persist trạng thái batch payroll job** (Phase 9.2 — xem Doc 05)

**[A5] Thêm JSON schema validation cho SystemConfig** (Phase 9.3 — xem Doc 05)

---

### 🟢 Thấp — Hoàn thiện sau pilot

| # | Nhiệm vụ |
|---|---------|
| A6 | PDF Payslip Export |
| A7 | Excel Reports |
| A8 | Annual leave rollover job (Phase 9.5) |
| A9 | Overlapping leave check (Phase 9.7) |
| A10 | API versioning `/api/v1/` (Phase 9.6) |
| A11 | Frontend hoàn thiện các trang 90% |
| A12 | Account management (unlock/reset) |

---

## 6. Kết Luận

Báo cáo tuần 6–7 phản ánh chính xác phần lớn công việc đã thực hiện. Tất cả các thay đổi nghiệp vụ cốt lõi (role architecture, payroll workflow, leave balance, contract history, OT limits, employer costs, notifications, period close) đều đã được triển khai và xác nhận trong code.

**Ba điểm cần chú ý nhất:**

1. **`JWT_SECRET` vẫn có default trong code** — mâu thuẫn với báo cáo, là rủi ro bảo mật thực sự cần sửa trước khi deploy.
2. **Object Storage Release B chưa làm** — báo cáo nói "đang chạy" nhưng thực tế chỉ có local file storage. Đây không phải blocker cho pilot nhưng cần ghi nhận đúng trạng thái.
3. **Có thêm V18 và V19 migration** so với báo cáo — đây là thêm, không phải thiếu, phản ánh xử lý lỗi thực tế khi deploy (tên cột notification không khớp giữa entity và SQL migration).

Hệ thống sẵn sàng cho **pilot thận trọng** sau khi xử lý mục A1 (JWT_SECRET) và A2 (DEBUG logging).

---

*End of Verification Report*
