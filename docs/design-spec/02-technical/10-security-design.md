# Tài liệu Thiết kế Bảo mật — FaceZ HRMS

**Phiên bản:** 1.0 | **Ngày:** 16-06-2026
**Nguồn:** `SecurityConfig`, `JwtAuthFilter`, `DeviceApiKeyFilter`, `JwtService`, `auth/`.
**Liên quan:** [Sequence Diagrams](08-sequence-diagrams.md) · [Business Rules §2](../01-business/03-business-rules.md) · [Integration](11-integration-design.md)

---

## 1. Tổng quan mô hình bảo mật

| Chiều | Cơ chế |
|-------|--------|
| Truyền tải | HTTPS (triển khai); CORS giới hạn theo origin cấu hình |
| Xác thực người dùng | JWT access stateless + refresh token lưu Redis |
| Xác thực thiết bị | `X-Device-API-Key` (hash SHA-256 khi lưu) |
| Phân quyền | Rule URL (`SecurityConfig`) + method `@PreAuthorize` |
| Chính sách session | `STATELESS` (không có HTTP session) |
| Lưu mật khẩu | BCrypt |
| Chống brute-force | Rate limiter login Redis (10 / 15 phút / IP) |
| Audit | actor + timestamp `AuditableEntity`; lịch sử chỉ-thêm |

## 2. Vòng đời JWT

```
Cấp     → login: access (5 phút, ký) + refresh (14 ngày, Redis, cookie HttpOnly)
Validate→ JwtAuthFilter kiểm tra chữ ký + hết hạn mỗi request; set Authentication
Refresh → POST /api/auth/refresh: validate refresh trong Redis → xoay (thu hồi cũ, cấp mới)
Thu hồi → logout hoặc đổi mật khẩu: xóa/blacklist refresh token trong Redis
```

- **Access token:** ngắn (5 phút) để giới hạn rủi ro; không lưu server-side; mang username + quyền vai trò.
  Lưu **trong bộ nhớ** ở frontend (không localStorage) để giảm trộm XSS.
- **Refresh token:** dài (14 ngày), **cookie HTTP-only + Secure**, lưu/xoay trong Redis. Xoay vòng nghĩa
  là refresh token cũ bị đánh cắp-và-phát lại sẽ thất bại sau lần refresh hợp lệ kế tiếp.
- **Refresh ngầm:** `apiClient()` bắt 401/403, gọi `/refresh`, thử lại một lần, rồi đăng xuất nếu thất bại.
- **Secret:** env var `JWT_SECRET`; **không có fallback production hard-code**. Hết hạn access/refresh qua
  `JWT_ACCESS_EXP_MS` / `JWT_REFRESH_EXP_MS`.

> ⚠️ **Lưu ý kiểm chứng:** `application.yml` hiện đặt default dev `JWT_SECRET:12345678abcdefgh...`.
> Phải bỏ default này và fail-fast ở production (xem [07 — Nhận xét, SEC-C1](../../07_system_review_and_recommendations.md)).

## 3. Filter chain

```
Request → DeviceApiKeyFilter → JwtAuthFilter → UsernamePasswordAuthenticationFilter → phân quyền
```
- `DeviceApiKeyFilter` chạy **trước**, chỉ cho `/api/checkin-logs/**`: hash `X-Device-API-Key` đến bằng
  SHA-256, khớp một dòng `ApiKey` **active**, và khi thành công set principal `device:{deviceId}` với
  quyền `DEVICE_CHECKIN`. Raw key không bao giờ lưu hay log.
- `JwtAuthFilter` validate bearer token và nạp `SecurityContext` cho request người dùng.
- Session stateless; CSRF tắt (không auth bằng cookie cho bề mặt API trừ endpoint refresh — cookie có
  chủ đích, phạm vi hẹp).

## 4. Phân quyền (RBAC)

Hai lớp enforce (defense in depth):
1. **Cấp URL** trong `SecurityConfig.authorizeHttpRequests` — rule thô theo path + HTTP method
   (vd `POST /api/employees` → `HR_ADMIN`; `PATCH /api/payrolls/*/approve` → `DIRECTOR`).
2. **Cấp method** `@PreAuthorize` trên service/controller — kiểm tra mịn, kể cả scope bản-ghi-của-mình
   cho endpoint `/my` (enforce trong logic service, không chỉ bằng role).

Ma trận năng lực-vai trò đầy đủ: [Business Rules §2](../01-business/03-business-rules.md#2-quy-t%E1%BA%AFc-ph%C3%A2n-quy%E1%BB%81n--ma-tr%E1%BA%ADn-rbac-br-rbac).

**Tách bạch trách nhiệm (kiểm soát then chốt):** payroll *calculate/submit/mark-paid* yêu cầu
`FINANCE_ADMIN`; *approve/reject* yêu cầu `DIRECTOR`. Không vai trò đơn lẻ nào vừa tính vừa duyệt lương.
Tương tự config pháp lý là **maker-checker**: `FINANCE_ADMIN` tạo draft, `DIRECTOR`/`SYSTEM_ADMIN` publish.

**Endpoint công khai (không auth):** `/api/auth/login`, `/api/auth/refresh`, `/swagger-ui/**`,
`/v3/api-docs/**`, `/actuator/health`. Actuator nâng cao (`env`, `loggers`, `flyway`, `metrics`) →
chỉ `SYSTEM_ADMIN`.

## 5. Bảo mật device API-key

| Thuộc tính | Thiết kế |
|------------|----------|
| Lưu trữ | Chỉ lưu hex `SHA-256(rawKey)` trong `api_key`; raw key hiện **một lần** lúc cấp |
| Phạm vi | Chỉ cấp `DEVICE_CHECKIN` — giới hạn `/api/checkin-logs/**` |
| Xoay vòng | `PATCH /api/devices/{deviceId}/api-keys/{keyId}/deactivate`; cấp key mới |
| Thu hồi | Deactivate đặt key inactive ngay (filter kiểm tra `active`) |
| Principal | `device:{deviceId}` — phân biệt với người dùng trong audit |

Tăng cường vận hành khuyến nghị (triển khai): thiết bị chỉ TLS, key riêng/thiết bị, allow-list IP, xoay định kỳ.

## 6. Validation đầu vào & xử lý lỗi

- **Bean Validation** trên DTO (vd `@NotNull`, ràng buộc size/format) ở biên controller.
- **Bất biến tầng service** cho quy tắc nghiệp vụ không biểu diễn được bằng field validation (chuyển
  trạng thái, kiểm tra số dư, tính duy nhất, kiểm tra kỳ đã chốt).
- **Ràng buộc DB** là lớp cuối (unique index, check constraint, FK — xem [DB Design §6](06-database-design.md)).
- `GlobalExceptionHandler` chuyển exception thành `ApiResponse{success:false, message}` với status phù hợp;
  không rò stack trace ra client.

## 7. Bảo vệ dữ liệu

| Dữ liệu | Bảo vệ |
|---------|--------|
| Mật khẩu | BCrypt; giữ hash trước để cản tái sử dụng ngay |
| Device key | Chỉ hash SHA-256 |
| Refresh token | Redis, xoay/thu hồi được, cookie HttpOnly+Secure |
| Mã pháp lý (nationalId/taxCode/SI) | Unique, giới hạn truy cập (phạm vi HR); ứng viên mã hóa field (xem §9) |
| Số liệu lương | Đọc theo role; nhân viên chỉ thấy phiếu lương của mình |
| Vết audit | `createdBy/updatedBy/createdAt/updatedAt`; lịch sử config + hợp đồng chỉ-thêm |

## 8. Cân nhắc đe dọa

| Đe dọa | Giảm thiểu |
|--------|-----------|
| Credential stuffing / brute force | Rate limiter Redis (10/15 phút/IP); cost BCrypt |
| Trộm token (XSS) | Access token in-memory; TTL ngắn; refresh HttpOnly |
| Phát lại token | Xoay refresh + thu hồi Redis |
| Leo thang đặc quyền | RBAC 2 lớp; scope bản-ghi-của-mình `/my`; tách bạch trách nhiệm |
| CSRF | API bearer stateless; CSRF tắt có chủ đích; cookie chỉ dùng refresh |
| Giả mạo thiết bị | Key hash theo thiết bị, deactivate được; gắn nhãn principal |
| Tampering config | Publish maker-checker; partial unique index; cột audit |
| Phát lại duyệt lương | Máy trạng thái chặn chuyển trạng thái không hợp lệ |

## 9. Khoảng trống / khuyến nghị đã biết

- **Mã hóa field** cho mã pháp lý chưa hiện thực (hiện chỉ giới hạn truy cập).
- **TLS** phải được terminate trước ứng dụng ở môi trường ngoài dev (app không enforce).
- **Bảng audit-log** còn ngầm (cột audit trên entity); một audit/event log chỉ-thêm chuyên dụng sẽ tăng
  khả năng truy vết pháp y.
- **Cờ `Secure` của refresh cookie** phụ thuộc triển khai qua HTTPS — kiểm tra theo môi trường.
- **CORS** giới hạn `http://localhost:3000` ở dev; đặt `CORS_ALLOWED_ORIGINS` theo từng môi trường.
- **JWT secret mặc định** trong `application.yml` phải được loại bỏ trước production (SEC-C1).
