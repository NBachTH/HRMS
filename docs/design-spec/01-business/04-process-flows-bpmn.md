# Sơ đồ Luồng Quy trình (BPMN) — FaceZ HRMS

**Phiên bản:** 1.0 | **Ngày:** 16-06-2026
**Liên quan:** [Use Cases](02-use-cases.md) · [Business Rules](03-business-rules.md) · [Sequence Diagrams](../02-technical/08-sequence-diagrams.md)

Góc nhìn quy trình nghiệp vụ của bốn luồng giá trị cao nhất. Sơ đồ dùng Mermaid (`flowchart`) như một
biến thể BPMN nhẹ; làn (swimlane) thể hiện bằng `subgraph`. Chi tiết kỹ thuật cấp message nằm ở
[Sequence Diagrams](../02-technical/08-sequence-diagrams.md).

---

## 1. Luồng tính lương tháng

```mermaid
flowchart TD
    subgraph HR[HR Admin]
      A1([Bắt đầu: hết tháng]) --> A2[Đối soát bảng công / giải quyết xung đột]
      A2 --> A3{Vắng không<br/>lý do?}
      A3 -- có --> A4[Xử lý hoặc forceClose thành nghỉ không lương]
      A3 -- không --> A5[Chốt kỳ chấm công]
      A4 --> A5
    end
    subgraph FIN[Finance Admin]
      A5 --> B1[Kích hoạt batch-calculate]
      B1 --> B2[(Job async: dựng payroll DRAFT<br/>mỗi nhân viên dùng config hiệu lực)]
      B2 --> B3[Poll job đến COMPLETED]
      B3 --> B4{Số liệu OK?}
      B4 -- không --> B5[Chỉnh đầu vào / config, tính lại] --> B2
      B4 -- có --> B6[Gửi duyệt → PENDING_APPROVAL]
    end
    subgraph DIR[Director]
      B6 --> C1{Duyệt?}
      C1 -- từ chối --> C2[REJECTED + lý do] --> B5
      C1 -- duyệt --> C3[APPROVED]
    end
    subgraph FIN2[Finance Admin]
      C3 --> D1[Chuyển khoản ngân hàng - bên ngoài]
      D1 --> D2[Đánh dấu đã trả → PAID]
      D2 --> D3[Sinh báo cáo chi phí / bảo hiểm / thuế TNCN]
    end
    C3 -. PayrollApprovedEvent .-> E1[(Thông báo nhân viên)]
    D3 --> Z([Kết thúc])
```

**Tiền điều kiện:** đã chốt kỳ chấm công (BR-AT-09); có hợp đồng hiện hành + config hiệu lực (BR-CFG-04).
**Kiểm soát:** tách bạch trách nhiệm — Finance tính, Director phê duyệt (BR-RBAC-04).
**Tự kích hoạt:** `PayrollScheduler` khởi động batch vào ngày 1 mỗi tháng.

---

## 2. Duyệt nghỉ phép đa cấp

```mermaid
flowchart LR
    subgraph EMP[Nhân viên]
      S1([Cần nghỉ]) --> S2[Tạo DRAFT]
      S2 --> S3[Gửi] --> ST1{{TO_APPROVE}}
    end
    subgraph LEAD[Leader]
      ST1 --> L1{Quyết định}
      L1 -- từ chối --> RJ[REJECTED + lý do]
      L1 -- duyệt --> ST2{{LEADER_APPROVED}}
    end
    subgraph MGR[Manager]
      ST2 --> M1{Quyết định}
      M1 -- từ chối --> RJ
      M1 -- duyệt --> ST3{{MANAGER_APPROVED}}
    end
    subgraph HR[HR Admin]
      ST3 --> H1{Quyết định + kiểm tra số dư}
      H1 -- từ chối / không đủ --> RJ
      H1 -- duyệt --> AP{{APPROVED}}
    end
    AP --> X1[Trừ số dư phép]
    X1 --> X2[Ngày tương ứng → WorkDay LEAVE]
    X2 --> Z([Kết thúc])
    RJ --> Z
    S3 -. LeaveRequestSubmittedEvent .-> N1[(Thông báo người duyệt)]
```

Duyệt OT (UC-11) theo **cùng cấu trúc làn và máy trạng thái**; chỉ khác hiệu ứng cuối (OT đã duyệt đưa
vào lương thay vì trừ số dư). Xóa chỉ được phép ở `DRAFT`/`TO_APPROVE` (BR-LV-04).

---

## 3. Onboarding nhân viên mới

```mermaid
flowchart TD
    subgraph HR[HR Admin]
      O1([Tuyển mới]) --> O2[Tạo EmployeeInfo<br/>phòng ban, vai trò, mã pháp lý]
      O2 --> O3[Tạo UserAccount<br/>username + mật khẩu tạm]
      O3 --> O4[Tạo Contract v1<br/>baseSalary, positionCode, step, insuranceBase, dependents]
      O4 --> O5[Upload ảnh & tài liệu hợp đồng]
      O5 --> O6[Đăng ký người phụ thuộc thuế]
    end
    subgraph SYS[Hệ thống]
      O3 -. seed .-> P1[(Bật đăng nhập)]
      O4 --> P2[Đánh dấu hợp đồng hiện hành; mở lịch sử]
    end
    subgraph DEV[Đăng ký chấm công]
      O6 --> Q1[Đăng ký khuôn mặt trên thiết bị - bên ngoài]
      Q1 --> Q2[Thiết bị đẩy chấm công qua API key]
    end
    Q2 --> Z([Nhân viên sẵn sàng])
```

**Đầu ra mở khóa các quy trình sau:** cần hợp đồng hiện hành trước khi tính lương (BR-CT-03); cần đăng ký
thiết bị trước các luồng chấm công. Tính duy nhất mã pháp lý (nationalId/taxCode/socialInsuranceCode)
được enforce (UC-02 A1).

---

## 4. Thu nhận dữ liệu chấm công từ máy chấm công

```mermaid
flowchart TD
    subgraph DEVICE[Máy chấm công]
      T1([Nhận diện khuôn mặt]) --> T2{Online?}
      T2 -- có --> T3[POST /api/checkin-logs đơn]
      T2 -- không --> T4[Đệm cục bộ]
      T4 --> T5[Khi kết nối lại: POST /batch]
    end
    subgraph API[Backend]
      T3 --> U1[DeviceApiKeyFilter kiểm tra X-Device-API-Key]
      T5 --> U1
      U1 -- không hợp lệ --> U9[401, bỏ]
      U1 -- hợp lệ --> U2[Lưu CheckinLog thô]
      U2 --> U3{logType}
      U3 -- IN --> U4[Tạo Attendance cho ngày - idempotent]
      U3 -- OUT --> U5[Đóng Attendance, tính giờ & violate]
      U4 --> U6[(CheckinProcessedEvent)]
      U5 --> U6
    end
    subgraph BATCH[Đêm]
      N1[AttendanceSchedule 00:00] --> N2[Backfill hôm qua từ log thô]
      N2 --> N3[Tái dựng WorkDay; gắn CONFLICT nếu nguồn mâu thuẫn]
    end
    U6 --> Z([Bảng công cập nhật])
    N3 --> Z
```

**Độ tin cậy:** đệm offline + upload `/batch` chịu được thiết bị mất kết nối (NFR-4).
**Idempotency:** `IN` trùng cho ngày đã có sẽ bị bỏ qua (BR-AT-02). **Đối soát:** thiếu `OUT` để bản ghi
mở và `violate=true` đến khi cron đêm hoặc HR adjustment sửa. Chi tiết giao thức:
[Integration Design](../02-technical/11-integration-design.md).

---

## Truy vết quy trình → quy tắc

| Quy trình | Quy tắc chính | Use case chính |
|-----------|---------------|----------------|
| Tính lương | BR-PR-*, BR-CFG-04, BR-RBAC-04, BR-AT-09 | UC-09, UC-13, UC-14, UC-15, UC-17 |
| Duyệt nghỉ phép | BR-LV-* | UC-10 |
| Onboarding | BR-CT-*, BR-DC-01 | UC-02..05, UC-20 |
| Thu nhận chấm công | BR-AT-* | UC-06, UC-07, UC-08 |
