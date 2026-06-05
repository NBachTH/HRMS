# FaceZ HRMS — Lộ Trình Phát Triển & Hướng Dẫn Triển Khai
### Hoàn Thiện Hệ Thống Đáp Ứng Yêu Cầu Nghiệp Vụ và Vận Hành
**Phiên bản:** 1.1 | **Ngày:** 2026-04-23 | **Dựa trên:** Tài liệu 01–04 | **Cập nhật theo:** `facez_hrms_roadmap_review.md`

> **Tóm tắt thay đổi (v1.0 → v1.1):** Sửa 6 lỗi nghiêm trọng; hoán đổi thứ tự Phase 5; bổ sung: Phase 0.5 (sao lưu/môi trường), Phase 1.6 (phiên bản API), Phase 4.4 (bảo vệ loại nghỉ phép), Phase 7.5 (thuế TNCN lũy tiến), Phase 7.6 (phiếu lương nhân viên); sửa tính toán OT và ca đêm; sửa lỗi trừ kép số dư nghỉ phép; quy trình migration ảnh đại diện được làm an toàn; áp dụng Spring Event để tách biệt Phase 3.1; lịch trình mở rộng lên 20 tuần.

---

## Cách Đọc Tài Liệu Này

Mỗi giai đoạn có **mục tiêu** rõ ràng, danh sách **hạng mục công việc** với tham chiếu file cụ thể, và **tiêu chí nghiệm thu**. Các giai đoạn được sắp xếp theo thứ tự phụ thuộc — giai đoạn sau xây dựng trên nền tảng của giai đoạn trước. Không bắt đầu một giai đoạn cho đến khi tất cả hạng mục chặn từ các giai đoạn trước đã hoàn thành.

Các hạng mục công việc được gắn thẻ:
- `[BE]` — thay đổi backend (Java / Spring Boot)
- `[FE]` — thay đổi frontend (Next.js / TypeScript)
- `[DB]` — yêu cầu script migration cơ sở dữ liệu
- `[CFG]` — thay đổi cấu hình hoặc hạ tầng

---

## Tổng Quan Các Giai Đoạn

| Giai đoạn | Tên                           | Mục tiêu                                              | Chặn  |
|-----------|-------------------------------|-------------------------------------------------------|-------|
| 0         | Nền tảng                      | Đảm bảo dự án an toàn để phát triển và triển khai     | Tất cả|
| 1         | Kiến trúc Phân quyền          | Thêm vai trò Tài chính và Giám đốc; sửa quyền sở hữu bảng lương | 2–8 |
| 2         | Hoàn thiện Dữ liệu Nhân viên  | Thu thập đầy đủ các trường dữ liệu pháp lý của nhân viên | 6, 7 |
| 3         | Quy trình Chấm công           | Tự động hóa xử lý chấm công từ log check-in          | 5, 7  |
| 4         | Quản lý Nghỉ phép             | Bổ sung loại nghỉ phép và theo dõi số dư             | 7     |
| 5         | Vòng đời Hợp đồng             | Sửa kiểu dữ liệu ngày và bổ sung lịch sử hợp đồng   | 7     |
| 6         | Tuân thủ Làm thêm giờ         | Bổ sung giới hạn pháp lý và hỗ trợ ngày lễ           | 7     |
| 7         | Chức năng Kế toán             | Bổ sung chi phí chủ sử dụng lao động và báo cáo pháp lý | 8  |
| 8         | Vận hành & Bảo mật            | Thông báo, giám sát, tăng cường bảo mật              | —     |

---

## Giai Đoạn 0 — Nền Tảng

**Mục tiêu:** Giải quyết các lỗ hổng hạ tầng khiến hệ thống không an toàn để chạy trong bất kỳ môi trường nào ngoài máy tính của lập trình viên.

### 0.1 Thay thế `ddl-auto: update` bằng Flyway Migrations `[BE]` `[DB]` `[CFG]`

**Lý do ưu tiên:** Mỗi giai đoạn tiếp theo đều thêm hoặc sửa đổi cột cơ sở dữ liệu. Không có Flyway, những thay đổi đó không thể được xem xét, kiểm soát phiên bản hoặc khôi phục.

**Các bước:**

1. Trong `facez/pom.xml`, xác nhận dependency `flyway-core` đã có. Nếu chưa, thêm vào:
   ```xml
   <dependency>
       <groupId>org.flywaydb</groupId>
       <artifactId>flyway-core</artifactId>
   </dependency>
   <dependency>
       <groupId>org.flywaydb</groupId>
       <artifactId>flyway-database-postgresql</artifactId>
   </dependency>
   ```

2. Tạo thư mục migration:
   ```
   facez/src/main/resources/db/migration/
   ```

3. Viết migration baseline `V1__baseline_schema.sql`. Script này phải tạo tất cả các bảng hiện có (dựa trên các JPA entity), vì Flyway sẽ tiếp quản từ trạng thái sạch. Sử dụng `CREATE TABLE IF NOT EXISTS` để đảm bảo an toàn trong quá trình chuyển đổi.

   Các bảng cần script: `user_account`, `employee_info`, `department`, `benefit`, `contract`, `attendance`, `check_in_log`, `device`, `leave_request`, `ot_request`, `payroll`, `system_config`.

4. Trong `facez/src/main/resources/application.yml`, thay đổi:
   ```yaml
   # Xóa hoặc comment out:
   # hibernate:
   #   ddl-auto: update

   # Thêm vào:
   spring:
     flyway:
       enabled: true
       locations: classpath:db/migration
     jpa:
       hibernate:
         ddl-auto: none
   ```

5. Tất cả thay đổi schema trong Giai đoạn 1–8 phải được cung cấp dưới dạng file migration mới có số thứ tự (`V2__...sql`, `V3__...sql`, v.v.), không bao giờ chỉnh sửa `V1`.

**Tiêu chí nghiệm thu:** Ứng dụng khởi động từ cơ sở dữ liệu trống chỉ sử dụng các script Flyway. `ddl-auto: none` được thiết lập. Không có `ALTER TABLE` nào xảy ra ngầm khi khởi động.

---

### 0.2 Đưa Tất cả Secrets và Cấu hình Môi trường ra Ngoài `[CFG]`

**File:** `facez/src/main/resources/application.yml`

Thay thế mọi giá trị hardcode khác nhau giữa các môi trường bằng tham chiếu biến môi trường:

```yaml
spring:
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/postgres}
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:postgres}
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}

app:
  jwt:
    secret: ${JWT_SECRET}          # Không có mặc định — phải được thiết lập tường minh
    access-exp-ms: ${JWT_ACCESS_EXP_MS:300000}
    refresh-exp-ms: ${JWT_REFRESH_EXP_MS:1209600000}
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:3000}
```

Cập nhật `SecurityConfig.java` để đọc các origin CORS được phép từ thuộc tính cấu hình thay vì hardcode `List.of("http://localhost:3000")`:

```java
// Inject qua @Value("${app.cors.allowed-origins}") List<String> allowedOrigins
configuration.setAllowedOrigins(allowedOrigins);
```

Cũng đặt `spring.jpa.show-sql: false` và chuyển sang profile chỉ dành cho dev (`application-dev.yml`).

**Tiêu chí nghiệm thu:** Ứng dụng khởi động mà không có secrets trong `application.yml`. Triển khai production chỉ cần thiết lập các biến môi trường.

---

### 0.3 Tạo Lớp Base Audit Chung `[BE]`

**Lý do:** Mỗi giai đoạn tiếp theo đều thêm các trường `createdBy`/`updatedBy`. Triển khai một lần duy nhất dưới dạng mapped superclass.

Tạo `facez/src/main/java/org/dummy/facez/common/model/AuditableEntity.java`:

```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class AuditableEntity {

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(updatable = false, length = 100)
    private String createdBy;

    @LastModifiedBy
    @Column(length = 100)
    private String updatedBy;
}
```

Tạo `AuditorAwareImpl.java` đọc tên người dùng đang xác thực từ `SecurityContextHolder`:

```java
@Component
public class AuditorAwareImpl implements AuditorAware<String> {
    @Override
    public Optional<String> getCurrentAuditor() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .map(Authentication::getName);
    }
}
```

Bật auditing trong class `@Configuration`: `@EnableJpaAuditing(auditorAwareRef = "auditorAwareImpl")`.

Sau đó cho các entity sau kế thừa `AuditableEntity` (xóa các trường `createdAt`/`updatedAt` thủ công của chúng):
- `Payroll`
- `Attendance`
- `Contract`
- `LeaveRequest`
- `OTRequest`
- `EmployeeInfo`

Viết migration `V2__add_audit_columns.sql` thêm `created_by VARCHAR(100)` và `updated_by VARCHAR(100)` vào mỗi bảng đó.

> **Lưu ý về lịch sử kiểm toán đầy đủ:** `AuditableEntity` ghi lại người thay đổi cuối cùng nhưng không lưu giá trị trước đó. Với các trường nhạy cảm (lương, CCCD, số tài khoản ngân hàng, mã số thuế), cân nhắc bổ sung Hibernate Envers hoặc bảng `audit_log` tùy chỉnh (`entity_type`, `entity_id`, `field_name`, `old_value`, `new_value`, `changed_by`, `changed_at`) trong một lần cải tiến bảo mật sau này.

**Tiêu chí nghiệm thu:** `Payroll.createdBy` và `updatedBy` được tự động điền từ người dùng đã đăng nhập trên mỗi lần lưu. Không còn lời gọi `setCreatedAt()` thủ công nào trong code service.

---

### 0.4 Thêm Rate Limiting cho Đăng nhập `[BE]`

**File:** `facez/src/main/java/org/dummy/facez/auth/controller/AuthController.java`

Thêm Bucket4j vào endpoint `/api/auth/login`. Giới hạn: 10 lần thử mỗi địa chỉ IP trong vòng 15 phút. Khi vượt quá giới hạn, trả về HTTP 429 với header `Retry-After`.

Thêm các dependency vào `pom.xml`:
```xml
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j-core</artifactId>
    <version>8.10.1</version>
</dependency>
<!-- Bắt buộc để chia sẻ trạng thái rate limit giữa nhiều instance ứng dụng -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j-redis</artifactId>
    <version>8.10.1</version>
</dependency>
```

Cấu hình Bucket4j sử dụng Redis instance đã có trong kiến trúc làm backend lưu trạng thái. **Không** dùng bucket in-memory mặc định — bucket in-memory là per-JVM, nghĩa là với load balancer trước hai instance, kẻ tấn công có thể gửi 10 yêu cầu đến mỗi instance (tổng 20) mà không kích hoạt giới hạn.

```java
// Dùng RedissonBasedProxyManager với Redisson/Lettuce client hiện có
ProxyManager<String> proxyManager = Bucket4jRedis.casBasedBuilder(redissonClient).build();
BucketConfiguration config = BucketConfiguration.builder()
    .addLimit(Bandwidth.classic(10, Refill.intervally(10, Duration.ofMinutes(15))))
    .build();
Bucket bucket = proxyManager.builder().build(clientIp, config);
```

**Tiêu chí nghiệm thu:** Sau 10 lần đăng nhập thất bại từ cùng một IP, các lần thử tiếp theo nhận được HTTP 429 trong 15 phút — bất kể instance nào xử lý yêu cầu.

---

### 0.5 Profile Môi trường và Danh Mục Kiểm tra Trước Triển Khai `[CFG]`

**Tạo ba file profile:**

- `facez/src/main/resources/application-dev.yml` — bật `show-sql: true`, tắt khóa bảo mật Flyway repair, thiết lập JWT ngắn hạn hơn cho kiểm thử.
- `facez/src/main/resources/application-staging.yml` — ràng buộc giống production nhưng trỏ đến cơ sở dữ liệu staging.
- `facez/src/main/resources/application-prod.yml` — `show-sql: false`, Flyway `out-of-order: false`, CORS nghiêm ngặt.

**Danh mục kiểm tra trước triển khai (thực hiện trước khi chạy Flyway migration trên staging hoặc production):**

1. Thực hiện `pg_dump` đầy đủ cơ sở dữ liệu đích và xác minh khôi phục thành công trên một instance riêng.
2. Chạy migration trên staging trước; xác nhận ứng dụng khởi động và vượt qua health check.
3. Sau đó mới chạy trên production.
4. Nếu migration thất bại giữa chừng, dùng `flyway repair` để xóa mục checksum lỗi trước khi thử sửa — không bao giờ chỉnh sửa file migration đã commit.

**Tiêu chí nghiệm thu:** Triển khai lên staging dùng `application-staging.yml`. Không có migration nào chạy trên production khi chưa có bản sao lưu đã được xác minh.

---

## Giai Đoạn 1 — Thiết Kế Lại Kiến Trúc Phân Quyền

**Mục tiêu:** Giới thiệu vai trò `FINANCE_ADMIN` và `DIRECTOR`, và tái cấu trúc quy trình bảng lương để HR cung cấp dữ liệu đầu vào, Tài chính tính toán, và Giám đốc phê duyệt chi trả.

Đây là thay đổi có tính cấu trúc quan trọng nhất trong toàn bộ lộ trình. Tất cả các giai đoạn liên quan đến bảng lương sau này đều phụ thuộc vào cấu trúc vai trò này.

---

### 1.1 Thêm Vai Trò Mới vào Enum `[BE]` `[DB]`

**File:** `facez/src/main/java/org/dummy/facez/common/enums/Role.java`

```java
public enum Role {
    EMPLOYEE,
    LEADER,
    MANAGER,
    HR_ADMIN,
    FINANCE_ADMIN,   // MỚI — Phòng Kế toán / Tài chính
    DIRECTOR,        // MỚI — Giám đốc Công ty / Giám đốc Tài chính
    SYSTEM_ADMIN
}
```

Viết migration `V3__add_roles.sql`. Vì `role` được lưu dưới dạng chuỗi enum trong PostgreSQL, không cần thay đổi kiểu cột — các giá trị mới chỉ đơn giản trở thành hợp lệ. Không cần migration dữ liệu.

---

### 1.2 Cập nhật Cấu hình Bảo mật `[BE]`

**File:** `facez/src/main/java/org/dummy/facez/configs/SecurityConfig.java`

Thay thế block `authorizeHttpRequests` hiện có. Nguyên tắc: HR quản lý nhân sự; Tài chính quản lý tiền bạc.

```java
.authorizeHttpRequests(auth -> auth
    // Công khai
    .requestMatchers("/api/auth/login", "/api/auth/refresh").permitAll()
    .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
    .requestMatchers("/actuator/health").permitAll()

    // Quản lý nhân viên — chỉ HR
    .requestMatchers(HttpMethod.POST,   "/api/employees").hasAuthority("HR_ADMIN")
    .requestMatchers(HttpMethod.PUT,    "/api/employees/**").hasAuthority("HR_ADMIN")
    .requestMatchers(HttpMethod.DELETE, "/api/employees/**").hasAuthority("HR_ADMIN")

    // Quản lý phòng ban — chỉ HR
    .requestMatchers(HttpMethod.POST,   "/api/departments").hasAuthority("HR_ADMIN")
    .requestMatchers(HttpMethod.PUT,    "/api/departments/**").hasAuthority("HR_ADMIN")
    .requestMatchers(HttpMethod.DELETE, "/api/departments/**").hasAuthority("HR_ADMIN")
    // Đọc phòng ban — chỉ người dùng đã xác thực (không công khai)
    .requestMatchers(HttpMethod.GET,    "/api/departments/**").authenticated()

    // Quản lý hợp đồng — HR và Tài chính (Tài chính cần dữ liệu lương)
    .requestMatchers("/api/contracts/**").hasAnyAuthority("HR_ADMIN", "FINANCE_ADMIN", "SYSTEM_ADMIN")

    // Tính toán và quản lý bảng lương — chỉ Tài chính (trước đây là HR_ADMIN)
    .requestMatchers(HttpMethod.POST,  "/api/payrolls/calculate").hasAnyAuthority("FINANCE_ADMIN", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.POST,  "/api/payrolls/batch-calculate").hasAnyAuthority("FINANCE_ADMIN", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.GET,   "/api/payrolls/jobs/**").hasAnyAuthority("FINANCE_ADMIN", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.GET,   "/api/payrolls/period").hasAnyAuthority("FINANCE_ADMIN", "DIRECTOR", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.GET,   "/api/payrolls").hasAnyAuthority("FINANCE_ADMIN", "DIRECTOR", "SYSTEM_ADMIN")

    // Phiếu lương cá nhân — nhân viên tự xem phiếu lương của mình (kiểm tra trong service)
    .requestMatchers(HttpMethod.GET,   "/api/payrolls/my/**").hasAnyAuthority("EMPLOYEE", "FINANCE_ADMIN", "SYSTEM_ADMIN")

    // Phê duyệt bảng lương — chỉ Giám đốc (trước đây là HR_ADMIN)
    .requestMatchers(HttpMethod.PATCH, "/api/payrolls/*/approve").hasAnyAuthority("DIRECTOR", "SYSTEM_ADMIN")

    // Đánh dấu đã thanh toán — Tài chính (thực hiện thanh toán sau khi Giám đốc phê duyệt)
    .requestMatchers(HttpMethod.PATCH, "/api/payrolls/*/mark-paid").hasAnyAuthority("FINANCE_ADMIN", "SYSTEM_ADMIN")

    // Xóa bảng lương — Tài chính (chỉ trạng thái DRAFT, được kiểm soát trong service)
    .requestMatchers(HttpMethod.DELETE, "/api/payrolls/**").hasAnyAuthority("FINANCE_ADMIN", "SYSTEM_ADMIN")

    // Cấu hình hệ thống — Tài chính cho quy tắc nghiệp vụ, SysAdmin cho tất cả
    .requestMatchers("/api/system-configs/**").hasAnyAuthority("FINANCE_ADMIN", "SYSTEM_ADMIN")

    // Log chấm công — yêu cầu xác thực (API key thiết bị trong Giai đoạn 8; basic auth hiện tại)
    .requestMatchers("/api/checkin-logs/**").authenticated()

    // Tất cả các endpoint khác — đã xác thực
    .anyRequest().authenticated()
)
```

---

### 1.3 Thiết Kế Lại Quy Trình Trạng Thái Bảng Lương `[BE]` `[DB]`

Luồng `DRAFT → APPROVED → PAID` hiện tại gộp tính toán của Tài chính và phê duyệt của Giám đốc vào một trạng thái `APPROVED` duy nhất. Cần phân tách đúng cách.

**File:** `facez/src/main/java/org/dummy/facez/common/enums/PayrollStatus.java`

```java
public enum PayrollStatus {
    DRAFT,              // Tài chính đã tính toán; chờ xem xét của Tài chính
    PENDING_APPROVAL,   // Tài chính đã trình Giám đốc để phê duyệt
    APPROVED,           // Giám đốc đã phê duyệt; sẵn sàng thanh toán
    PAID,               // Đã thực hiện thanh toán
    REJECTED            // Giám đốc từ chối; Tài chính phải tính toán lại
}
```

Viết migration `V4__payroll_status_update.sql` — thêm `PENDING_APPROVAL` và `REJECTED` là các giá trị hợp lệ. Thêm cột `rejection_reason VARCHAR(500)` vào bảng `payroll`. Các bản ghi `DRAFT`/`APPROVED`/`PAID` hiện có không cần thay đổi dữ liệu.

**File:** `facez/src/main/java/org/dummy/facez/domain/payroll/service/PayrollService.java`

Thêm hai phương thức chuyển trạng thái mới bên cạnh `approve()` và `markPaid()` hiện có:

```java
// Được gọi bởi FINANCE_ADMIN: trình bảng lương đã tính toán để Giám đốc xem xét
// DRAFT → PENDING_APPROVAL
public PayrollResponse submitForApproval(String id) { ... }

// Được gọi bởi DIRECTOR: phê duyệt chi trả
// PENDING_APPROVAL → APPROVED
public PayrollResponse approve(String id) { ... }   // giữ nguyên, nhưng bảo vệ trên PENDING_APPROVAL

// Được gọi bởi DIRECTOR: trả về Tài chính để sửa
// PENDING_APPROVAL → REJECTED
public PayrollResponse reject(String id, String reason) { ... }

// Được gọi bởi FINANCE_ADMIN: thực hiện thanh toán sau khi Giám đốc phê duyệt
// APPROVED → PAID
```

**File:** `facez/src/main/java/org/dummy/facez/domain/payroll/controller/PayrollController.java`

Thêm các endpoint mới:
```
PATCH /api/payrolls/{id}/submit     → FINANCE_ADMIN (DRAFT → PENDING_APPROVAL)
PATCH /api/payrolls/{id}/approve    → DIRECTOR (PENDING_APPROVAL → APPROVED)
PATCH /api/payrolls/{id}/reject     → DIRECTOR (PENDING_APPROVAL → REJECTED)
```

---

### 1.4 Thêm Bước Chốt Chu Kỳ Chấm Công của HR `[BE]`

Trước khi Tài chính có thể tính bảng lương, HR phải xác nhận rằng dữ liệu chấm công đã đầy đủ và chính xác cho kỳ đó. Giới thiệu khái niệm nhẹ "chốt kỳ".

**Entity mới:** `AttendancePeriodClose`

```java
@Entity
@Table(name = "attendance_period_close",
       uniqueConstraints = @UniqueConstraint(columnNames = {"close_year", "close_month"}))
public class AttendancePeriodClose {
    @Id private String id;
    private int closeYear;
    private int closeMonth;
    private String closedBy;        // tên đăng nhập của HR đã chốt
    private LocalDateTime closedAt;
    private String notes;
}
```

Viết migration `V5__attendance_period_close.sql`.

**Endpoint mới:** `POST /api/attendances/close-period` (chỉ HR_ADMIN)

`PayrollService.calculate()` phải kiểm tra rằng bản ghi `AttendancePeriodClose` tồn tại cho năm/tháng được yêu cầu trước khi chạy tính toán. Nếu HR chưa chốt kỳ, trả về 400: `"Dữ liệu chấm công cho {tháng}/{năm} chưa được HR chốt. Hoàn thành và chốt kỳ chấm công trước khi tính bảng lương."`.

---

### 1.5 Cập nhật Routing Vai Trò Frontend `[FE]`

**Các file cần cập nhật:**

| File | Thay đổi |
|------|----------|
| `facez-front/commons/contexts/AuthContext.tsx` | Thêm `FINANCE_ADMIN` và `DIRECTOR` vào kiểu `role` |
| `facez-front/commons/utils/Protector.tsx` | Không cần thay đổi logic nếu vai trò được so sánh dạng chuỗi |
| `facez-front/commons/components/Sidebar.tsx` | Thêm phần điều hướng cho Tài chính và Giám đốc |
| `facez-front/app/` | Thêm thư mục `finance/` với các trang bảng lương và cấu hình |
| `facez-front/app/` | Thêm thư mục `director/` với trang phê duyệt bảng lương |

**Bổ sung Sidebar:**

```
Tài chính (FINANCE_ADMIN, SYSTEM_ADMIN):
  - Quản lý Bảng lương      → /finance/payroll
  - Cấu hình Hệ thống       → /finance/config   (chuyển từ /system/config)

Giám đốc (DIRECTOR, SYSTEM_ADMIN):
  - Phê duyệt Bảng lương    → /director/payroll-approval
  - Tổng quan Chi phí Nhân công → /director/reports
```

Sidebar `HR_ADMIN` hiện tại nên **xóa** phần Bảng lương. HR chỉ xem chấm công, hợp đồng và quản lý nhân viên — không phải tính toán bảng lương.

Bổ sung một component error boundary toàn cục và hệ thống toast thông báo lỗi API. Xử lý tối thiểu: 403 Forbidden (vai trò thay đổi giữa phiên làm việc), 429 Too Many Requests (vượt giới hạn đăng nhập), và lỗi validate từ `ApiResponse` phía backend.

---

### 1.6 Áp Dụng Chiến Lược Phiên Bản API `[BE]` `[FE]`

Nhiều giai đoạn trong lộ trình này sửa đổi response DTO (`EmployeeResponse`, `ContractResponse`, `PayrollResponse`). Không có quy ước phiên bản, client được xây dựng theo giai đoạn trước sẽ bị hỏng ngầm khi giai đoạn mới triển khai.

**Trước khi Phase 1 đưa vào bất kỳ môi trường chung nào**, chọn một cách tiếp cận và áp dụng nhất quán:

- **Tiền tố URL (khuyến nghị vì đơn giản):** Tất cả route trở thành `/api/v1/...`. Khi có thay đổi breaking, thêm route `/api/v2/...` song song.
- **Versioning qua `Accept` header:** Client gửi `Accept: application/vnd.facez.v1+json`.

Tài liệu hóa chính sách thay đổi breaking: *"Thêm trường tùy chọn mới vào response là non-breaking. Xóa, đổi tên trường, hoặc thay đổi kiểu dữ liệu là breaking và yêu cầu phiên bản mới."*

---

### Tiêu Chí Nghiệm Thu Giai Đoạn 1
- [ ] Người dùng với vai trò `HR_ADMIN` không thể gọi `POST /api/payrolls/calculate` (trả về 403).
- [ ] Người dùng với vai trò `FINANCE_ADMIN` có thể tính và trình bảng lương, nhưng không thể phê duyệt.
- [ ] Người dùng với vai trò `DIRECTOR` có thể phê duyệt hoặc từ chối bảng lương đã trình, nhưng không thể tính toán.
- [ ] Bảng lương không thể chuyển sang `PENDING_APPROVAL` trừ khi kỳ chấm công đã được HR chốt.
- [ ] Tất cả các bài kiểm tra `HR_ADMIN` hiện có cho quản lý nhân viên, nghỉ phép, OT và chấm công vẫn thông qua.
- [ ] Tất cả API route bao gồm tiền tố phiên bản nhất quán với chiến lược đã chọn.

---

## Giai Đoạn 2 — Hoàn Thiện Dữ Liệu Nhân Viên

**Mục tiêu:** Thu thập các trường dữ liệu pháp lý cần thiết cho đăng ký bảo hiểm, khai báo thuế và chi trả lương.

### 2.1 Thêm Các Trường Pháp Lý vào EmployeeInfo `[BE]` `[DB]`

**File:** `facez/src/main/java/org/dummy/facez/domain/employee/model/EmployeeInfo.java`

Thêm các trường sau:

```java
/** Căn cước công dân / CMND — bắt buộc để đăng ký BHXH */
@Column(length = 20, unique = true)
private String nationalId;

/** Ngày cấp CCCD */
private LocalDate nationalIdIssueDate;

/** Nơi cấp CCCD */
@Column(length = 200)
private String nationalIdIssuePlace;

/** Mã số thuế cá nhân — bắt buộc cho khai báo thuế TNCN */
@Column(length = 20, unique = true)
private String taxCode;

/** Số sổ BHXH — bắt buộc để đóng bảo hiểm xã hội */
@Column(length = 20, unique = true)
private String socialInsuranceCode;

/** Số tài khoản ngân hàng — bắt buộc để chuyển lương */
@Column(length = 30)
private String bankAccountNumber;

/** Tên ngân hàng */
@Column(length = 100)
private String bankName;

/** Chi nhánh ngân hàng */
@Column(length = 200)
private String bankBranch;

/** Ngày sinh */
private LocalDate dateOfBirth;

/** Giới tính */
@Enumerated(EnumType.STRING)
private Gender gender;   // enum mới: MALE, FEMALE, OTHER

/** Quê quán */
@Column(length = 200)
private String hometown;
```

Viết migration `V6__employee_statutory_fields.sql`.

Cập nhật các DTO `EmployeeCreateRequest`, `EmployeeUpdateRequest` và `EmployeeResponse` để bao gồm các trường này.

### 2.2 Thêm Chi Tiết Đăng Ký Người Phụ Thuộc `[BE]` `[DB]`

**Entity mới:** `TaxDependent`

```java
@Entity
@Table(name = "tax_dependent")
public class TaxDependent {
    @Id private String id;

    @ManyToOne
    @JoinColumn(name = "employee_id")
    private EmployeeInfo employeeInfo;

    private String fullName;
    private String nationalId;
    private LocalDate dateOfBirth;
    private String relationship;        // con, vợ/chồng, cha mẹ, v.v.
    private LocalDate registrationDate; // ngày nộp Mẫu 02/CK-TNCN
    private boolean active;             // có thể hủy khi người phụ thuộc không còn đủ điều kiện
}
```

Viết migration `V7__tax_dependent.sql`.

`PayrollCalculationEngine` nên đếm người phụ thuộc `active` từ bảng này thay vì đọc `Contract.dependentCount`.

---

### Tiêu Chí Nghiệm Thu Giai Đoạn 2
- [ ] Bản ghi nhân viên mới có thể lưu số CCCD, mã số thuế, mã bảo hiểm và số tài khoản ngân hàng.
- [ ] Các endpoint tạo/cập nhật nhân viên từ chối các giá trị `nationalId` và `taxCode` trùng lặp.
- [ ] FINANCE_ADMIN có thể xem đăng ký người phụ thuộc của bất kỳ nhân viên nào.
- [ ] Tính toán bảng lương đọc số người phụ thuộc active từ `tax_dependent`, không phải số nguyên thô trong hợp đồng.

---

## Giai Đoạn 3 — Tự Động Hóa Quy Trình Chấm Công

**Mục tiêu:** Tự động hóa việc tạo bản ghi `Attendance` từ `CheckinLog` để bảng lương luôn có dữ liệu chấm công cập nhật.

> **Lưu ý:** Tài liệu CLAUDE.md mô tả quy trình này đã được triển khai, nhưng kiểm tra `CheckinLogService.java` cho thấy `processRealTime()` chỉ lưu `CheckinLog` — nó không gọi `AttendanceService`. Giai đoạn này triển khai mục đích đã mô tả.

### 3.1 Kết Nối CheckinLogService và AttendanceService qua Spring Events `[BE]`

**Tại sao dùng Spring Events thay vì inject trực tiếp:** Inject `AttendanceService` trực tiếp vào `CheckinLogService` có nguy cơ gây vòng phụ thuộc (`BeanCurrentlyInCreationException`) nếu bất kỳ bean nào trong chuỗi phụ thuộc của `AttendanceService` tham chiếu lại `CheckinLogService` trực tiếp hoặc gián tiếp. Tách biệt qua event loại bỏ hoàn toàn rủi ro này và giúp mỗi service có thể kiểm thử độc lập.

**Bước 1 — Tạo class event:**

```java
// facez/src/main/java/org/dummy/facez/domain/attendance/event/CheckinProcessedEvent.java
public class CheckinProcessedEvent {
    private final EmployeeInfo employee;
    private final LocalDateTime logTime;
    private final LogTypes logType;

    public CheckinProcessedEvent(Object source, EmployeeInfo employee,
                                  LocalDateTime logTime, LogTypes logType) {
        this.employee = employee;
        this.logTime  = logTime;
        this.logType  = logType;
    }
    // getters
}
```

**Bước 2 — Phát event từ CheckinLogService:**

**File:** `facez/src/main/java/org/dummy/facez/domain/attendance/service/CheckinLogService.java`

```java
@RequiredArgsConstructor
@Service
public class CheckinLogService {

    private final ApplicationEventPublisher eventPublisher;
    // ... các field hiện có

    public void processRealTime(...) {
        // ... logic lưu hiện có ...
        eventPublisher.publishEvent(
            new CheckinProcessedEvent(this, employee, log.getLogTime(), log.getLogType()));
    }
}
```

**Bước 3 — Lắng nghe trong AttendanceService:**

**File:** `facez/src/main/java/org/dummy/facez/domain/attendance/service/AttendanceService.java`

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void onCheckinProcessed(CheckinProcessedEvent event) {
    processCheckinForAttendance(event.getEmployee(), event.getLogTime(), event.getLogType());
}

@Transactional
public void processCheckinForAttendance(EmployeeInfo employee, LocalDateTime logTime, LogTypes logType) {
    LocalDate date = logTime.toLocalDate();
    LocalDateTime dayStart = date.atStartOfDay();
    LocalDateTime dayEnd   = date.atTime(23, 59, 59);

    if (logType == LogTypes.IN) {
        // Idempotent: bỏ qua nếu bản ghi chấm công đã có check-in cho ngày này
        boolean exists = attendanceRepository
            .findFirstByEmployeeInfo_EmployeeIdAndCheckInBetweenAndDeleteFlagFalse(
                employee.getEmployeeId(), dayStart, dayEnd).isPresent();
        if (!exists) {
            Attendance att = Attendance.builder()
                .attendanceId(UUID.randomUUID().toString())
                .employeeInfo(employee)
                .attendanceDate(date)
                .checkIn(logTime)
                .deleteFlag(false)
                .build();
            computeAndApply(att, logTime, null);
            attendanceRepository.save(att);
        }
    } else if (logType == LogTypes.OUT) {
        attendanceRepository
            .findFirstByEmployeeInfo_EmployeeIdAndCheckInBetweenAndCheckOutIsNullAndDeleteFlagFalse(
                employee.getEmployeeId(), dayStart, dayEnd)
            .ifPresent(att -> {
                computeAndApply(att, att.getCheckIn(), logTime);
                attendanceRepository.save(att);
            });
    }
}
```

Dùng `@TransactionalEventListener(phase = AFTER_COMMIT)` đảm bảo `CheckinLog` đã được commit hoàn toàn trước khi ghi `Attendance`, tránh không nhất quán do transaction một phần.

### 3.2 Cấu Hình Giờ Làm Việc Linh Hoạt `[BE]` `[DB]`

Xóa các hằng số hardcode trong `AttendanceService.java`:
```java
// Xóa:
private static final LocalTime WORK_START = LocalTime.of(8, 30);
private static final int WORK_HOURS_PER_DAY = 8;
```

Thêm kiểu `SystemConfig` mới `WORK_SCHEDULE`:
```json
{
  "workStartTime": "08:30",
  "workHoursPerDay": 8,
  "timezone": "Asia/Ho_Chi_Minh"
}
```

Viết migration `V8__work_schedule_config.sql` — chèn cấu hình lịch làm việc mặc định vào `system_config`.

### 3.3 Thêm Lịch Ngày Lễ `[BE]` `[DB]`

**Entity mới:** `PublicHoliday`

```java
@Entity
@Table(name = "public_holiday")
public class PublicHoliday {
    @Id private String id;
    private int year;
    private LocalDate holidayDate;
    @Column(length = 200)
    private String name;
    private boolean compensatoryDay;
}
```

Viết migration `V9__public_holiday.sql` với dữ liệu seed cho các ngày lễ Việt Nam năm 2026.

**Endpoint mới:** `GET/POST/DELETE /api/public-holidays` (HR_ADMIN, FINANCE_ADMIN).

---

### Tiêu Chí Nghiệm Thu Giai Đoạn 3
- [ ] `POST /api/checkin-logs` với `logType: IN` tạo bản ghi `Attendance` cho nhân viên và ngày đó.
- [ ] `POST /api/checkin-logs` tiếp theo với `logType: OUT` đóng bản ghi và điền `checkOut`, `workingHour`, `paidHour`, `lateHour`.
- [ ] Log IN trùng lặp cho cùng nhân viên và ngày bị bỏ qua (idempotent).
- [ ] Giờ bắt đầu làm việc có thể thay đổi qua SystemConfig mà không cần triển khai lại code.
- [ ] Ngày lễ được loại trừ khỏi số ngày làm việc có lương.
- [ ] Không có `BeanCurrentlyInCreationException` khi khởi động ứng dụng.

---

## Giai Đoạn 4 — Cải Tiến Quản Lý Nghỉ Phép

**Mục tiêu:** Thêm phân loại loại nghỉ phép và theo dõi số dư để tuân thủ Bộ luật Lao động và cho phép khấu trừ bảng lương cho các ngày nghỉ vượt mức.

### 4.1 Thêm Loại Nghỉ Phép `[BE]` `[DB]`

**Enum mới:** `facez/src/main/java/org/dummy/facez/common/enums/LeaveType.java`

```java
public enum LeaveType {
    ANNUAL,           // Nghỉ phép năm — có lương, trừ từ số dư
    SICK,             // Nghỉ ốm — BHXH chi trả một phần
    MATERNITY,        // Nghỉ thai sản — BHXH chi trả
    PATERNITY,        // Nghỉ thai sản (nam)
    BEREAVEMENT,      // Nghỉ tang — 3 ngày có lương
    MARRIAGE,         // Nghỉ cưới — 3 ngày có lương
    UNPAID,           // Nghỉ không lương — dẫn đến khấu trừ bảng lương
    PUBLIC_HOLIDAY,   // Nghỉ lễ — được tạo tự động, không do nhân viên nộp
    COMPENSATORY      // Nghỉ bù — dùng khi nhân viên làm vào ngày lễ
}
```

**File:** `facez/src/main/java/org/dummy/facez/domain/leave/model/LeaveRequest.java`

Thêm:
```java
@Enumerated(EnumType.STRING)
@Column(nullable = false)
private LeaveType leaveType;

/** Thời lượng tính theo giờ làm việc (không tính giờ nghỉ trưa và cuối tuần) */
private BigDecimal durationHours;

/** Liệu nghỉ phép này có khấu trừ từ số dư hàng năm không */
private boolean balanceDeducted;
```

Viết migration `V10__leave_type.sql` — thêm cột `leave_type` (mặc định `ANNUAL`), `duration_hours`, `balance_deducted`.

### 4.2 Thêm Số Dư Nghỉ Phép với Cơ Chế Trừ Hai Giai Đoạn `[BE]` `[DB]`

**Entity mới:** `LeaveBalance`

```java
@Entity
@Table(name = "leave_balance",
       uniqueConstraints = @UniqueConstraint(columnNames = {"employee_id", "leave_year", "leave_type"}))
public class LeaveBalance {
    @Id private String id;

    @ManyToOne
    @JoinColumn(name = "employee_id")
    private EmployeeInfo employeeInfo;

    private int leaveYear;

    @Enumerated(EnumType.STRING)
    private LeaveType leaveType;

    /** Quyền hưởng hàng năm tính theo ngày */
    private BigDecimal entitlementDays;

    /** Số ngày chuyển tiếp từ năm trước */
    private BigDecimal carriedOverDays;

    /** Số ngày đang chờ (đã nộp nhưng chưa được phê duyệt) */
    private BigDecimal pendingDays;

    /** Số ngày đã dùng (tổng nghỉ phép đã phê duyệt hoàn toàn loại này trong năm) */
    private BigDecimal usedDays;

    /** entitlementDays + carriedOverDays - pendingDays - usedDays */
    private BigDecimal remainingDays;

    /** Giới hạn chuyển tiếp sang năm sau (ví dụ: 5 ngày) */
    private BigDecimal carryOverCap;
}
```

Viết migration `V11__leave_balance.sql` (bao gồm cột `pending_days`).

**Quy tắc trừ hai giai đoạn trong `LeaveService`:**

1. **Khi nộp đơn** (ngăn đặt trùng lặp): dự trữ ngày ngay lập tức.
   ```java
   // Kiểm tra: remainingDays >= số ngày yêu cầu
   if (balance.getRemainingDays().compareTo(requestedDays) < 0) {
       throw new BadRequestException("Không đủ số dư nghỉ phép. Còn lại: "
           + balance.getRemainingDays() + " ngày.");
   }
   // Dự trữ vào pendingDays; trừ từ remainingDays
   balance.setPendingDays(balance.getPendingDays().add(requestedDays));
   balance.setRemainingDays(balance.getRemainingDays().subtract(requestedDays));
   ```

2. **Khi phê duyệt cuối** (chuyển pending thành đã dùng):
   ```java
   balance.setPendingDays(balance.getPendingDays().subtract(approvedDays));
   balance.setUsedDays(balance.getUsedDays().add(approvedDays));
   // remainingDays đã được trừ khi nộp — không cần thay đổi
   ```

3. **Khi từ chối hoặc hủy** (hoàn lại dự trữ):
   ```java
   balance.setPendingDays(balance.getPendingDays().subtract(requestedDays));
   balance.setRemainingDays(balance.getRemainingDays().add(requestedDays));
   ```

4. **Khởi tạo số dư hàng năm:** công việc định kỳ (hoặc trigger thủ công của HR) tạo bản ghi `LeaveBalance` cho tất cả nhân viên đang hoạt động, tính toán theo tỷ lệ cho nhân viên gia nhập giữa năm.

**Endpoint mới:**
```
GET  /api/leave-balances/my               → Nhân viên xem số dư của mình
GET  /api/leave-balances/{employeeId}     → HR_ADMIN, FINANCE_ADMIN xem số dư nhân viên
POST /api/leave-balances/initialise       → HR_ADMIN khởi tạo số dư hàng năm
```

### 4.3 Đối Chiếu Vắng Mặt với Bản Ghi Nghỉ Phép `[BE]`

Khi HR chốt kỳ chấm công, hệ thống xác định các ngày không có bản ghi chấm công và không có nghỉ phép đã duyệt, gắn cờ là **vắng mặt không giải thích** mà HR phải giải quyết.

```java
public List<UnexplainedAbsence> checkForUnexplainedAbsences(int year, int month) {
    // Lấy tất cả ngày làm việc trong kỳ (không tính cuối tuần và ngày lễ)
    // Với mỗi nhân viên đang hoạt động, tìm ngày không có Attendance VÀ không có nghỉ phép đã duyệt
    // Trả về danh sách {employeeId, employeeName, missingDates[]}
}
```

`POST /api/attendances/close-period` từ chối chốt nếu có vắng mặt chưa giải quyết (trừ khi HR xác nhận rõ ràng là nghỉ không lương).

### 4.4 Bảo Vệ Chống Nộp Loại Nghỉ Phép Chỉ Dành Cho Hệ Thống `[BE]`

`PUBLIC_HOLIDAY` và `COMPENSATORY` được xác định là tự động tạo và không bao giờ được nộp bởi nhân viên hoặc HR qua luồng yêu cầu thông thường.

**File:** `facez/src/main/java/org/dummy/facez/domain/leave/service/LeaveService.java`

Thêm danh sách cho phép tường minh ở đầu `create()`:

```java
private static final Set<LeaveType> EMPLOYEE_SUBMITTABLE = Set.of(
    LeaveType.ANNUAL, LeaveType.SICK, LeaveType.MATERNITY, LeaveType.PATERNITY,
    LeaveType.BEREAVEMENT, LeaveType.MARRIAGE, LeaveType.UNPAID
);

public LeaveResponse create(LeaveRequest request, String submitterUsername) {
    if (!EMPLOYEE_SUBMITTABLE.contains(request.getLeaveType())) {
        throw new BadRequestException(
            "Loại nghỉ phép " + request.getLeaveType() + " không thể nộp thủ công.");
    }
    // ... phần còn lại của logic tạo
}
```

`PUBLIC_HOLIDAY` được hệ thống chèn khi ngày lễ rơi vào ngày làm việc. `COMPENSATORY` được chèn khi nhân viên làm vào ngày lễ và được hưởng ngày nghỉ bù.

---

### Tiêu Chí Nghiệm Thu Giai Đoạn 4
- [ ] Tạo đơn nghỉ phép yêu cầu có `leaveType`.
- [ ] Nộp `PUBLIC_HOLIDAY` hoặc `COMPENSATORY` qua API trả về HTTP 400.
- [ ] Nhân viên nộp đơn nghỉ `ANNUAL` khi số dư bằng 0 nhận lỗi 400 với số dư còn lại trong thông báo.
- [ ] Hai yêu cầu nghỉ `ANNUAL` đồng thời cho cùng nhân viên không thể cùng vượt quá số dư (trừ hai giai đoạn ngăn đặt trùng).
- [ ] Phê duyệt đơn nghỉ phép chuyển ngày từ `pendingDays` sang `usedDays` trong `LeaveBalance`.
- [ ] Từ chối đơn nghỉ phép hoàn trả ngày từ `pendingDays` về `remainingDays`.
- [ ] HR chốt kỳ chấm công có vắng mặt không giải thích nhận được danh sách những vắng mặt đó.
- [ ] Ngày nghỉ `UNPAID` được truyền vào động cơ bảng lương để khấu trừ từ `NCtt`.

---

## Giai Đoạn 5 — Vòng Đời Hợp Đồng

**Mục tiêu:** Lưu giữ lịch sử hợp đồng, sửa xử lý ngày tháng, và thêm quản lý hết hạn hợp đồng.

> **Lưu ý về thứ tự (sửa v1.1):** Sửa kiểu ngày (5.1) phải thực hiện **trước** migration lịch sử (5.2) vì 5.2 thêm `effectiveFrom / effectiveTo` là các trường `LocalDate`. Nếu các cột `startDate / endDate` vẫn là `VARCHAR` khi 5.2 chạy, entity sẽ không nhất quán. Số thứ tự migration theo thứ tự đã sửa: V12 = kiểu ngày, V13 = lịch sử.

### 5.1 Sửa Kiểu Dữ Liệu Ngày Hợp Đồng `[BE]` `[DB]`

**File:** `facez/src/main/java/org/dummy/facez/domain/contract/model/Contract.java`

```java
// Thay đổi:
private String startDate;
private String endDate;

// Thành:
private LocalDate startDate;
private LocalDate endDate;
```

Viết migration `V12__contract_date_types.sql` dùng phương pháp cột song song an toàn để tránh mất dữ liệu:

```sql
-- Bước 1: Thêm cột DATE mới song song với cột VARCHAR cũ
ALTER TABLE contract
  ADD COLUMN start_date_new DATE,
  ADD COLUMN end_date_new   DATE;

-- Bước 2: Di chuyển các hàng có định dạng chuẩn; hàng không parse được sẽ để NULL
UPDATE contract
SET start_date_new = start_date::date
WHERE start_date ~ '^\d{4}-\d{2}-\d{2}$';

UPDATE contract
SET end_date_new = end_date::date
WHERE end_date ~ '^\d{4}-\d{2}-\d{2}$';

-- Bước 3: Xóa cột VARCHAR cũ và đổi tên cột mới
ALTER TABLE contract
  DROP COLUMN start_date,
  DROP COLUMN end_date;

ALTER TABLE contract
  RENAME COLUMN start_date_new TO start_date;
ALTER TABLE contract
  RENAME COLUMN end_date_new TO end_date;
```

> **Bước trước migration:** Chạy `SELECT id, start_date, end_date FROM contract WHERE start_date !~ '^\d{4}-\d{2}-\d{2}$' OR end_date !~ '^\d{4}-\d{2}-\d{2}$'` để xác định các chuỗi ngày không chuẩn và sửa thủ công trước khi áp dụng V12.

Cập nhật DTO `ContractRequest` và `ContractResponse` sang `LocalDate`.

### 5.2 Triển Khai Lịch Sử Hợp Đồng `[BE]` `[DB]`

**File:** `facez/src/main/java/org/dummy/facez/domain/contract/model/Contract.java`

Thay đổi quan hệ từ `@OneToOne` sang mô hình lịch sử:

1. Xóa ràng buộc `@OneToOne`. FK `employee_id` vẫn còn nhưng không còn unique.
2. Thêm các trường:
   ```java
   private LocalDate effectiveFrom;   // ngày phiên bản hợp đồng này có hiệu lực
   private LocalDate effectiveTo;     // null = đang hoạt động
   private boolean current;           // true cho hợp đồng đang hoạt động
   ```
3. Viết migration `V13__contract_history.sql`. Trước tiên tìm tên constraint unique thực tế:
   ```sql
   -- Chạy query này trước khi viết migration để lấy tên constraint thực tế:
   SELECT constraint_name
   FROM information_schema.table_constraints
   WHERE table_name = 'contract' AND constraint_type = 'UNIQUE';
   ```
   Sau đó dùng tên thực tế trong migration (thay `contract_employee_id_key` bằng kết quả truy vấn):
   ```sql
   ALTER TABLE contract
     DROP CONSTRAINT IF EXISTS contract_employee_id_key,
     ADD COLUMN effective_from  DATE,
     ADD COLUMN effective_to    DATE,
     ADD COLUMN current         BOOLEAN NOT NULL DEFAULT true;
   ```

4. Trong `ContractService.update()`, thay vì ghi đè bản ghi hiện có:
   - Đặt `effectiveTo = hôm nay` và `current = false` trên bản ghi cũ.
   - Chèn bản ghi mới với `effectiveFrom = hôm nay` và `current = true`.

5. Trong `ContractRepository`, thay đổi bộ tìm hợp đồng đang hoạt động:
   ```java
   Optional<Contract> findByEmployeeInfo_EmployeeIdAndCurrentTrue(String employeeId);
   ```

6. Động cơ bảng lương sử dụng hợp đồng có hiệu lực trong kỳ:
   ```java
   Optional<Contract> findByEmployeeInfo_EmployeeIdAndEffectiveFromLessThanEqualAndCurrentTrue(
       String employeeId, LocalDate date);
   ```

### 5.3 Cảnh Báo Hết Hạn Hợp Đồng `[BE]`

**Cung cấp trong Phase 5:** Hiển thị hợp đồng sắp hết hạn qua API và ghi log cảnh báo.

**File:** Tạo `facez/src/main/java/org/dummy/facez/domain/contract/scheduler/ContractExpiryScheduler.java`

```java
@Component
@RequiredArgsConstructor
public class ContractExpiryScheduler {

    private final ContractRepository contractRepository;
    private final ApplicationEventPublisher eventPublisher;

    // Chạy mỗi ngày lúc 08:00
    @Scheduled(cron = "0 0 8 * * *")
    public void checkExpiringContracts() {
        LocalDate warningDate = LocalDate.now().plusDays(30);
        List<Contract> expiring = contractRepository
            .findByCurrentTrueAndEndDateBetween(LocalDate.now(), warningDate);
        expiring.forEach(c -> {
            log.warn("Hợp đồng sắp hết hạn: employee={}, endDate={}",
                c.getEmployeeInfo().getEmployeeId(), c.getEndDate());
            // Phase 8 sẽ thêm: eventPublisher.publishEvent(new ContractExpiringEvent(this, c));
        });
    }
}
```

**Endpoint mới (Phase 5):** `GET /api/contracts/expiring-soon?withinDays=30` (HR_ADMIN) — trả về danh sách mà scheduler kiểm tra, cho phép HR xem xét chủ động từ giao diện.

> **Kết nối Phase 8:** Khi hệ thống thông báo được triển khai trong Phase 8.1, thêm `eventPublisher.publishEvent(new ContractExpiringEvent(this, c))` bên trong vòng lặp scheduler. `ContractExpiringEvent` được module thông báo xử lý để gửi cảnh báo trong ứng dụng đến người dùng HR_ADMIN.

---

### Tiêu Chí Nghiệm Thu Giai Đoạn 5
- [ ] Migration V12 hoàn thành không lỗi; các chuỗi ngày không chuẩn được xác định và sửa trước đó.
- [ ] `startDate` và `endDate` được lưu dưới dạng `DATE` trong PostgreSQL.
- [ ] Cập nhật hợp đồng tạo bản ghi mới và đặt `effectiveTo` trên bản ghi cũ. Không có dữ liệu nào bị ghi đè.
- [ ] Endpoint danh sách hợp đồng trả về lịch sử hợp đồng của nhân viên.
- [ ] Tính toán bảng lương sử dụng hợp đồng có hiệu lực trong kỳ bảng lương.
- [ ] `GET /api/contracts/expiring-soon` trả về các hợp đồng có `endDate` trong vòng 30 ngày.
- [ ] Hợp đồng hết hạn trong vòng 30 ngày xuất hiện trong log scheduler hàng ngày.

---

## Giai Đoạn 6 — Tuân Thủ Làm Thêm Giờ

**Mục tiêu:** Thực thi giới hạn làm thêm giờ theo Bộ luật Lao động Việt Nam và cải thiện độ chính xác phân loại OT.

### 6.1 Thực Thi Giới Hạn OT `[BE]` `[DB]`

**File:** `facez/src/main/java/org/dummy/facez/domain/otrequest/service/OTRequestService.java`

Trong `create()`, sau xác thực cơ bản, thêm — dùng **phút** xuyên suốt để tránh cắt ngắn ngầm phần lẻ giờ:

```java
// Kiểm tra giới hạn OT tháng (Điều 107 Bộ luật Lao động: tối đa 40 giờ/tháng = 2400 phút)
long requestedMinutes = Duration.between(req.getStartTime(), req.getEndTime()).toMinutes();
long monthlyOtMinutes = calculateApprovedOtMinutesForMonth(
    employeeId, startTime.getYear(), startTime.getMonthValue());
if (monthlyOtMinutes + requestedMinutes > 2400) {
    throw new BadRequestException(String.format(
        "Yêu cầu này sẽ vượt quá giới hạn OT tháng 40 giờ. " +
        "Đã duyệt trong tháng: %.1f giờ. Yêu cầu: %.1f giờ.",
        monthlyOtMinutes / 60.0, requestedMinutes / 60.0));
}

// Kiểm tra giới hạn OT năm (tối đa 200 giờ = 12000 phút)
long annualOtMinutes = calculateApprovedOtMinutesForYear(employeeId, startTime.getYear());
if (annualOtMinutes + requestedMinutes > 12000) {
    throw new BadRequestException(String.format(
        "Yêu cầu này sẽ vượt quá giới hạn OT năm 200 giờ. " +
        "Đã duyệt trong năm: %.1f giờ.", annualOtMinutes / 60.0));
}
```

Thêm view cơ sở dữ liệu để tối ưu hiệu năng truy vấn — viết migration `V14a__ot_monthly_summary_view.sql`:

```sql
CREATE OR REPLACE VIEW ot_monthly_summary AS
SELECT
    ot.employee_id,
    EXTRACT(YEAR  FROM ot.start_time) AS ot_year,
    EXTRACT(MONTH FROM ot.start_time) AS ot_month,
    SUM(EXTRACT(EPOCH FROM (ot.end_time - ot.start_time)) / 60) AS approved_minutes
FROM ot_request ot
WHERE ot.status = 'APPROVED'
  AND ot.delete_flag = false
GROUP BY ot.employee_id, ot_year, ot_month;
```

`calculateApprovedOtMinutesForMonth()` truy vấn view này thay vì quét toàn bộ bảng.

### 6.2 Phân Loại Loại OT Chính Xác `[BE]`

**File:** `facez/src/main/java/org/dummy/facez/domain/payroll/service/PayrollCalculationEngine.java`

Thay thế flag nhị phân ca đêm bằng tính toán chồng lấp tỷ lệ với khoảng thời gian pháp lý ca đêm (22:00–06:00 ngày hôm sau). Kiểm tra boolean trước đây (`startHour >= 22 || endHour < 6`) bỏ sót các ca OT chồng lấp một phần với cửa sổ ca đêm (ví dụ: 20:00–23:00).

```java
private long computeOtPayForRequest(OTRequest ot, long hourlyRate) {
    LocalDateTime start = ot.getStartTime();
    LocalDateTime end   = ot.getEndTime();
    double totalMinutes = Duration.between(start, end).toMinutes();

    DayOfWeek dow = start.getDayOfWeek();
    boolean isPublicHoliday = publicHolidayRepository.existsByHolidayDate(start.toLocalDate());
    boolean isWeekend = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY);

    double baseRate;
    if (isPublicHoliday) baseRate = 3.0;
    else if (isWeekend)  baseRate = 2.0;
    else                 baseRate = 1.5;

    // Tính số phút rơi vào khoảng thời gian ca đêm pháp lý (22:00–06:00 ngày hôm sau)
    double nightMinutes = calculateNightOverlapMinutes(start, end);
    double dayMinutes   = totalMinutes - nightMinutes;

    double pay = (hourlyRate / 60.0) * (dayMinutes * baseRate + nightMinutes * (baseRate + 0.3));
    return Math.round(pay);
}

/**
 * Trả về số phút trong [start, end) chồng lấp với khoảng ca đêm pháp lý 22:00–06:00.
 */
private double calculateNightOverlapMinutes(LocalDateTime start, LocalDateTime end) {
    double overlap = 0;
    LocalDateTime cursor = start;
    while (cursor.isBefore(end)) {
        LocalDateTime minuteEnd = cursor.plusMinutes(1);
        if (minuteEnd.isAfter(end)) minuteEnd = end;
        int hour = cursor.getHour();
        if (hour >= 22 || hour < 6) {
            overlap += Duration.between(cursor, minuteEnd).toSeconds() / 60.0;
        }
        cursor = minuteEnd;
    }
    return overlap;
}
```

---

### Tiêu Chí Nghiệm Thu Giai Đoạn 6
- [ ] Tạo yêu cầu OT vượt quá 40 giờ trong cùng tháng trả về lỗi 400 nêu rõ tổng tháng hiện tại tính theo giờ (không bị cắt ngắn thành giờ nguyên).
- [ ] Yêu cầu OT 1 giờ 45 phút được tính là 105 phút, không phải 60 phút.
- [ ] OT vào ngày lễ được tính ở mức ×3,0 trong bảng lương.
- [ ] OT vào cuối tuần là ×2,0; ngày thường là ×1,5.
- [ ] OT từ 20:00–23:00 chỉ nhận phụ cấp ca đêm cho phần 22:00–23:00 (60 phút tại rate+0,3), không phải toàn bộ 3 giờ.
- [ ] `PayrollCalculationEngine` có unit test cho mỗi tổ hợp mức: ngày thường ban ngày, ngày thường ban đêm, cuối tuần ban ngày, cuối tuần ban đêm, ngày lễ ban ngày, ngày lễ ban đêm.

---

## Giai Đoạn 7 — Chức Năng Kế Toán

**Mục tiêu:** Bổ sung tính toán chi phí phía chủ sử dụng lao động và các đầu ra báo cáo mà phòng Kế toán cần.

### 7.1 Thêm Chi Phí Phía Chủ Sử Dụng Lao Động kèm Trần BHXH `[BE]` `[DB]`

**File:** `facez/src/main/java/org/dummy/facez/domain/payroll/model/Payroll.java`

Thêm các trường đóng góp của chủ sử dụng lao động:

```java
/** BHXH chủ = lương cơ sở đóng BH đã chặn trần × 17% */
private long bhxhEmployer;

/** BHYT chủ = lương cơ sở đóng BH đã chặn trần × 3% */
private long bhytEmployer;

/** BHTN chủ = lương cơ sở đóng BH đã chặn trần × 1% */
private long bhtnEmployer;

/** TNLĐ-BNN chủ = lương cơ sở đóng BH đã chặn trần × 0,5% */
private long workplaceAccidentInsurance;

/** Tổng đóng góp của chủ sử dụng lao động */
private long totalEmployerContributions;

/** Tổng chi phí lao động thực tế: lương thực nhận + tất cả khấu trừ + đóng góp của chủ */
private long totalEmploymentCost;
```

Viết migration `V14b__employer_contributions.sql`.

**File:** `facez/src/main/java/org/dummy/facez/domain/payroll/service/PayrollCalculationEngine.java`

Áp dụng **trần đóng góp bảo hiểm pháp lý** trước khi tính toán đóng góp của nhân viên lẫn chủ sử dụng. Luật Bảo hiểm Xã hội Việt Nam giới hạn mức đóng hàng tháng tối đa 20 lần mức lương tối thiểu pháp lý (2026: 20 × 2.340.000đ = 46.800.000đ). Đọc lương tối thiểu từ `SystemConfig` để Tài chính có thể cập nhật mà không cần triển khai lại code.

```java
// Đọc từ SystemConfig loại SALARY_GRADE / statutory_min_wage
long statutoryMinWage = payrollConfigService.getStatutoryMinimumWage();
long cappedInsuranceBase = Math.min(grossSalary, 20L * statutoryMinWage);

// Khấu trừ phía nhân viên (dùng cappedInsuranceBase, không dùng grossSalary)
long bhxhEmployee = cappedInsuranceBase *  8 / 100;
long bhytEmployee = cappedInsuranceBase * 15 / 1000;  // 1,5%
long bhtnEmployee = cappedInsuranceBase *  1 / 100;

// Đóng góp phía chủ (dùng cùng base đã chặn trần)
long bhxhEmployer      = cappedInsuranceBase * 17 / 100;
long bhytEmployer      = cappedInsuranceBase *  3 / 100;
long bhtnEmployer      = cappedInsuranceBase *  1 / 100;
long accidentIns       = cappedInsuranceBase / 200;  // 0,5%
long totalEmployer     = bhxhEmployer + bhytEmployer + bhtnEmployer + accidentIns;
long totalEmploymentCost = totalGross + totalEmployer;
```

### 7.2 Báo Cáo Tổng Hợp Chi Phí Lao Động `[BE]`

**Endpoint mới:** `GET /api/payrolls/reports/labour-cost` (FINANCE_ADMIN, DIRECTOR, SYSTEM_ADMIN)

Tham số truy vấn: `year`, `month`, tùy chọn `departmentId`.

Cấu trúc phản hồi:
```json
{
  "period": "2026-03",
  "departmentId": "DEPT-001",
  "departmentName": "Engineering",
  "headcount": 25,
  "totalGross": 450000000,
  "totalNetSalary": 380000000,
  "totalEmployeeInsurance": 22500000,
  "totalEmployerInsurance": 96750000,
  "totalPit": 47500000,
  "totalOtPay": 15000000,
  "totalEmploymentCost": 546750000,
  "byEmployee": [ { ... } ]
}
```

### 7.3 Báo Cáo Tổng Hợp Nộp Bảo Hiểm `[BE]`

**Endpoint mới:** `GET /api/payrolls/reports/insurance-remittance` (FINANCE_ADMIN, SYSTEM_ADMIN)

Tham số truy vấn: `year`, `month`.

Phản hồi: danh sách nhân viên với lương cơ sở đóng bảo hiểm đã chặn trần và cả hai khoản đóng góp phía nhân viên lẫn chủ sử dụng lao động. Thay thế bảng tính thủ công mà Tài chính hiện tạo ngoài hệ thống.

### 7.4 Dữ Liệu Tổng Hợp Thuế TNCN `[BE]`

**Endpoint mới:** `GET /api/payrolls/reports/pit-summary` (FINANCE_ADMIN, SYSTEM_ADMIN)

Tham số truy vấn: `year`, `month`.

Phản hồi: danh sách nhân viên với `taxableIncome`, `pit` và `dependentCount` trong tháng. Hỗ trợ khai báo nộp tạm thuế TNCN hàng tháng.

### 7.5 Tính Thuế TNCN Lũy Tiến `[BE]` `[DB]`

Việc tính thuế TNCN phải tuân theo biểu thuế lũy tiến 7 bậc theo Luật Thuế Thu nhập Cá nhân Việt Nam (Thông tư 111/2013/TT-BTC). Lưu ngưỡng và thuế suất trong `SystemConfig` (loại `PIT_BRACKETS`) để có thể cập nhật khi luật thay đổi mà không cần sửa code.

**Dữ liệu seed cho `V15__pit_brackets_config.sql`:**
```json
{
  "brackets": [
    { "fromVnd": 0,          "toVnd": 5000000,   "rate": 0.05 },
    { "fromVnd": 5000000,    "toVnd": 10000000,  "rate": 0.10 },
    { "fromVnd": 10000000,   "toVnd": 18000000,  "rate": 0.15 },
    { "fromVnd": 18000000,   "toVnd": 32000000,  "rate": 0.20 },
    { "fromVnd": 32000000,   "toVnd": 52000000,  "rate": 0.25 },
    { "fromVnd": 52000000,   "toVnd": 80000000,  "rate": 0.30 },
    { "fromVnd": 80000000,   "toVnd": null,       "rate": 0.35 }
  ],
  "personalDeduction": 11000000,
  "dependentDeduction": 4400000
}
```

**Triển khai trong `PayrollCalculationEngine`:**
```java
private long calculatePit(long grossSalary, int dependentCount,
                           long totalInsuranceDeductions, List<PitBracket> brackets,
                           long personalDeduction, long dependentDeduction) {
    long taxableIncome = grossSalary - totalInsuranceDeductions
                         - personalDeduction
                         - (dependentCount * dependentDeduction);
    if (taxableIncome <= 0) return 0;

    long pit = 0;
    for (PitBracket bracket : brackets) {
        if (taxableIncome <= 0) break;
        long bracketSize = bracket.getToVnd() != null
            ? bracket.getToVnd() - bracket.getFromVnd()
            : Long.MAX_VALUE;
        long taxableInBracket = Math.min(taxableIncome, bracketSize);
        pit += Math.round(taxableInBracket * bracket.getRate());
        taxableIncome -= taxableInBracket;
    }
    return pit;
}
```

### 7.6 Endpoint Phiếu Lương Cá Nhân `[BE]`

Mọi HRMS đều phải cho phép nhân viên xem và tải về phiếu lương của mình. Các endpoint báo cáo chỉ dành cho Tài chính (7.2–7.4) là không đủ.

**Endpoint mới:** `GET /api/payrolls/my/{year}/{month}/slip` (EMPLOYEE, FINANCE_ADMIN, SYSTEM_ADMIN)

Quy tắc nghiệp vụ:
- Nhân viên gọi chỉ có thể lấy phiếu lương của mình (kiểm tra trong service bằng cách so khớp tên đăng nhập đã xác thực với `employeeId` của bảng lương).
- Trả về HTTP 404 nếu không có bảng lương `PAID` hoặc `APPROVED` cho kỳ đó.
- Trả về `PayslipResponse` chứa: kỳ, lương gross, từng khoản khấu trừ (BHXH, BHYT, BHTN, thuế TNCN), lương thực nhận, và số tài khoản ngân hàng đang đăng ký.

```java
// Trong PayrollService
public PayslipResponse getMyPayslip(int year, int month, String authenticatedUsername) {
    EmployeeInfo employee = employeeRepository.findByUserAccount_Username(authenticatedUsername)
        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên"));
    Payroll payroll = payrollRepository
        .findByEmployeeInfo_EmployeeIdAndPayYearAndPayMonthAndStatusIn(
            employee.getEmployeeId(), year, month,
            List.of(PayrollStatus.APPROVED, PayrollStatus.PAID))
        .orElseThrow(() -> new ResourceNotFoundException(
            "Không có phiếu lương cho " + year + "/" + month));
    return PayslipMapper.toResponse(payroll);
}
```

**Frontend:** Thêm trang `Phiếu Lương Của Tôi` dưới `app/employees/payslip/` với bộ chọn tháng. Trang nên hỗ trợ in (`@media print` CSS).

---

### Tiêu Chí Nghiệm Thu Giai Đoạn 7
- [ ] Mỗi bản ghi bảng lương đã tính chứa các trường đóng góp phía chủ sử dụng lao động.
- [ ] Với nhân viên thu nhập 60.000.000đ/tháng, lương cơ sở đóng bảo hiểm được chặn ở 46.800.000đ, không phải 60.000.000đ.
- [ ] Báo cáo chi phí lao động trả về tổng chính xác khớp với tổng các bản ghi bảng lương riêng lẻ.
- [ ] Báo cáo nộp bảo hiểm liệt kê mọi nhân viên có trong bảng lương kỳ đó.
- [ ] Thuế TNCN được tính theo biểu lũy tiến 7 bậc, đọc mức thuế từ `SystemConfig`.
- [ ] Nhân viên có thể lấy phiếu lương của mình qua `GET /api/payrolls/my/{year}/{month}/slip`.
- [ ] Nhân viên không thể lấy phiếu lương của nhân viên khác (trả về 403).
- [ ] Các endpoint báo cáo Tài chính chỉ có thể truy cập bởi FINANCE_ADMIN, DIRECTOR và SYSTEM_ADMIN.

---

## Giai Đoạn 8 — Vận Hành và Tăng Cường Bảo Mật

**Mục tiêu:** Làm cho hệ thống có khả năng quan sát, bảo mật và dễ bảo trì trong môi trường production.

### 8.1 Hệ Thống Thông Báo `[BE]`

**Module mới:** `facez/src/main/java/org/dummy/facez/domain/notification/`

Triển khai cơ chế thông báo dựa trên Spring Application Events.

**Các sự kiện cần phát hành:**
- `LeaveRequestSubmittedEvent` → thông báo cho LEADER của nhân viên
- `LeaveRequestApprovedEvent` / `LeaveRequestRejectedEvent` → thông báo cho nhân viên đã nộp
- `PayrollSubmittedForApprovalEvent` → thông báo cho tất cả người dùng DIRECTOR
- `PayrollApprovedEvent` / `PayrollRejectedEvent` → thông báo cho FINANCE_ADMIN đã trình
- `ContractExpiringEvent` → thông báo cho HR_ADMIN (kết nối vào scheduler Phase 5.3 — xem ghi chú Phase 5.3)

Lưu thông báo vào bảng `notification` (nhân viên, thông điệp, cờ đã đọc, thời gian). Thêm endpoint `GET /api/notifications/my` để frontend polling.

**Frontend:** Thêm biểu tượng chuông thông báo trong component `Header` hiển thị số lượng chưa đọc và danh sách dropdown.

### 8.2 Bật Spring Boot Actuator `[BE]` `[CFG]`

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics
  endpoint:
    health:
      show-details: when-authorized
```

Cập nhật `SecurityConfig` để hạn chế các endpoint actuator ngoài `/health` chỉ dành cho `SYSTEM_ADMIN`.

### 8.3 Chuyển Ảnh Đại Diện sang Object Storage `[BE]` `[DB]`

Migration này phải thực hiện trong **ba release riêng biệt** để đảm bảo không mất ảnh nếu quá trình tải lên storage thất bại.

**Release A — Migration V16a (thêm cột URL, giữ BLOB):**
```sql
ALTER TABLE employee_info
  ADD COLUMN profile_picture_url VARCHAR(500);
```

**Release B — Job migration nền:**

Viết `ProfilePictureMigrationService` chạy một lần khi khởi động (được bảo vệ bởi flag trong `system_config`):
```java
// Với mỗi nhân viên có profilePicture != null và profilePictureUrl == null:
//   Tải BLOB lên MinIO → lấy URL → đặt profilePictureUrl → lưu → để null blob
```
Chạy job này trên môi trường không phải production trước. Xác minh 100% nhân viên có `profilePictureUrl` không null trước khi tiến hành Release C.

**Release C — Migration V16b (xóa cột BLOB, chỉ sau khi xác minh đầy đủ):**
```sql
ALTER TABLE employee_info
  DROP COLUMN profile_picture;
```

**Endpoint mới:** `POST /api/employees/{id}/profile-picture` — nhận file multipart, tải lên MinIO hoặc S3-compatible storage, lưu URL trả về vào `profilePictureUrl`.

### 8.4 Xác Thực Thiết Bị cho Endpoint Check-in `[BE]`

**Entity mới:** `ApiKey`

```java
@Entity
@Table(name = "api_key")
public class ApiKey {
    @Id private String id;
    private String keyHash;       // hash bcrypt của khóa thực tế
    private String deviceId;      // FK → device
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime lastUsedAt;
}
```

Viết migration `V17__api_key.sql`.

Thêm filter `DeviceApiKeyFilter` chạy trước `JwtAuthFilter` trên `/api/checkin-logs/**`. Filter kiểm tra header `X-API-Key`, tra cứu hash khóa trong bảng `api_key`, và đặt `Authentication` cấp thiết bị trong `SecurityContext` nếu hợp lệ.

Cung cấp `POST /api/devices/{id}/api-key` (SYSTEM_ADMIN) để tạo và trả về API key mới cho thiết bị (hiển thị một lần, không lưu dạng văn bản rõ).

### 8.5 Ghi Log Có Cấu Trúc `[CFG]`

```xml
<springProfile name="prod">
  <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
  </appender>
  <root level="INFO">
    <appender-ref ref="JSON"/>
  </root>
</springProfile>
```

Thêm filter ghi log yêu cầu phát ra một dòng log cho mỗi request: method, path, status code, thời gian xử lý và tên người dùng đã xác thực.

---

### Tiêu Chí Nghiệm Thu Giai Đoạn 8
- [ ] Khi đơn nghỉ phép được nộp, người phê duyệt liên quan có thông báo hiển thị trong giao diện.
- [ ] Khi hợp đồng sắp hết hạn, HR_ADMIN nhận thông báo trong ứng dụng (scheduler Phase 5.3 + event Phase 8.1).
- [ ] `GET /actuator/health` trả về 200 với `{"status": "UP"}` cho người gọi chưa xác thực.
- [ ] Ảnh đại diện được phục vụ từ URL, không tải xuống dạng byte blob (Release C hoàn thành chỉ sau khi xác minh 100% migration URL).
- [ ] Các endpoint log check-in từ chối yêu cầu không có header `X-API-Key` hợp lệ.
- [ ] Log production được định dạng JSON với request ID trên mỗi dòng.

---

## Thứ Tự Triển Khai Tổng Hợp

```
Giai đoạn 0 ────────────────────────────────────────────────── Tuần 1–3
  0.1  Thiết lập Flyway migration
  0.2  Đưa tất cả secrets ra ngoài
  0.3  Lớp base audit + migration
  0.4  Rate limiting đăng nhập (Bucket4j với Redis backend)
  0.5  Profile môi trường (dev/staging/prod) + danh mục kiểm tra trước triển khai

Giai đoạn 1 ────────────────────────────────────────────────── Tuần 4–7
  1.1  Thêm vai trò FINANCE_ADMIN và DIRECTOR
  1.2  Viết lại quy tắc phân quyền SecurityConfig
  1.3  Thiết kế lại quy trình PayrollStatus (thêm PENDING_APPROVAL, REJECTED)
  1.4  Thêm bước chốt kỳ chấm công của HR
  1.5  Routing vai trò frontend và các trang mới (+ xử lý lỗi/toast)
  1.6  Áp dụng chiến lược phiên bản API (/api/v1/ prefix)

Giai đoạn 2 ────────────────────────────────────────────────── Tuần 8
  2.1  Các trường pháp lý của nhân viên (số CCCD, ngân hàng, mã số thuế, v.v.)
  2.2  Entity đăng ký người phụ thuộc thuế

Giai đoạn 3 ────────────────────────────────────────────────── Tuần 9
  3.1  Spring Event tách biệt (CheckinProcessedEvent → AttendanceService)
  3.2  Cấu hình giờ làm việc linh hoạt qua SystemConfig
  3.3  Lịch ngày lễ

Giai đoạn 4 ────────────────────────────────────────────────── Tuần 10–11
  4.1  Enum LeaveType + thêm vào LeaveRequest
  4.2  Entity LeaveBalance với trừ hai giai đoạn qua pendingDays
  4.3  Đối chiếu vắng mặt trong chốt kỳ
  4.4  Bảo vệ chống nộp loại nghỉ phép chỉ dành cho hệ thống

Giai đoạn 5 ────────────────────────────────────────────────── Tuần 12
  5.1  Sửa kiểu ngày hợp đồng sang LocalDate (V12 — TRƯỚC)
  5.2  Lịch sử hợp đồng (one-to-many, effectiveFrom/effectiveTo) (V13 — SAU)
  5.3  Endpoint hợp đồng sắp hết hạn + log scheduler (thông báo kết nối ở Phase 8)

Giai đoạn 6 ────────────────────────────────────────────────── Tuần 13
  6.1  Thực thi giới hạn OT tháng/năm (tính theo phút)
  6.2  Phân loại loại OT (phụ cấp ca đêm theo tỷ lệ chồng lấp)

Giai đoạn 7 ────────────────────────────────────────────────── Tuần 14–16
  7.1  Các trường bảo hiểm phía chủ + trần BHXH trong PayrollCalculationEngine
  7.2  Endpoint báo cáo tổng hợp chi phí lao động
  7.3  Endpoint báo cáo nộp bảo hiểm
  7.4  Endpoint báo cáo tổng hợp thuế TNCN
  7.5  Triển khai thuế TNCN lũy tiến 7 bậc (lưu trong SystemConfig)
  7.6  Endpoint phiếu lương cá nhân + trang frontend

Giai đoạn 8 ────────────────────────────────────────────────── Tuần 17–20
  8.1  Hệ thống thông báo trong ứng dụng (kết nối ContractExpiringEvent từ Phase 5.3)
  8.2  Spring Boot Actuator
  8.3  Chuyển ảnh đại diện sang object storage (3 release)
  8.4  Xác thực API key cho thiết bị
  8.5  Ghi log JSON có cấu trúc
```

---

## Trình Tự Migration Cơ Sở Dữ Liệu

| File Migration | Giai đoạn | Mô tả |
|---|---|---|
| `V1__baseline_schema.sql` | 0.1 | Schema đầy đủ từ các entity hiện có |
| `V2__add_audit_columns.sql` | 0.3 | `created_by`, `updated_by` trên các bảng chính |
| `V3__add_roles.sql` | 1.1 | Chỉ tài liệu hóa (giá trị enum trong Java) |
| `V4__payroll_status_update.sql` | 1.3 | Thêm `rejection_reason`, `PENDING_APPROVAL`, `REJECTED` vào `payroll` |
| `V5__attendance_period_close.sql` | 1.4 | Bảng `attendance_period_close` mới |
| `V6__employee_statutory_fields.sql` | 2.1 | `national_id`, `bank_account_number`, `tax_code`, v.v. |
| `V7__tax_dependent.sql` | 2.2 | Bảng `tax_dependent` mới |
| `V8__work_schedule_config.sql` | 3.2 | Seed cấu hình giờ làm việc mặc định vào `system_config` |
| `V9__public_holiday.sql` | 3.3 | Bảng `public_holiday` mới + dữ liệu seed năm 2026 |
| `V10__leave_type.sql` | 4.1 | Cột `leave_type`, `duration_hours` trên `leave_request` |
| `V11__leave_balance.sql` | 4.2 | Bảng `leave_balance` mới (bao gồm cột `pending_days`) |
| `V12__contract_date_types.sql` | **5.1** | Chuyển đổi an toàn `start_date`, `end_date` sang kiểu `DATE` |
| `V13__contract_history.sql` | **5.2** | Xóa unique constraint (tên thực tế), thêm `effective_from/to`, `current` |
| `V14a__ot_monthly_summary_view.sql` | 6.1 | View tổng hợp OT tháng để tối ưu hiệu năng truy vấn giới hạn |
| `V14b__employer_contributions.sql` | 7.1 | Các cột bảo hiểm phía chủ sử dụng lao động trên `payroll` |
| `V15__pit_brackets_config.sql` | 7.5 | Seed dữ liệu biểu thuế TNCN vào `system_config` |
| `V16a__profile_picture_url.sql` | 8.3-A | Thêm cột `profile_picture_url` (giữ BLOB) |
| `V16b__profile_picture_drop_blob.sql` | 8.3-C | Xóa BLOB `profile_picture` (chỉ sau khi xác minh job migration) |
| `V17__api_key.sql` | 8.4 | Bảng `api_key` mới |

---

*Kết thúc Tài liệu 5 — Phiên bản 1.1*
