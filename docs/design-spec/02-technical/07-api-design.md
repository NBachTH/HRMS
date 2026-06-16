# Tài liệu Thiết kế API — FaceZ HRMS

**Phiên bản:** 1.0 | **Ngày:** 16-06-2026
**Base URL:** `http://localhost:8084/face-z` · **Swagger UI:** `/swagger-ui.html` · **OpenAPI:** `/v3/api-docs`
**Liên quan:** [Use Cases](../01-business/02-use-cases.md) · [Security](10-security-design.md) · [Business Rules](../01-business/03-business-rules.md)

Danh mục này trích từ mapping `@RestController` và `SecurityConfig`. Cột Auth: **None** (công khai),
**JWT** (mọi người dùng đã xác thực), hoặc danh sách vai trò. Tên vai trò là authority của Spring.

---

## 1. Quy ước

### 1.1 Envelope phản hồi
Mọi endpoint trả `ApiResponse<T>`:
```json
{ "success": true, "message": "Operation successful", "data": { }, "timestamp": "2026-06-16T..." }
```
Endpoint phân trang bọc dữ liệu trong `PageResponse<T>`:
```json
{ "content": [], "totalElements": 0, "totalPages": 0, "currentPage": 0 }
```
> Vài endpoint list trả `T[]` hoặc `PageResponse<T>` tùy query param — client phải trích phòng thủ
> (`Array.isArray(data) ? data : data.content`).

### 1.2 Mã trạng thái
| Mã | Ý nghĩa |
|----|---------|
| 200 | Thành công (kể cả kết quả nghiệp vụ "mềm", vd dry-run chốt kỳ với `closed=false`) |
| 201 | Đã tạo (tạo tài nguyên) |
| 400 | Vi phạm validation / quy tắc nghiệp vụ (`message` giải thích) |
| 401 | Thiếu/sai/hết hạn token hoặc device key |
| 403 | Đã xác thực nhưng vai trò không được phép |
| 404 | Không tìm thấy tài nguyên |
| 409 | Xung đột (ràng buộc unique, chuyển trạng thái không hợp lệ) |

### 1.3 Xác thực
- `Authorization: Bearer <access token>` (JWT 5 phút) cho endpoint người dùng.
- `X-Device-API-Key: <raw key>` cho `/api/checkin-logs/**` (thiết bị).
- Refresh qua cookie HTTP-only tại `POST /api/auth/refresh`.

---

## 2. Xác thực — `/api/auth`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/login` | None | Body `{username, password}` → `{accessToken, user}`; đặt refresh cookie |
| POST | `/refresh` | Cookie | Xoay refresh token, trả access token mới |
| POST | `/logout` | JWT | Thu hồi refresh token trong Redis, xóa cookie |
| GET | `/me` | JWT | Hồ sơ người dùng hiện tại |
| PUT | `/change-password` | JWT | Body `{oldPassword, newPassword}` |

## 3. Nhân viên — `/api/employees`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `` | JWT | Danh sách/phân trang nhân viên |
| GET | `/{id}` | JWT | Chi tiết nhân viên |
| GET | `/me` | JWT | Bản ghi của chính mình |
| POST | `` | HR_ADMIN | Tạo nhân viên |
| PUT | `/{id}` | HR_ADMIN | Cập nhật |
| DELETE | `/{id}` | HR_ADMIN | Xóa mềm |
| POST | `/{id}/profile-picture` | HR_ADMIN | upload multipart (≤5 MB) |

## 4. Tài khoản — `/api/accounts`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| PATCH | `/{employeeId}/toggle` | SYSTEM_ADMIN / HR_ADMIN | Bật/tắt đăng nhập |
| PATCH | `/{employeeId}/reset-password` | SYSTEM_ADMIN / HR_ADMIN | Reset mật khẩu |

## 5. Phòng ban — `/api/departments`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `` / `/{id}` | JWT | Danh sách / chi tiết |
| GET | `/my` | JWT | Phòng của người gọi |
| POST | `` | HR_ADMIN | Tạo |
| PUT | `/{id}` | HR_ADMIN | Cập nhật (gán quản lý — unique) |
| DELETE | `/{id}` | HR_ADMIN | Xóa mềm |

## 6. Hợp đồng — `/api/contracts`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/my` | JWT | Hợp đồng hiện hành của mình |
| GET | `/{id}` | HR_ADMIN / FINANCE_ADMIN | Chi tiết |
| GET | `/employee/{employeeId}/history` | HR_ADMIN / FINANCE_ADMIN | Lịch sử version |
| GET | `/expiring-soon` | HR_ADMIN / FINANCE_ADMIN | Hợp đồng sắp hết hạn |
| POST | `` | HR_ADMIN / FINANCE_ADMIN | Version mới (đóng version trước) |
| PUT | `/{id}` | HR_ADMIN / FINANCE_ADMIN | Cập nhật |
| DELETE | `/{id}` | HR_ADMIN / FINANCE_ADMIN | Xóa mềm |
| POST | `/{id}/document` | HR_ADMIN / FINANCE_ADMIN | tài liệu hợp đồng multipart |
| GET | `/{id}/document-url` | HR_ADMIN / FINANCE_ADMIN | URL tài liệu đã lưu |

## 7. Chấm công — `/api/attendances`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `` | JWT (phạm vi HR) | Danh sách chấm công |
| GET | `/my` | JWT | Chấm công của mình |
| PUT | `/{id}` | HR_ADMIN | Sửa bản ghi |
| DELETE | `/{id}` | HR_ADMIN | Xóa mềm |
| POST | `/close-period` | HR_ADMIN | Dry-run/force close (`{year, month, forceClose}`) |
| POST | `/close-period/remind` | HR_ADMIN | Nhắc kỳ chưa chốt |

### 7.1 Điều chỉnh chấm công — `/api/attendance-adjustments`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/my` | JWT | Yêu cầu điều chỉnh của mình |
| POST | `` | JWT | Xin sửa |
| PUT | `/{id}/approve` · `/{id}/reject` | HR_ADMIN | Quyết định |
| DELETE | `/{id}` | JWT | Rút (của mình, đang chờ) |

## 8. Log chấm công — `/api/checkin-logs`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `` | DEVICE_CHECKIN / HR_ADMIN / SYSTEM_ADMIN | Một lần chấm `{employeeId, deviceId, logType, logTime}` |
| POST | `/batch` | DEVICE_CHECKIN / HR_ADMIN / SYSTEM_ADMIN | Mảng các lần chấm đã đệm |
| GET | `/my` | JWT | Log thô của mình |

## 9. Thiết bị — `/api/devices`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `` | HR_ADMIN | Danh sách thiết bị |
| POST | `` | HR_ADMIN | Đăng ký thiết bị |
| DELETE | `/{deviceId}` | HR_ADMIN | Xóa |
| POST | `/{deviceId}/api-keys` | HR_ADMIN | Cấp key (**raw trả về một lần**) |
| PATCH | `/{deviceId}/api-keys/{keyId}/deactivate` | HR_ADMIN | Xoay/thu hồi |

## 10. Ngày lễ — `/api/public-holidays`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET / POST | `` | JWT / HR_ADMIN | Danh sách / thêm ngày lễ |
| DELETE | `/{id}` | HR_ADMIN | Xóa |

## 11. Nghỉ phép — `/api/leaves`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/my` · `/{id}` | JWT | Danh sách / chi tiết của mình |
| POST | `` | JWT | Tạo DRAFT |
| PUT | `/{id}/submit` | JWT | DRAFT → TO_APPROVE |
| PUT | `/{id}/approve` | LEADER / MANAGER / HR_ADMIN | Tiến cấp theo level |
| PUT | `/{id}/reject` | LEADER / MANAGER / HR_ADMIN | Từ chối + lý do |
| DELETE | `/{id}` | JWT | Xóa (chỉ DRAFT/TO_APPROVE) |
| GET | `/balances/my` | JWT | Số dư của mình |
| GET | `/balances/{employeeId}` | HR_ADMIN | Số dư nhân viên |

## 12. Tăng ca — `/api/ot-requests` và `/api/ot-plans`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/my` · `/{id}` | JWT | OT của mình |
| POST | `` | JWT | Tạo OT request |
| PUT | `/{id}/approve` · `/{id}/reject` | LEADER / MANAGER / HR_ADMIN | Quyết định |
| DELETE | `/{id}` | JWT | Xóa (DRAFT/TO_APPROVE) |
| GET | `/api/ot-plans/my-approved` · `/{id}` | JWT | Kế hoạch đã duyệt |
| PUT | `/api/ot-plans/{id}/approve` · `/reject` | MANAGER / HR_ADMIN | Quyết định kế hoạch |

## 13. Bảng công & timesheet
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/work-days/my` | JWT | Ngày đối soát của mình |
| GET | `/api/work-days/conflicts` | HR_ADMIN | Ngày cần giải quyết |
| PATCH | `/api/work-days/{id}/resolve` | HR_ADMIN | Giải quyết xung đột |
| GET | `/api/timesheets/my` | JWT | Timesheet tháng của mình |
| GET | `/api/timesheets/{employeeId}` | HR_ADMIN | Timesheet nhân viên |

## 14. Lương — `/api/payrolls`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/calculate` | FINANCE_ADMIN | Tính một nhân viên → DRAFT |
| POST | `/batch-calculate` | FINANCE_ADMIN | Trả `{jobId}` |
| GET | `/jobs/{jobId}` | FINANCE_ADMIN | Trạng thái job batch |
| GET | `` | FINANCE_ADMIN / DIRECTOR | Danh sách payroll |
| GET | `/period` | FINANCE_ADMIN / DIRECTOR | Tổng hợp kỳ |
| GET | `/employee/{employeeId}` | FINANCE_ADMIN / DIRECTOR | Theo nhân viên |
| GET | `/{id}` | JWT (scoped) | Chi tiết payroll |
| GET | `/my` · `/my/{year}/{month}/slip` | JWT | Phiếu lương của mình |
| PATCH | `/{id}/submit` | FINANCE_ADMIN | DRAFT → PENDING_APPROVAL |
| PATCH | `/{id}/approve` | DIRECTOR | → APPROVED |
| PATCH | `/{id}/reject` | DIRECTOR | → REJECTED |
| PATCH | `/{id}/mark-paid` | FINANCE_ADMIN | APPROVED → PAID |
| DELETE | `/{id}` | FINANCE_ADMIN | Xóa (chỉ DRAFT) |
| GET | `/reports/labour-cost?year=&month=&deptId=` | FINANCE_ADMIN / DIRECTOR | Báo cáo chi phí lao động |
| GET | `/reports/insurance-remittance?year=&month=` | FINANCE_ADMIN / DIRECTOR | Báo cáo BHXH/BHYT/BHTN |
| GET | `/reports/pit-summary?year=&month=` | FINANCE_ADMIN / DIRECTOR | Báo cáo thuế TNCN |

## 15. Config lương — `/api/payroll-configs`
CRUD đối xứng cho mỗi loại `{salary-grade, pit, insurance, allowance}`:
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/{type}` · `/{type}/{id}` | FINANCE_ADMIN | Danh sách / chi tiết (kể cả DRAFT) |
| POST | `/{type}` | FINANCE_ADMIN | Tạo version DRAFT |
| PATCH | `/{type}/{id}/publish` | DIRECTOR / SYSTEM_ADMIN | DRAFT → PUBLISHED |
| DELETE | `/{type}/{id}` | FINANCE_ADMIN | Xóa DRAFT |

Cũ: `/api/system-configs` (GET `/{id}` …) — config JSONB, `FINANCE_ADMIN`.

## 16. Người phụ thuộc thuế — `/api/tax-dependents`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/employee/{employeeId}` | HR_ADMIN / JWT(của mình) | Danh sách phụ thuộc |
| POST | `` | HR_ADMIN | Thêm |
| PUT / DELETE | `/{id}` | HR_ADMIN | Cập nhật / xóa |

## 17. Thông báo — `/api/notifications`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `` | JWT | Hộp thư phân trang |
| GET | `/unread-count` | JWT | Số badge |
| PATCH | `/{id}/read` · `/read-all` | JWT | Đánh dấu đã đọc |

---

## 18. Ví dụ request/response (tính lương đơn)

**Request** `POST /api/payrolls/calculate`
```json
{ "employeeId": "emp-123", "year": 2026, "month": 5, "nt": 22,
  "kpi1Rating": "A", "kpi2Rating": null, "japaneseLevel": "N2",
  "odcAllowance": 0, "bonus": 1000000, "notes": "Kỳ tháng 5" }
```
**Response** `200`
```json
{ "success": true, "message": "Calculated",
  "data": { "payrollId": "pr-...", "status": "DRAFT", "baseGross": 18500000,
            "otPay": 0, "totalGross": 19500000, "bhxhEmployee": 1600000,
            "pit": 420000, "netSalary": 16980000, "actualWorkingDays": 22,
            "standardWorkingDays": 22 } }
```

**Lỗi** `400` (chưa chốt kỳ / không có config hiệu lực)
```json
{ "success": false, "message": "No PUBLISHED insurance config effective for 2026-05-01", "data": null }
```
