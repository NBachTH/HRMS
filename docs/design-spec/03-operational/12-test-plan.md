# Kế hoạch & Test Case — FaceZ HRMS

**Phiên bản:** 1.0 | **Ngày:** 16-06-2026
**Liên quan:** [Business Rules](../01-business/03-business-rules.md) · [Use Cases](../01-business/02-use-cases.md) · [API Design](../02-technical/07-api-design.md)

---

## 1. Chiến lược & phạm vi

| Cấp | Mục tiêu | Công cụ |
|-----|----------|---------|
| Unit | Logic tầng service, đặc biệt `PayrollCalculationEngine` (thuần, không DB → dễ unit-test) | JUnit 5, Mockito |
| Integration | Controller → service → repository trên DB thật | Spring Boot Test, Testcontainers (PostgreSQL + Redis) |
| API / contract | Bề mặt HTTP, auth, status code, hình dạng envelope | MockMvc / REST-assured |
| Biên / nghiệp vụ | Edge case lương, chuyển trạng thái sai, số dư | JUnit parameterised |
| Hiệu năng | Batch lương, ingest chấm công đồng thời | k6 / JMeter |
| Frontend | refresh của `apiClient`, routing theo role, refresh-key bảng | Vitest / Playwright |

**Tiêu chí vào:** feature đã merge, migration apply sạch. **Tiêu chí ra:** mọi case ưu tiên 1 pass; không
defect severity-1 mở; số liệu lương khớp với tham chiếu thủ công cho một tháng mẫu.

Chạy test backend: `./mvnw test` (một class: `-Dtest=ClassName`). Frontend: `npm run lint` + unit.

## 2. Unit test — Engine lương (giá trị cao nhất)
> `PayrollCalculationEngine` thuần — đưa đầu vào, assert đầu ra. Mock `PayrollConfigService` và
> `PublicHolidayRepository`.

| ID | Case | Đầu vào | Kỳ vọng |
|----|------|---------|---------|
| UT-PR-01 | Base gross đủ tháng | NCtt=Nt=22, kpi1=A, kpi2=auto(không vi phạm,không nghỉ) | `baseGross = round((Lhq×1.04)+Li+HTi)` |
| UT-PR-02 | Proration | NCtt=11, Nt=22 | baseGross & phụ cấp sinh hoạt giảm nửa |
| UT-PR-03 | Guard Nt=0 | nt=0 | baseGross=0, otPay=0 (không chia 0) |
| UT-PR-04 | Rating KPI1 | A/B/C | 1.04 / 1.00 / 0.98 |
| UT-PR-05 | KPI2 auto | không vi phạm+không nghỉ / không vi phạm+nghỉ / vi phạm | 1.04 / 1.02 / 1.00 |
| UT-PR-06 | OT thường | 2h thứ Ba 18:00–20:00 | hệ số ×1.5, không phần đêm |
| UT-PR-07 | OT cuối tuần | thứ Bảy | hệ số ×2.0 |
| UT-PR-08 | OT ngày lễ | ngày lễ (repo trả true) | hệ số ×3.0 |
| UT-PR-09 | Phụ trội đêm OT | 21:00–23:00 | phút ≥22:00 cộng +0.3 |
| UT-PR-10 | Trần bảo hiểm | insuranceBase > 20×minWage | cơ sở trần ở 20×minWage |
| UT-PR-11 | Không đủ điều kiện bảo hiểm | contractType ∉ eligible | mọi bảo hiểm = 0 |
| UT-PR-12 | Giảm trừ PIT | dependents=2 | taxableIncome giảm personal+2×dependent relief; sàn 0 |
| UT-PR-13 | Lương net | — | `totalGross − bảo hiểm ee − PIT` |
| UT-PR-14 | KPI override manager | đặt kpi1Override/kpi2Override | override rating |

## 3. Integration test theo module

### 3.1 Auth
| ID | Case | Kỳ vọng |
|----|------|---------|
| IT-AU-01 | Login hợp lệ | 200 + access token + refresh cookie |
| IT-AU-02 | Login sai mật khẩu | 401; đếm lần |
| IT-AU-03 | Rate limit | lần thứ 11 trong 15 phút → chặn |
| IT-AU-04 | Refresh xoay vòng | refresh cũ vô hiệu sau refresh |
| IT-AU-05 | Access hết hạn → refresh → retry | lời gọi gốc thành công một lần |
| IT-AU-06 | Logout thu hồi | refresh không dùng được nữa |

### 3.2 Phân quyền (RBAC)
| ID | Case | Kỳ vọng |
|----|------|---------|
| IT-RB-01 | EMPLOYEE POST /employees | 403 |
| IT-RB-02 | FINANCE_ADMIN duyệt payroll | 403 (chỉ Director) |
| IT-RB-03 | FINANCE_ADMIN tính payroll | 200 |
| IT-RB-04 | EMPLOYEE GET /payrolls/my | 200 chỉ của mình |
| IT-RB-05 | EMPLOYEE GET payroll người khác | 403/404 |
| IT-RB-06 | Công khai /actuator/health | 200 không cần auth |
| IT-RB-07 | /actuator/env không có SysAdmin | 403 |

### 3.3 Chấm công & check-in
| ID | Case | Kỳ vọng |
|----|------|---------|
| IT-AT-01 | Device key hợp lệ chấm đơn | 200, CheckinLog + Attendance |
| IT-AT-02 | Device key sai | 401, không lưu gì |
| IT-AT-03 | IN trùng cùng ngày | lần hai bị bỏ qua (idempotent) |
| IT-AT-04 | IN rồi OUT | Attendance đóng, tính giờ/violate |
| IT-AT-05 | Thiếu OUT | bản ghi mở, violate=true |
| IT-AT-06 | Upload batch | mọi sự kiện xử lý |
| IT-AT-07 | Dry-run chốt kỳ có vắng | 200 `closed=false` + danh sách vắng |
| IT-AT-08 | forceClose chốt kỳ | khóa; bất biến sau đó |

### 3.4 Leave / OT
| ID | Case | Kỳ vọng |
|----|------|---------|
| IT-LV-01 | Chuỗi duyệt đầy đủ | DRAFT→…→APPROVED; trừ số dư |
| IT-LV-02 | Từ chối ở leader | REJECTED + lý do; số dư không đổi |
| IT-LV-03 | Leader bỏ cấp (duyệt từ DRAFT) | 400 chuyển trạng thái sai |
| IT-LV-04 | Vượt số dư | 400 khi submit |
| IT-LV-05 | Xóa ở MANAGER_APPROVED | 400 (chỉ DRAFT/TO_APPROVE) |
| IT-OT-01 | OT duyệt vào payroll | otPay phản ánh ở lần tính kế tiếp |

### 3.5 Workflow lương
| ID | Case | Kỳ vọng |
|----|------|---------|
| IT-PY-01 | Tính khi chưa chốt kỳ | 400 |
| IT-PY-02 | Tính hai lần cùng kỳ | ghi đè DRAFT (ràng buộc unique) |
| IT-PY-03 | Submit→approve→mark-paid | DRAFT→PENDING→APPROVED→PAID |
| IT-PY-04 | Director từ chối | REJECTED; Finance tính lại được |
| IT-PY-05 | Xóa payroll APPROVED | 400 (chỉ DRAFT) |
| IT-PY-06 | Batch trả jobId, poll đến COMPLETED | vòng đời job |
| IT-PY-07 | Tính khi không có config PUBLISHED hiệu lực | 400 lỗi mô tả |

### 3.6 Cấu hình (hiệu lực theo ngày, maker-checker)
| ID | Case | Kỳ vọng |
|----|------|---------|
| IT-CF-01 | Finance tạo DRAFT | lưu DRAFT |
| IT-CF-02 | Finance publish | 403 (chỉ Director/SysAdmin) |
| IT-CF-03 | Hai PUBLISHED cùng effective_from | vi phạm unique DB → 409 |
| IT-CF-04 | Engine chọn PUBLISHED mới nhất ≤ kỳ | chọn đúng version |
| IT-CF-05 | Bậc lương ngoài 1..10 | vi phạm check constraint |

## 4. Case biên / âm tính nghiệp vụ
| ID | Case | Kỳ vọng |
|----|------|---------|
| EC-01 | Đầu vào lương âm/zero | tính toán sàn hợp lý; không net âm thiếu giải thích |
| EC-02 | Quên checkout rồi HR adjustment | duyệt adjustment tính lại ngày |
| EC-03 | Nghỉ phép trùng ngày lễ | ngày lễ thắng; không tính trùng |
| EC-04 | OT qua nửa đêm (22:00–02:00) | phút đêm tính qua ranh giới ngày |
| EC-05 | Nhân viên không có hợp đồng hiện hành | tính lương báo lỗi rõ |
| EC-06 | Quản lý quản hai phòng | bị từ chối (unique manager) |
| EC-07 | Chấm trùng đồng thời | một attendance (ràng buộc unique) |

## 5. Test hiệu năng
| ID | Kịch bản | Đích |
|----|----------|------|
| PT-01 | Batch lương, 500 nhân viên | hoàn thành async; job COMPLETED; không chặn người vận hành |
| PT-02 | Burst chấm công (đầu giờ) | N lần chấm/giây ổn định không lỗi |
| PT-03 | Sinh báo cáo cả tháng | phản hồi trong SLA; CSV đúng |
| PT-04 | Login dưới rate limiter | limiter không ảnh hưởng người dùng hợp lệ |

## 6. Test frontend
| ID | Case | Kỳ vọng |
|----|------|---------|
| FT-01 | `apiClient` refresh ngầm khi 401 | retry một lần, trong suốt với UI |
| FT-02 | ProtectedRoute sai role | redirect/từ chối |
| FT-03 | refresh-key tăng sau mutation | bảng re-fetch |
| FT-04 | Trích list phòng thủ (array vs PageResponse) | cả hai render |
| FT-05 | UI polling batch lương | tiến tới COMPLETED/FAILED |

## 7. Truy vết (mẫu)

| Yêu cầu | Quy tắc | Test |
|---------|---------|------|
| FR-6 tính lương | BR-PR-01..27 | UT-PR-*, IT-PY-* |
| FR-7 tách bạch duyệt | BR-RBAC-04 | IT-RB-02/03, IT-PY-03/04 |
| FR-8 config pháp lý | BR-CFG-* | IT-CF-*, UT-PR-10/12 |
| FR-2 chấm công | BR-AT-* | IT-AT-* |
| FR-3 duyệt | BR-LV-* | IT-LV-* |
