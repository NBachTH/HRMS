# FaceZ HRMS — Bộ Tài Liệu Thiết Kế

**Phiên bản:** 1.0 | **Ngày:** 16-06-2026 | **Trạng thái:** Bản nền, bám sát mã nguồn đang chạy

Thư mục này chứa tài liệu thiết kế chính thức của **FaceZ HRMS**, tổ chức theo ba nhóm kinh điển
(Nghiệp vụ, Kỹ thuật, Vận hành). Mọi tài liệu đều **bám sát cây mã nguồn thực tế** (`facez/` backend,
`facez-front/` frontend) tại thời điểm ghi trên — mô tả hệ thống *đang tồn tại*, không phải thiết kế
mong muốn. Nơi nào tính năng mới hoàn thiện một phần hoặc có khoảng trống, tài liệu đánh dấu rõ.

> Các tài liệu phân tích cũ (`01_*`–`07_*`, bản dịch `vi/`, `design/`, `report/`) vẫn nằm trong `docs/`
> để lưu lịch sử. Bộ `design-spec/` này là tài liệu thiết kế **hợp nhất, có cấu trúc** và thay thế các
> bản nháp rời rạc về mặt thiết kế. Xem thêm [Nhận xét hệ thống & khuyến nghị](../07_system_review_and_recommendations.md).

---

## Nhóm 1 — Nghiệp vụ (`01-business/`)

| # | Tài liệu | Mục đích |
|---|----------|----------|
| 01 | [Tài liệu Yêu cầu Nghiệp vụ (BRD)](01-business/01-BRD.md) | Bài toán, các bên liên quan, phạm vi, mục tiêu đo lường được |
| 02 | [Tài liệu Use Case](01-business/02-use-cases.md) | Actor, tiền điều kiện, luồng chính/phụ, hậu điều kiện |
| 03 | [Tài liệu Business Rules](01-business/03-business-rules.md) | Quy tắc test được: công thức lương, ma trận RBAC, quy tắc phép/chấm công/hợp đồng/KPI |
| 04 | [Sơ đồ Luồng Quy trình (BPMN)](01-business/04-process-flows-bpmn.md) | Tính lương, duyệt đa cấp, onboarding, thu nhận dữ liệu máy chấm công |

## Nhóm 2 — Kỹ thuật (`02-technical/`)

| # | Tài liệu | Mục đích |
|---|----------|----------|
| 05 | [Tài liệu Kiến trúc Hệ thống (SAD)](02-technical/05-system-architecture.md) | Phân tầng, lựa chọn công nghệ, topology, đánh đổi |
| 06 | [Thiết kế CSDL (ERD + Data Dictionary)](02-technical/06-database-design.md) | Mô hình thực thể-quan hệ và từ điển dữ liệu cấp cột |
| 07 | [Tài liệu Thiết kế API](02-technical/07-api-design.md) | Danh mục REST: method, param, request/response, status code, auth |
| 08 | [Sơ đồ Tuần tự (Sequence)](02-technical/08-sequence-diagrams.md) | Đăng nhập JWT + refresh, thu nhận chấm công, tính lương tháng |
| 09 | [Thiết kế Thành phần / Module](02-technical/09-component-design.md) | Trách nhiệm module, interface, phụ thuộc |
| 10 | [Tài liệu Thiết kế Bảo mật](02-technical/10-security-design.md) | Vòng đời JWT, enforce RBAC, auth thiết bị, validation, audit |
| 11 | [Tài liệu Thiết kế Tích hợp](02-technical/11-integration-design.md) | Tích hợp máy chấm công: giao thức, payload, retry, offline |

## Nhóm 3 — Vận hành (`03-operational/`)

| # | Tài liệu | Mục đích |
|---|----------|----------|
| 12 | [Kế hoạch & Test Case](03-operational/12-test-plan.md) | Test unit / integration / biên / hiệu năng theo module |
| 13 | [Hướng dẫn Triển khai](03-operational/13-deployment-guide.md) | Cài môi trường, cấu hình, Flyway, khởi động, health check |
| 14 | [Kế hoạch Di trú Dữ liệu](03-operational/14-data-migration-plan.md) | Mapping dữ liệu cũ, kiểm tra, rollback |

---

## Cách đọc bộ tài liệu

- **Stakeholder / phân tích viên** đọc 01 → 04.
- **Lập trình viên** đọc 06 (CSDL) và 09 (thành phần), rồi 07 (API) và 08 (sequence).
- **DevOps / QA** đọc 13 (triển khai) và 12 (test).
- **Đánh giá tổng thể** xem [07 — Nhận xét hệ thống](../07_system_review_and_recommendations.md).

## Nguồn tham chiếu gốc

- Package gốc backend: `org.dummy.facez` (`facez/src/main/java/...`)
- Schema: Flyway migration `V1`–`V27` (`facez/src/main/resources/db/migration/`)
- Frontend: Next.js App Router (`facez-front/src/app/`)
- Quy ước dự án: `CLAUDE.md` gốc, `facez/CLAUDE.md`, `facez-front/CLAUDE.md`
