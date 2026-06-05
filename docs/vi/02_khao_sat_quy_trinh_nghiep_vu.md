# FaceZ HRMS — Khảo Sát Quy Trình Nghiệp Vụ & Tài Liệu Thiết Kế
### Ánh Xạ Quy Trình Thực Tế và Đặc Tả Thiết Kế
**Phiên bản:** 1.0 | **Ngày:** 10-04-2026 | **Người phân tích:** Claude Code

---

## 1. Phạm Vi và Phương Pháp

Tài liệu này khảo sát từng quy trình nghiệp vụ hiện được triển khai trong FaceZ, mô tả bằng ngôn ngữ nghiệp vụ, và cung cấp đặc tả thiết kế bao gồm đầu vào, đầu ra, quy tắc nghiệp vụ và luồng dữ liệu. Khảo sát được thực hiện từ việc kiểm tra trực tiếp mã nguồn (controllers, services, entities và frontend pages).

---

## 2. Danh Sách Quy Trình

| # | Lĩnh vực         | Tên quy trình                      | Vai trò sở hữu | Tự động? |
|---|------------------|------------------------------------|----------------|:--------:|
| 1 | Nhân sự          | Đăng ký nhân viên mới              | HR_ADMIN       | Một phần |
| 2 | Nhân sự          | Cập nhật hồ sơ nhân viên           | HR_ADMIN       | Không    |
| 3 | Nhân sự          | Thôi việc nhân viên                | HR_ADMIN       | Không    |
| 4 | Nhân sự          | Đổi mật khẩu                       | EMPLOYEE       | Có       |
| 5 | Tổ chức          | Quản lý phòng ban                  | HR_ADMIN       | Không    |
| 6 | Chấm công        | Check-in/Check-out sinh trắc học   | Thiết bị       | Có       |
| 7 | Chấm công        | Chỉnh sửa bản ghi chấm công        | HR_ADMIN       | Không    |
| 8 | Nghỉ phép        | Nộp đơn xin nghỉ phép              | EMPLOYEE       | Không    |
| 9 | Nghỉ phép        | Quy trình phê duyệt nghỉ phép      | Nhiều vai trò  | Không    |
| 10 | Tăng ca         | Nộp đơn đăng ký tăng ca            | EMPLOYEE       | Không    |
| 11 | Tăng ca         | Quy trình phê duyệt tăng ca        | Nhiều vai trò  | Không    |
| 12 | Hợp đồng        | Tạo/Cập nhật hợp đồng              | HR_ADMIN       | Không    |
| 13 | Lương            | Tính lương cá nhân                 | HR_ADMIN       | Một phần |
| 14 | Lương            | Tính lương hàng loạt               | HR_ADMIN       | Có       |
| 15 | Lương            | Phê duyệt & xác nhận chi lương     | HR_ADMIN       | Không    |
| 16 | Cấu hình         | Cập nhật bảng lương/cấu hình thuế  | SYS_ADMIN      | Không    |

---

## 3. Mô Tả Chi Tiết Các Quy Trình

---

### Quy Trình 1: Đăng Ký Nhân Viên Mới

**Kích hoạt:** Có nhân viên mới gia nhập công ty.

**Người thực hiện:** HR_ADMIN

**Điều kiện tiên quyết:**
- Phòng ban của nhân viên phải tồn tại trong hệ thống (hoặc có thể gán phòng ban sau).
- `employeeId` và `username` mong muốn chưa tồn tại.

**Các bước thực hiện:**
1. HR vào module Nhân viên và nhấn "Thêm nhân viên".
2. HR nhập thông tin hồ sơ: tên, vai trò, email, điện thoại, địa chỉ, ngày vào làm, liên hệ khẩn cấp, phòng ban.
3. HR thiết lập thông tin đăng nhập: tên người dùng và mật khẩu ban đầu.
4. HR gửi biểu mẫu.
5. Hệ thống kiểm tra: tính duy nhất của `employeeId` và `username`, tính hợp lệ của vai trò, sự tồn tại của phòng ban.
6. Hệ thống tạo bản ghi `EmployeeInfo` và `UserAccount` nguyên tử.
7. Hệ thống mã hóa mật khẩu bằng bcrypt; văn bản thuần không được lưu.
8. Nhân viên được đặt trạng thái `ACTIVE`.

**Quy tắc nghiệp vụ:**
- QT-001: Mã nhân viên phải duy nhất trong toàn hệ thống (bao gồm cả bản ghi đã xóa mềm).
- QT-002: Tên người dùng phải duy nhất. Phân biệt chữ hoa/thường theo đối chiếu cơ sở dữ liệu.
- QT-003: Phải gán vai trò hợp lệ từ enum (`EMPLOYEE`, `LEADER`, `MANAGER`, `HR_ADMIN`, `SYSTEM_ADMIN`).
- QT-004: Phòng ban là tùy chọn khi tạo; có thể gán sau.
- QT-005: Mật khẩu phải có ít nhất 6 ký tự.

**Đầu ra:**
- Bản ghi `EmployeeInfo` trong bảng `employee_info`.
- Bản ghi `UserAccount` trong bảng `user_account`.
- Nhân viên có thể đăng nhập ngay với thông tin đăng nhập được cung cấp.

**Thiếu sót / Ghi chú:** Không có quy trình tiếp nhận, email chào mừng hay giao thông tin đăng nhập tự động cho nhân viên. HR phải thông báo thông tin đăng nhập qua kênh ngoài hệ thống.

---

### Quy Trình 2: Cập Nhật Hồ Sơ Nhân Viên

**Kích hoạt:** Thông tin cá nhân, phòng ban, vai trò hoặc trạng thái của nhân viên thay đổi.

**Người thực hiện:** HR_ADMIN

**Điều kiện tiên quyết:** Bản ghi nhân viên tồn tại và chưa bị xóa mềm.

**Các bước thực hiện:**
1. HR vào danh sách nhân viên, chọn một nhân viên và nhấn "Chỉnh sửa".
2. HR sửa đổi bất kỳ trường nào (tất cả trường đều tùy chọn trong payload cập nhật — null nghĩa là "không thay đổi").
3. HR gửi biểu mẫu.
4. Hệ thống áp dụng cập nhật một phần vào `EmployeeInfo` và/hoặc `UserAccount`.

**Quy tắc nghiệp vụ:**
- QT-006: Thay đổi vai trò trong `EmployeeInfo` không tự động đồng bộ sang `UserAccount.role`. Cả hai phải được cập nhật nhất quán. *(Thiếu sót thiết kế — xem Mục 5, Tài liệu 03.)*
- QT-007: Ảnh đại diện được lưu dưới dạng byte thô (BLOB) trong cơ sở dữ liệu. Kích thước tối đa thực tế bị giới hạn bởi JVM heap và giới hạn kích thước hàng của PostgreSQL.
- QT-008: Chuyển phòng ban của nhân viên không tự động chuyển các đơn đang chờ sang quản lý phòng ban mới.

**Đầu ra:** Bản ghi `EmployeeInfo` / `UserAccount` được cập nhật.

---

### Quy Trình 3: Thôi Việc Nhân Viên

**Kích hoạt:** Nhân viên rời công ty (từ chức, chấm dứt hợp đồng hoặc hết hạn hợp đồng).

**Người thực hiện:** HR_ADMIN

**Điều kiện tiên quyết:** Bản ghi nhân viên đang hoạt động.

**Các bước thực hiện:**
1. HR gọi `DELETE /api/employees/{id}`.
2. Hệ thống đặt `deleteFlag = true`, `status = TERMINATED`, và ghi `deletedAt`.
3. `UserAccount` của nhân viên cũng bị xóa mềm (không thể đăng nhập vì Spring Security `UserDetailsService` lọc theo `deleteFlag = false`).

**Quy tắc nghiệp vụ:**
- QT-009: Tất cả bản ghi lịch sử (chấm công, lương, nghỉ phép, tăng ca, hợp đồng) được bảo toàn. Xóa mềm không lan sang bản ghi con.
- QT-010: Dữ liệu lương và chấm công của nhân viên đã nghỉ vẫn có thể truy vấn bởi HR cho mục đích báo cáo theo quy định.
- QT-011: Không có thời gian ân hạn hay xác nhận nhiều bước trước khi thôi việc. Một lần gọi API hoàn tất hành động.

**Thiếu sót / Ghi chú:** Không có danh sách kiểm tra thôi việc, quy trình bàn giao tài sản hay kích hoạt tính lương thanh toán cuối.

---

### Quy Trình 4: Đổi Mật Khẩu

**Kích hoạt:** Nhân viên muốn đổi mật khẩu của mình.

**Người thực hiện:** Bất kỳ người dùng đã xác thực

**Các bước thực hiện:**
1. Nhân viên vào trang hồ sơ và yêu cầu đổi mật khẩu.
2. Nhân viên cung cấp mật khẩu cũ và mật khẩu mới.
3. Hệ thống kiểm tra: mật khẩu cũ khớp với hash hiện tại; mật khẩu mới đáp ứng độ dài tối thiểu.
4. Hệ thống mã hóa mật khẩu mới bằng bcrypt, lưu lại, và ghi hash trước đó vào `lastPasswordHash`.

**Quy tắc nghiệp vụ:**
- QT-012: Hệ thống chỉ lưu một hash mật khẩu trước đó. Không có quy tắc "không được dùng lại N mật khẩu cuối" ngoài một lớp lịch sử.

---

### Quy Trình 5: Quản Lý Phòng Ban

**Kích hoạt:** Thay đổi cơ cấu tổ chức (phòng ban mới, đổi tên, bổ nhiệm lại trưởng phòng, xóa phòng ban).

**Người thực hiện:** HR_ADMIN

**Các bước thực hiện:**
1. HR tạo phòng ban với tên và tùy chọn gán trưởng phòng (`employeeId` trỏ đến bản ghi `EmployeeInfo`).
2. HR có thể cập nhật tên phòng ban hoặc gán trưởng phòng bất kỳ lúc nào.
3. Phòng ban có thể bị xóa mềm. Nhân viên trong phòng ban đã xóa vẫn giữ FK `departmentId` (không cập nhật cascade).

**Quy tắc nghiệp vụ:**
- QT-013: Mỗi phòng ban có tối đa một trưởng phòng được chỉ định (lưu dưới dạng FK trực tiếp trong `Department`).
- QT-014: Không có phân cấp phòng ban (không có quan hệ cha-con). Tất cả phòng ban là phẳng.
- QT-015: Endpoint danh sách phòng ban **có thể truy cập công khai** (không yêu cầu xác thực). Có thể là cố ý cho việc hiển thị sơ đồ tổ chức nhưng cần được xem xét lại.

---

### Quy Trình 6: Check-in/Check-out Sinh Trắc Học

**Kích hoạt:** Nhân viên trình thẻ hoặc thông tin sinh trắc học tại thiết bị kiểm soát ra vào.

**Người thực hiện:** Thiết bị kiểm soát ra vào (tự động)

**Điều kiện tiên quyết:**
- Thiết bị đã được đăng ký trong bảng `device` với `logType` đúng (IN hoặc OUT).
- Nhân viên đã được đăng ký với `employeeId` tương ứng.

**Các bước thực hiện:**
1. Thiết bị gửi `POST /api/checkin-logs` với `{employeeId, deviceId, logTime, logType}`.
2. Hệ thống xác thực thiết bị và nhân viên tồn tại.
3. Hệ thống lưu bản ghi `CheckinLog`.
4. *(Tương lai — chưa tự động)* Hệ thống tạo hoặc cập nhật bản ghi `Attendance` cho ngày hôm đó bằng cách tổng hợp nhật ký IN/OUT.

**Quy tắc nghiệp vụ:**
- QT-016: `logType` là theo thiết bị — một thiết bị được cấu hình là thiết bị IN hoặc OUT, không phải cả hai.
- QT-017: Endpoint nhật ký check-in **không yêu cầu xác thực**. Kiểm soát truy cập ở cấp mạng là ranh giới bảo mật được giả định.
- QT-018: Nhiều nhật ký IN hoặc OUT trong một ngày không được loại trùng lặp tại thời điểm nhập nhật ký. Loại trùng lặp xảy ra trong quá trình xây dựng bản ghi `Attendance`.
- QT-019: Đến trễ được tính so với giờ bắt đầu **08:30** cố định trong code. Không thể cấu hình bởi người dùng.
- QT-020: Endpoint tải lên hàng loạt (`POST /api/checkin-logs/batch`) hỗ trợ thành công một phần — lỗi riêng lẻ không hoàn tác các bản ghi đã thành công.

**Thiếu sót hiện tại:** Kết nối giữa lưu trữ `CheckinLog` và tạo bản ghi `Attendance` **chưa được tự động hóa**. HR phải kích hoạt tính toán chấm công riêng. Điều này có nghĩa dữ liệu nhật ký thô và dữ liệu chấm công đã xử lý có thể không đồng bộ.

---

### Quy Trình 7: Chỉnh Sửa Bản Ghi Chấm Công

**Kích hoạt:** Bản ghi chấm công có lỗi (giờ check-in/out sai, lỗi thiết bị, v.v.).

**Người thực hiện:** HR_ADMIN, SYSTEM_ADMIN

**Các bước thực hiện:**
1. HR xác định bản ghi `Attendance` sai theo ID.
2. HR gọi `PUT /api/attendances/{id}` với thời gian `checkIn` và/hoặc `checkOut` được sửa.
3. Hệ thống tính lại tất cả trường dẫn xuất: `lateHour`, `workingHour`, `paidHour`, `paidDay`, `workingDay`, `violate`.
4. Bản ghi được cập nhật được lưu.

**Quy tắc nghiệp vụ:**
- QT-021: Chỉnh sửa không tạo nhật ký kiểm toán về ai đã thay đổi gì. Giá trị gốc bị ghi đè.
- QT-022: Chỉnh sửa thủ công `Attendance` không cập nhật hồi tố các bản ghi `Payroll` đã được tính. Lương phải được tính lại thủ công.

---

### Quy Trình 8: Nộp Đơn Xin Nghỉ Phép

**Kích hoạt:** Nhân viên cần nghỉ phép.

**Người thực hiện:** Bất kỳ nhân viên đã xác thực (bao gồm LEADER, MANAGER, HR_ADMIN)

**Các bước thực hiện:**
1. Nhân viên vào "Nghỉ phép của tôi" và tạo đơn mới.
2. Nhân viên cung cấp: lý do, thời gian bắt đầu, thời gian kết thúc.
3. Hệ thống kiểm tra `endTime > startTime`.
4. Hệ thống lưu đơn với trạng thái `TO_APPROVE`.
5. Đơn hiển thị ngay cho LEADER của nhân viên để xử lý.

**Quy tắc nghiệp vụ:**
- QT-023: Không có hạn mức hoặc loại nghỉ phép (thường niên, ốm đau, hiếu hỷ). Đơn nghỉ được theo dõi nhưng định mức không được áp dụng.
- QT-024: Thời gian nghỉ được lưu dưới dạng khoảng datetime thô, không tính theo ngày. Không thực hiện tính toán ngày làm việc.
- QT-025: Không có kiểm tra đơn nghỉ phép trùng lặp cho cùng một nhân viên.
- QT-026: Nhân viên chỉ có thể xóa đơn của mình khi trạng thái là `DRAFT` hoặc `TO_APPROVE`.

---

### Quy Trình 9: Quy Trình Phê Duyệt Nghỉ Phép

**Kích hoạt:** Đơn nghỉ phép đã được nộp và cần xem xét của quản lý.

**Người thực hiện:** LEADER → MANAGER → HR_ADMIN (tuần tự, nhiều cấp)

**Máy trạng thái:**

```
TO_APPROVE
    │
    ├──[LEADER duyệt]──▶ LEADER_APPROVED
    │       │
    │       ├──[MANAGER duyệt]──▶ MANAGER_APPROVED
    │       │          │
    │       │          ├──[HR_ADMIN duyệt]──▶ APPROVED ✓
    │       │          └──[HR_ADMIN từ chối]─▶ REJECTED ✗
    │       └──[MANAGER từ chối]──────────────▶ REJECTED ✗
    └──[LEADER từ chối]────────────────────────▶ REJECTED ✗
```

**Quy tắc nghiệp vụ:**
- QT-027: Mỗi cấp phê duyệt chỉ có thể hành động khi đơn đang ở trạng thái tiền đề đúng. MANAGER không thể duyệt đơn chưa được LEADER_APPROVED.
- QT-028: Từ chối ở bất kỳ cấp nào là quyết định cuối. Không thể mở lại hoặc nộp lại đơn.
- QT-029: Hệ thống không thông báo cho người phê duyệt về các đơn đang chờ (không có email, push notification hay huy hiệu đếm trên dashboard).
- QT-030: HR_ADMIN có thể duyệt ở bất kỳ cấp nào, thực tế là bỏ qua quy trình nếu cần (vì vai trò ≥ LEADER và ≥ MANAGER trong phân cấp vai trò).

**Thiếu sót:** Không có cơ chế thông báo. Người phê duyệt phải chủ động kiểm tra màn hình "Quản lý Đơn" để phát hiện các mục đang chờ.

---

### Quy Trình 10 & 11: Nộp Đơn và Phê Duyệt Tăng Ca

Quy trình đăng ký tăng ca về mặt kiến trúc giống hệt quy trình Nghỉ phép (Quy trình 8 & 9). Cùng máy trạng thái, cùng vai trò phê duyệt, cùng quy tắc. Sự khác biệt chính là mục đích nghiệp vụ:

- **Đơn Nghỉ phép**: Nhân viên **vắng mặt** khỏi công việc. Không ảnh hưởng đến tiền lương.
- **Đơn Tăng ca**: Nhân viên làm việc **ngoài giờ thông thường**. Đơn tăng ca được duyệt được bộ máy tính lương sử dụng để tính tiền OT với hệ số nhân.

**Tính toán Tiền Tăng Ca:**
Đơn OT được duyệt trong kỳ lương được `PayrollCalculationEngine` tải. Giờ trong mỗi đơn được phân loại theo loại:
- OT ngày thường: hệ số ×1,5
- OT cuối tuần: hệ số ×2,0
- Ca đêm (22:00–06:00): hệ số ×1,3

Mức lương giờ cơ bản được tính từ `Contract.baseSalary`.

---

### Quy Trình 12: Quản Lý Hợp Đồng

**Kích hoạt:** Nhân viên mới được tiếp nhận, hoặc điều khoản hợp đồng thay đổi (gia hạn, thăng chức, điều chỉnh lương).

**Người thực hiện:** HR_ADMIN, MANAGER (chỉ xem)

**Các bước thực hiện:**
1. HR tạo bản ghi hợp đồng liên kết với nhân viên.
2. HR nhập: loại hợp đồng, ngày bắt đầu/kết thúc, mã vị trí, bước lương, lương cơ sở (`Lhq`), mức đóng bảo hiểm (`LCB`), số người phụ thuộc, điều khoản, và tùy chọn tải lên văn bản hợp đồng (file đính kèm nhị phân).
3. Các lần sửa đổi tiếp theo ghi đè hợp đồng hiện có (không có lịch sử nhiều hợp đồng cho mỗi nhân viên).

**Quy tắc nghiệp vụ:**
- QT-031: Mỗi nhân viên có tối đa một hợp đồng trong hệ thống (quan hệ 1:1 trong `ContractRepository.findContractByEmployeeInfo_EmployeeId`). Hợp đồng lịch sử không được lưu lại.
- QT-032: `positionCode` và `salaryStep` là khóa tra cứu hệ số `Li` trong cấu hình bảng lương tại thời điểm tính lương. Chúng phải khớp với mục hợp lệ trong cấu hình `SALARY_GRADE` đang hoạt động.
- QT-033: `insuranceBase` (`LCB`) bị giới hạn tối đa 46.800.000 VNĐ bởi bộ máy tính lương bất kể giá trị nhập trong hợp đồng. Mức trần được tải từ `SystemConfig` `INSURANCE` đang hoạt động.
- QT-034: Ngày hợp đồng được lưu dưới dạng `String`, không phải `LocalDate`. Không có xác thực ngày hay quy trình cảnh báo hết hạn.
- QT-035: Trường `attachment` nhị phân được lưu dưới dạng BLOB trong PostgreSQL. Không có giới hạn kích thước ở tầng ứng dụng.

---

### Quy Trình 13: Tính Lương Cá Nhân

**Kích hoạt:** HR chuẩn bị bảng lương tháng cho một nhân viên.

**Người thực hiện:** HR_ADMIN, SYSTEM_ADMIN

**Điều kiện tiên quyết:**
- Nhân viên có hợp đồng hiệu lực với `positionCode`, `salaryStep` và `baseSalary` hợp lệ.
- Các bản ghi `SystemConfig` đang hoạt động tồn tại cho `SALARY_GRADE`, `ALLOWANCE`, `PIT` và `INSURANCE`.
- Bản ghi chấm công tồn tại cho kỳ lương.

**Tham số đầu vào (HR cung cấp tại thời điểm tính lương):**

| Tham số              | Bắt buộc | Ghi chú                                                    |
|----------------------|:--------:|------------------------------------------------------------|
| `employeeId`         | Có       |                                                            |
| `payrollYear`        | Có       |                                                            |
| `payrollMonth`       | Có       |                                                            |
| `kpi1Rating`         | Không    | A/B/C; mặc định tự tính từ chấm công                      |
| `kpi2Rating`         | Không    | A/B/C; mặc định tự tính từ chấm công                      |
| `japaneseLevel`      | Không    | N1/N2; nếu không có, phụ cấp tiếng Nhật = 0               |
| `odcAllowance`       | Không    | Phụ cấp dự án một lần tính bằng VNĐ; mặc định 0           |
| `bonus`              | Không    | Thưởng một lần tính bằng VNĐ; mặc định 0                  |
| `standardWorkingDays`| Không    | Mặc định 26; có thể đặt thấp hơn cho tháng làm bán phần   |
| `notes`              | Không    | Ghi chú tự do                                              |

**Các bước tính toán (theo thứ tự):**
1. Đếm `NCtt`: ngày có `paidDay > 0` trong bản ghi chấm công của kỳ.
2. Lấy `Li`: hệ số vị trí từ cấu hình bảng lương (`positionCode`, `salaryStep`).
3. Tính điểm KPI1: ánh xạ chuỗi đánh giá → hệ số nhân (A=1,04, B=1,00, C=0,98). Nếu không có: tự tính từ cờ vi phạm trong chấm công.
4. Tính điểm KPI2: ánh xạ chuỗi đánh giá → hệ số nhân (A=1,04, B=1,02, C=1,00). Nếu không có: tự tính (vi phạm → C, có nghỉ phép → B, còn lại A).
5. Tính `KPItb` = (KPI1 + KPI2) / 2.
6. Tính `HT2` (phụ cấp sinh hoạt, tính theo tỷ lệ NCtt/Nt).
7. Tính `HT1` (phụ cấp tiếng Nhật, không tính theo tỷ lệ).
8. Tính `Lương gộp cơ bản`.
9. Tính `Tiền OT` từ các đơn OT đã duyệt (phân loại theo ngày thường/cuối tuần/đêm).
10. Tính `Tổng lương gộp` = `Lương gộp cơ bản` + `Tiền OT` + `Thưởng`.
11. Tính mức đóng bảo hiểm và khấu trừ (BHXH, BHYT, BHTN).
12. Tính `Thu nhập chịu thuế` = `Tổng lương gộp` − tất cả khấu trừ BH − giảm trừ bản thân − (giảm trừ NPT × số phụ thuộc).
13. Áp dụng bậc thuế lũy tiến để tính `Thuế TNCN`.
14. Tính `Lương thực nhận`.
15. Lưu với trạng thái `DRAFT`.

**Quy tắc nghiệp vụ:**
- QT-036: Chỉ được có một bản ghi lương mỗi nhân viên mỗi kỳ (áp dụng bởi ràng buộc duy nhất và kiểm tra tầng service).
- QT-037: Bản ghi lương ở trạng thái `DRAFT` có thể xóa và tính lại. Khi đã `APPROVED`, không thể sửa hoặc xóa.
- QT-038: Tiền OT chỉ được tính cho các đơn có trạng thái `APPROVED`. Đơn đang chờ hoặc bị từ chối được bỏ qua.
- QT-039: Tất cả giá trị tiền tệ được lưu và tính toán dưới dạng `long` (Đồng Việt Nam, không có phần thập phân).

---

### Quy Trình 14: Tính Lương Hàng Loạt

**Kích hoạt:** HR muốn tính lương cho tất cả nhân viên đang hoạt động trong một thao tác.

**Người thực hiện:** HR_ADMIN, SYSTEM_ADMIN

**Các bước thực hiện:**
1. HR gửi `POST /api/payrolls/batch-calculate` với `{year, month, standardWorkingDays}`.
2. Hệ thống trả về ngay với `jobId` (HTTP 202 Accepted).
3. Backend bất đồng bộ:
   a. Tải tất cả nhân viên `ACTIVE` (1 truy vấn).
   b. Tải hàng loạt hợp đồng, chấm công và đơn OT đã duyệt (3 truy vấn).
   c. Nhóm dữ liệu trong bộ nhớ theo nhân viên.
   d. Bỏ qua nhân viên đã có bảng lương cho kỳ này.
   e. Với mỗi nhân viên không có hợp đồng, đánh dấu là `failed` và ghi lý do.
   f. Gọi `PayrollCalculationEngine` cho từng nhân viên (không truy cập DB trong vòng lặp).
   g. Lưu tất cả kết quả trong một lần gọi `saveAll()`.
4. HR theo dõi tiến độ qua `GET /api/payrolls/jobs/{jobId}`.
5. Khi hoàn thành, các bản ghi lương riêng lẻ hiển thị với trạng thái `DRAFT`.

**Quy tắc nghiệp vụ:**
- QT-040: Tính lương hàng loạt không hỗ trợ đánh giá KPI tùy chỉnh hay cấp độ tiếng Nhật — sử dụng điểm KPI tự tính cho tất cả nhân viên và gán phụ cấp tiếng Nhật bằng 0.
- QT-041: Bản ghi công việc được lưu **chỉ trong bộ nhớ** (`PayrollJobStore`). Nếu ứng dụng khởi động lại trong quá trình xử lý hàng loạt, bản ghi công việc và bộ đếm tiến độ bị mất, mặc dù các bản ghi `DRAFT` đã được lưu vẫn còn trong cơ sở dữ liệu.
- QT-042: Số ngày làm việc chuẩn (`Nt`) là tham số duy nhất ở cấp batch. Áp dụng đồng nhất cho tất cả nhân viên trong lần chạy đó.

---

### Quy Trình 15: Phê Duyệt Lương & Xác Nhận Đã Chi

**Kích hoạt:** HR đã xem xét bảng lương đã tính và sẵn sàng phê duyệt để chi trả.

**Người thực hiện:** HR_ADMIN, SYSTEM_ADMIN

**Máy trạng thái:**
```
DRAFT ──[HR duyệt]──▶ APPROVED ──[HR xác nhận đã trả]──▶ PAID
  │
  └──[HR xóa]──▶ (đã xóa, xóa mềm)
```

**Quy tắc nghiệp vụ:**
- QT-043: Chỉ bảng lương ở trạng thái `DRAFT` mới có thể xóa. Điều này cho phép tính lại.
- QT-044: Bảng lương đã `APPROVED` bị khóa — không thể sửa hoặc xóa.
- QT-045: `PAID` là trạng thái cuối cùng. Không có cơ chế đảo ngược.
- QT-046: Không có tích hợp với hệ thống ngân hàng hoặc ERP. "Xác nhận đã trả" chỉ là cập nhật cờ thủ công.
- QT-047: Nhân viên có thể xem bảng lương của mình (tất cả trạng thái) qua `GET /api/payrolls/my`.

---

### Quy Trình 16: Quản Lý Cấu Hình Hệ Thống

**Kích hoạt:** Thay đổi quy định (khung thuế mới, mức trần bảo hiểm cập nhật, sửa đổi bảng lương) yêu cầu cập nhật quy tắc tính lương.

**Người thực hiện:** SYSTEM_ADMIN

**Các bước thực hiện:**
1. SYSTEM_ADMIN tạo `SystemConfig` mới với quy tắc cập nhật định dạng JSON, chỉ định:
   - `configType` (SALARY_GRADE / ALLOWANCE / PIT / INSURANCE)
   - Định danh `version` (ví dụ: "2026")
   - `effectiveDate`
   - `legalBasis` (trích dẫn văn bản pháp lý)
   - `configData` (payload JSON với quy tắc thực tế)
2. Cấu hình mới bắt đầu ở trạng thái `inactive`.
3. Khi sẵn sàng kích hoạt, SYSTEM_ADMIN gọi `PATCH /{id}/activate`.
4. Hệ thống hủy kích hoạt bất kỳ cấu hình nào cùng loại đang hoạt động và tải cấu hình mới vào bộ nhớ đệm `PayrollConfigService`.

**Quy tắc nghiệp vụ:**
- QT-048: Lịch sử cấu hình được bảo toàn — các phiên bản cũ bị hủy kích hoạt nhưng không bị xóa.
- QT-049: Kích hoạt là tức thì. Bất kỳ bảng lương nào được tính sau khi kích hoạt đều sử dụng quy tắc mới. Các bản ghi `DRAFT` đã tính không được cập nhật hồi tố.
- QT-050: `configData` JSON phải tuân thủ schema mong đợi. Không có xác thực cấu trúc JSON ở tầng service — dữ liệu cấu hình không hợp lệ sẽ gây `NullPointerException` tại thời điểm tính lương.
- QT-051: Chỉ `SYSTEM_ADMIN` mới có thể quản lý cấu hình hệ thống. `HR_ADMIN` không có quyền truy cập module này.

---

## 4. Phụ Thuộc Dữ Liệu Giữa Các Quy Trình

Sơ đồ sau cho thấy dữ liệu lưu chuyển qua các quy trình để tạo ra bảng lương cuối cùng:

```
Quy trình 1 (Đăng ký nhân viên)
    └──▶ EmployeeInfo + UserAccount

Quy trình 5 (Quản lý phòng ban)
    └──▶ Department (được EmployeeInfo tham chiếu)

Quy trình 12 (Quản lý hợp đồng)
    └──▶ Contract
          ├── positionCode + salaryStep ──▶ Tra cứu bảng lương
          ├── baseSalary (Lhq)           ──▶ Công thức tính lương gộp
          ├── insuranceBase (LCB)        ──▶ Khấu trừ bảo hiểm
          └── dependentCount             ──▶ Tính giảm trừ thuế TNCN

Quy trình 6 (Check-in/Check-out)
    └──▶ CheckinLog
         └──[HR kích hoạt tính toán]──▶ Attendance
               ├── Đếm NCtt            ──▶ Hệ số chấm công trong lương
               ├── Cờ vi_phạm          ──▶ Tự tính điểm KPI
               └── Giá trị paidDay     ──▶ NCtt trong lương

Quy trình 8–11 (Luồng Nghỉ phép & Tăng ca)
    └──▶ Đơn OT đã duyệt
               └── Giờ × hệ số OT     ──▶ Tiền OT trong lương

Quy trình 16 (Cấu hình hệ thống)
    └──▶ Bản ghi SystemConfig đang hoạt động
               ├── SALARY_GRADE        ──▶ Hệ số Li
               ├── ALLOWANCE           ──▶ Phụ cấp HT1/HT2
               ├── PIT                 ──▶ Bậc thuế + giảm trừ
               └── INSURANCE           ──▶ Tỷ lệ BHXH/BHYT/BHTN + mức trần

Tất cả trên ──▶ Quy trình 13/14 (Tính lương)
                    └──▶ Quy trình 15 (Phê duyệt + Chi trả)
                              └──▶ Nhân viên xem bảng lương
```

---

## 5. Ánh Xạ Trang Frontend đến Quy Trình

| Trang Frontend                    | Quy trình Backend         | Vai trò           |
|-----------------------------------|---------------------------|-------------------|
| `/employees/dashboard`            | Xem phân tích tóm tắt     | Tất cả            |
| `/employees/attendance`           | QT 6 (xem của mình)       | Tất cả            |
| `/employees/leave`                | QT 8 (nộp/xem)            | Tất cả            |
| `/employees/ot`                   | QT 10 (nộp/xem)           | Tất cả            |
| `/employees/payroll`              | QT 15 (xem bảng lương)    | Tất cả            |
| `/employees/me`                   | QT 2 (xem hồ sơ)          | Tất cả            |
| `/managers/department`            | QT 5 (xem)                | LEADER, MANAGER   |
| `/managers/request`               | QT 9, 11 (phê duyệt)      | LEADER, MANAGER   |
| `/hr/employee`                    | QT 1, 2, 3                | HR_ADMIN          |
| `/hr/department/[id]`             | QT 5                      | HR_ADMIN          |
| `/hr/contract`                    | QT 12                     | HR_ADMIN          |
| `/hr/payroll`                     | QT 13, 14, 15             | HR_ADMIN          |
| `/system/config`                  | QT 16                     | SYSTEM_ADMIN      |

---

*Kết thúc Tài liệu 2*
