# Hướng dẫn Triển khai — FaceZ HRMS

**Phiên bản:** 1.0 | **Ngày:** 16-06-2026
**Nguồn:** `facez/src/main/resources/application.yml`, `compose.yaml`, CLAUDE.md gốc + `facez`.
**Liên quan:** [System Architecture](../02-technical/05-system-architecture.md) · [Data Migration](14-data-migration-plan.md)

Hướng dẫn này đưa một host trắng tới FaceZ HRMS đang chạy. Viết đủ chi tiết để người chưa biết hệ thống
cũng theo được từ đầu đến cuối.

---

## 1. Topology mục tiêu

```
Trình duyệt ─▶ Frontend Next.js (:3000) ─▶ API Spring Boot (:8084 /face-z)
                                              ├─▶ PostgreSQL 15  (:5434, db HRMS)
                                              ├─▶ Redis 7        (:6379)
                                              └─▶ MinIO          (:9000, bucket facez-contracts)
                                              └─▶ volume cục bộ   uploads/profile-pictures/
```

## 2. Yêu cầu tiên quyết

| Thành phần | Phiên bản | Ghi chú |
|------------|-----------|---------|
| Java | 21+ | Runtime/build backend |
| Node.js | 18+ | Build/run frontend |
| PostgreSQL | 15 | Nguồn sự thật |
| Redis | 7 | Token, rate limit |
| MinIO (hoặc tương thích S3) | mới nhất | Lưu tài liệu hợp đồng |
| Docker + Compose | mới nhất | Khuyến nghị cho dịch vụ dữ liệu |

## 3. Cấu hình (biến môi trường)

Backend đọc các biến sau (default chỉ dành **dev** — override ở staging/prod):

| Biến | Default (dev) | Mục đích |
|------|---------------|----------|
| `DB_URL` | `jdbc:postgresql://localhost:5434/HRMS` | JDBC URL |
| `DB_USERNAME` / `DB_PASSWORD` | `hrmsuser` / `hrmspassword` | Thông tin DB |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Redis |
| `JWT_SECRET` | placeholder dev | **Bắt buộc đặt** secret mạnh ở prod |
| `JWT_ACCESS_EXP_MS` | `300000` (5 phút) | TTL access token |
| `JWT_REFRESH_EXP_MS` | `1209600000` (14 ngày) | TTL refresh token |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Origin frontend cho phép |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` | `http://localhost:9000` / `admin` / `password123` / `facez-contracts` | Object storage cho hợp đồng |

Cấu hình cố định khác: server `port: 8084`, `context-path: /face-z`; multipart tối đa 15 MB;
refresh cookie `refreshToken` (`secure: true`, `sameSite: Lax`); `jpa.hibernate.ddl-auto: none`.

**Frontend** (`facez-front/.env.local`): `NEXT_PUBLIC_API_BASE=http://localhost:8084/face-z`
(xem `.env.example`).

> ⚠️ Tăng cường cho production: đặt `JWT_SECRET` riêng; giới hạn `CORS_ALLOWED_ORIGINS`; thay credential
> MinIO mặc định; terminate TLS trước cả hai service (refresh cookie là `Secure`). Xem
> [07 — Nhận xét, mục 3](../../07_system_review_and_recommendations.md) về các rủi ro cấu hình mặc định.

## 4. Bật dịch vụ dữ liệu

**Cách A — Docker (khuyến nghị):**
```bash
cd facez
docker compose -f compose.yaml up -d   # PostgreSQL, pgAdmin (5050), Redis (và MinIO nếu cấu hình)
```
Kiểm tra: `docker ps` thấy container healthy. (Nếu chỉ có `compose.yaml.txt`, đổi tên thành `compose.yaml`.)

**Cách B — Dịch vụ cục bộ:** đảm bảo PostgreSQL (db `HRMS`, user `hrmsuser`), Redis 6379, và MinIO 9000
với bucket `facez-contracts` đang chạy và truy cập được.

## 5. Migration CSDL (Flyway)

- Schema **không** tự sinh (`ddl-auto: none`). Flyway apply `V1`–`V27` từ `src/main/resources/db/migration/` lúc khởi động.
- Cấu hình: `baseline-on-migrate: false`, `out-of-order: false`, `validate-on-migrate: true`.
- Migration chạy tự động khi backend khởi động trên DB trống (hoặc đã migrate).
- **Không bao giờ sửa migration đã apply**; thêm file đánh số mới. Xem [Data Migration Plan](14-data-migration-plan.md)
  về nạp config lương hiệu lực theo ngày (V27) và seed/mock data qua script Python trong
  `src/main/resources/scripts/`.

## 6. Build & chạy backend

```bash
cd facez
./mvnw clean install         # build + chạy test
./mvnw spring-boot:run       # chạy trên :8084 (context /face-z)
# production: java -jar target/facez-*.jar --spring.profiles.active=prod
```
Profile: `application-dev.yml` / `-staging.yml` / `-prod.yml` (chọn qua `SPRING_PROFILES_ACTIVE`).

**Lần chạy đầu** `DataInitializerConfig` seed admin mặc định: **`admin` / `admin123`** — đổi mật khẩu
này ngay ở mọi môi trường dùng chung.

## 7. Build & chạy frontend

```bash
cd facez-front
npm install
npm run dev      # dev (Turbopack) trên :3000
# production:
npm run build && npm start
```

## 8. Health check & smoke test

| Kiểm tra | URL / hành động | Kỳ vọng |
|----------|-----------------|---------|
| API liveness | `GET http://localhost:8084/face-z/actuator/health` | `{"status":"UP"}` |
| Tài liệu API | `http://localhost:8084/face-z/swagger-ui.html` | Swagger UI load |
| Trạng thái Flyway | `GET /actuator/flyway` (SysAdmin) | V1..V27 `Success` |
| Login | `POST /api/auth/login` `{admin/admin123}` | 200 + token |
| Frontend | `http://localhost:3000` | trang login; đăng nhập được |
| Device key | cấp key, `POST /api/checkin-logs` với `X-Device-API-Key` | 200 |

## 9. Checklist sau triển khai

- [ ] Đã đổi mật khẩu admin mặc định.
- [ ] Đã xoay `JWT_SECRET`, credential MinIO, mật khẩu DB khỏi giá trị mặc định.
- [ ] `CORS_ALLOWED_ORIGINS` đặt đúng origin frontend thật.
- [ ] TLS trước API + frontend (refresh cookie `Secure`).
- [ ] Config lương hiệu lực theo ngày (salary grade / PIT / insurance / allowance) đã **PUBLISHED** cho kỳ
      hiện tại — nếu không, tính lương sẽ lỗi.
- [ ] Ít nhất một thiết bị đã đăng ký với API key active.
- [ ] Đã test backup/restore PostgreSQL; chấp nhận mất token Redis.
- [ ] Volume `uploads/profile-pictures/` được giữ bền; bucket MinIO đã tạo.

## 10. Ghi chú vận hành

- **Scale ngang** cần Redis dùng chung, PostgreSQL dùng chung, lưu trữ chia sẻ/object cho upload, và đưa
  `PayrollJobStore` ra ngoài nếu cần điều phối batch đa node (job hiện cục bộ theo node nhưng idempotent/re-run được).
- **Job lập lịch** (`AttendanceSchedule` nửa đêm, `PayrollScheduler` hàng tháng, `ContractExpiryScheduler`
  hàng tháng) chạy trên mỗi node — với đa node, dùng leader-election/lock để tránh trùng.
- **Log:** Spring Security và Flyway mặc định ở `DEBUG` trong `application.yml`; hạ xuống cho prod
  (xem [07 — Nhận xét, SEC-C3](../../07_system_review_and_recommendations.md)).
