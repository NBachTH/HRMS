# 🚀 HRMS Face-Z API Design Specification

Tất cả các API đều trả về định dạng `ApiResponse<T>` thống nhất:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2026-03-11T..."
}
```

---

## 🔐 1. Authentication Module (`/api/auth`)

| Method | Endpoint | Description | Auth Required | Roles |
|---|---|---|---|---|
| POST | `/login` | Đăng nhập hệ thống, trả về Access Token (JWT) và thiết lập Refresh Token (HttpOnly Cookie) | No | All |
| POST | `/refresh` | Làm mới Access Token bằng Refresh Token từ Cookie | No | All |
| POST | `/logout` | Đăng xuất, hủy Refresh Token trên Redis và xóa Cookie | Yes | All |
| GET | `/me` | Lấy thông tin tài khoản đang đăng nhập hiện tại | Yes | All |
| PUT | `/change-password` | Thay đổi mật khẩu tài khoản | Yes | All |

---

## 👥 2. Employee Module (`/api/employees`)

| Method | Endpoint | Description | Auth Required | Roles |
|---|---|---|---|---|
| POST | `/` | Tạo mới nhân viên và tài khoản người dùng tương ứng | Yes | HR_ADMIN, SYSTEM_ADMIN |
| GET | `/` | Lấy danh sách nhân viên (hỗ trợ phân trang & sắp xếp) | Yes | HR, MANAGER, ADMIN |
| GET | `/{id}` | Lấy chi tiết thông tin một nhân viên | Yes | HR, MANAGER, ADMIN |
| GET | `/me` | Lấy hồ sơ nhân sự của chính mình | Yes | All |
| PUT | `/{id}` | Cập nhật thông tin nhân viên hoặc thay đổi Role/Phòng ban | Yes | HR_ADMIN, SYSTEM_ADMIN |
| DELETE | `/{id}` | Xóa nhân viên (Soft delete + terminate status) | Yes | HR_ADMIN, SYSTEM_ADMIN |

---

## 🏢 3. Department Module (`/api/departments`)

| Method | Endpoint | Description | Auth Required | Roles |
|---|---|---|---|---|
| POST | `/` | Tạo mới phòng ban | Yes | HR_ADMIN, SYSTEM_ADMIN |
| GET | `/` | Lấy danh sách tất cả phòng ban | Yes | All |
| GET | `/{id}` | Lấy chi tiết một phòng ban | Yes | All |
| PUT | `/{id}` | Cập nhật tên hoặc người quản lý phòng ban | Yes | HR_ADMIN, SYSTEM_ADMIN |
| DELETE | `/{id}` | Xóa phòng ban | Yes | HR_ADMIN, SYSTEM_ADMIN |

---

## 📅 4. Leave Module (`/api/leaves`)

| Method | Endpoint | Description | Auth Required | Roles |
|---|---|---|---|---|
| POST | `/` | Gửi yêu cầu xin nghỉ phép | Yes | All |
| GET | `/` | Xem danh sách yêu cầu nghỉ phép | Yes | HR, MANAGER, ADMIN |
| GET | `/{id}` | Xem chi tiết yêu cầu nghỉ | Yes | All |
| PUT | `/{id}/approve` | Phê duyệt yêu cầu nghỉ phép | Yes | HR, MANAGER, ADMIN |
| PUT | `/{id}/reject` | Từ chối yêu cầu nghỉ phép | Yes | HR, MANAGER, ADMIN |
| DELETE | `/{id}` | Xóa/Hủy yêu cầu nghỉ (chưa duyệt) | Yes | Owner, ADMIN |

---

## ⏰ 5. OT Request Module (`/api/ot-requests`)

| Method | Endpoint | Description | Auth Required | Roles |
|---|---|---|---|---|
| POST | `/` | Gửi yêu cầu đăng ký tăng ca | Yes | All |
| GET | `/` | Danh sách yêu cầu tăng ca | Yes | HR, MANAGER, ADMIN |
| GET | `/{id}` | Chi tiết yêu cầu tăng ca | Yes | All |
| PUT | `/{id}/approve` | Phê duyệt tăng ca | Yes | HR, MANAGER, ADMIN |
| PUT | `/{id}/reject` | Từ chối tăng ca | Yes | HR, MANAGER, ADMIN |
| DELETE | `/{id}` | Hủy yêu cầu tăng ca | Yes | Owner, ADMIN |

---

## 📍 6. Attendance Module (`/api/attendances`)

| Method | Endpoint | Description | Auth Required | Roles |
|---|---|---|---|---|
| POST | `/` | Ghi nhận chấm công (Check-in/Check-out) | Yes | All |
| GET | `/` | Danh sách bản ghi chấm công | Yes | HR, MANAGER, ADMIN |
| GET | `/{id}` | Chi tiết một bản ghi chấm công | Yes | All |
| PUT | `/{id}` | Cập nhật bản ghi chấm công (điều chỉnh thủ công) | Yes | HR_ADMIN, SYSTEM_ADMIN |
| DELETE | `/{id}` | Xóa bản ghi chấm công | Yes | HR_ADMIN, SYSTEM_ADMIN |

---

## 📜 7. Contract Module (`/api/contracts`)

| Method | Endpoint | Description | Auth Required | Roles |
|---|---|---|---|---|
| POST | `/` | Ký hợp đồng mới cho nhân viên | Yes | HR_ADMIN, SYSTEM_ADMIN |
| GET | `/` | Danh sách hợp đồng lao động | Yes | HR, MANAGER, ADMIN |
| GET | `/{id}` | Chi tiết hợp đồng | Yes | HR, MANAGER, ADMIN |
| PUT | `/{id}` | Cập nhật/Gia hạn hợp đồng | Yes | HR_ADMIN, SYSTEM_ADMIN |
| DELETE | `/{id}` | Xóa hợp đồng | Yes | HR_ADMIN, SYSTEM_ADMIN |

---

## 🛠 8. Common Components (DTOs)

### PageResponse<T>
Sử dụng chung cho các API có phân trang (GET list):
```json
{
  "content": [ ... ],
  "pageNumber": 0,
  "pageSize": 20,
  "totalElements": 100,
  "totalPages": 5,
  "last": false
}
```

### Error Handling
Sử dụng mã HTTP tương ứng:
- `400 Bad Request`: Lỗi validation dữ liệu đầu vào.
- `401 Unauthorized`: Token hết hạn hoặc không hợp lệ.
- `403 Forbidden`: Người dùng không có quyền truy cập endpoint (RBAC).
- `404 Not Found`: Không tìm thấy dữ liệu.
- `500 Server Error`: Lỗi hệ thống bất ngờ.
