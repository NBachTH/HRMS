# Báo cáo Điều tra Hiện trạng Hệ thống

> Phiên bản: v1.0 — 2026-05-28  
> Phạm vi: Luồng tích hợp Attendance × Leave × OT × Payroll

---

## 1. Tổng quan Kiến trúc Hiện tại

Hệ thống hiện tại xử lý ba nguồn dữ liệu ngày công theo mô hình **silo song song**:

```
CheckinLog (thiết bị vật lý)
    │
    ▼ (real-time event AFTER_COMMIT)
Attendance ──────────────────────────────────────────► PayrollCalculationEngine
                                                              ▲
LeaveRequest ──── APPROVED ──── (không có gì tiếp theo)       │
                                                              │ (đọc thẳng)
OTRequest ────── APPROVED ──────────────────────────────────► │
```

Ba module tồn tại độc lập, không có điểm hội tụ. Engine phải đọc từ hai nguồn khác nhau với logic ghép nối thủ công. LeaveRequest APPROVED không bao giờ xuất hiện trong Attendance.

---

## 2. Phân tích Module-by-Module

### 2.1 Luồng CheckinLog → Attendance

**Hoạt động đúng với thiết kế.**

- `CheckinLogService.processRealTime()` lưu raw log, publish `CheckinProcessedEvent`.
- `AttendanceService.onCheckinProcessed()` (AFTER_COMMIT) xử lý:
  - LogType `IN` → tạo Attendance mới cho ngày (idempotent nếu đã tồn tại).
  - LogType `OUT` → tìm Attendance mở (checkOut IS NULL), gán `checkOut`, tính toán.
- `AttendanceSchedule` (cron 00:00) backfill ngày hôm qua từ CheckinLog.

**Giới hạn**: Cron chỉ xử lý nhân viên **có CheckinLog**. Nhân viên vắng mặt hoàn toàn không có Attendance record.

**computeAndApply logic** (AttendanceService):
```
workStart     = 08:30 (DEFAULT_WORK_START)
lateMinutes   = max(0, checkIn - workStart) in minutes
lateHour      = lateMinutes / 60  (round HALF_UP, 2 decimals)
workingHour   = (checkOut - checkIn) in minutes / 60
paidHour      = max(0, workingHour - lateHour)
workingDay    = workingHour / 8
paidDay       = paidHour / 8
violate       = lateHour > 0 OR checkOut == null
```

---

### 2.2 LeaveRequest — APPROVED không tạo Attendance

**Gap nghiêm trọng.**

Khi HR_ADMIN approve lần cuối (`LeaveService.approveLeaveRequest`, cấp HR_ADMIN):
1. `leaveRequest.status` → `APPROVED`
2. `leaveBalance.pendingDays -= days`, `usedDays += days` (chỉ cho ANNUAL)
3. **Không có gì thêm.** Không tạo Attendance. Không publish event.

Kết quả: ngày nghỉ phép đã được duyệt **không tồn tại trong bảng Attendance**.

| Ngày | CheckinLog | Attendance | LeaveRequest |
|------|:---:|:---:|:---:|
| 12/05 — nghỉ phép APPROVED | không có | **không có** | APPROVED |

Khi `PayrollCalculationEngine` tính lương, nó gọi `computeActualWorkingDays(attendanceRecords)` → đếm các Attendance có `paidDay > 0`. Ngày 12/05 không có Attendance → **không được tính vào `nctt` (số ngày công thực tế)** → lương tháng bị thiếu.

---

### 2.3 OTRequest — APPROVED không cập nhật Attendance

**Gap thứ hai.**

Khi OT được approve (`OTRequestService.approveOTRequest`):
1. `status` → `APPROVED`
2. Chỉ cập nhật `updatedAt`.
3. **Không có gì thêm.**

Attendance record (nếu tồn tại từ device check-in) **không biết** rằng giờ làm thêm đó đã được phê duyệt.

`PayrollCalculationEngine` đọc OTRequest APPROVED trực tiếp qua `computeOtPay(otRequests, lhq, nt)` — đây là ngoại lệ duy nhất không qua Attendance. Tuy nhiên nếu OT request có startTime/endTime trùng với giờ check-in thông thường, không có logic nào phát hiện hoặc ngăn tính double.

---

### 2.4 PeriodCloseService — Logic đúng nhưng không đủ

`PeriodCloseService.checkForUnexplainedAbsences()` có logic tương đối chặt:

```
workingDays = {Mon–Fri trong tháng} - {publicHolidays}
attendedDays = {ngày có Attendance record}
leaveDays = {ngày thuộc approved LeaveRequest}
unexplained = workingDays - attendedDays - leaveDays
```

**Điểm tốt**: có xét cả LeaveRequest APPROVED và PublicHoliday.

**Điểm chưa đủ**:
1. Sau khi `closePeriod` thành công, hệ thống chỉ tạo `AttendancePeriodClose` record (metadata đóng kỳ). Không tạo Attendance cho các ngày `leaveDays`. Engine vẫn không thể thấy những ngày đó.
2. Force close với `forceClose=true` ghi chú vắng không phép vào `notes` (string) — không cấu trúc, không thể truy vấn sau.
3. Không có bước "HR review từng ngày và confirm" — chỉ có bước "có vắng không phép không?"

---

### 2.5 PayrollCalculationEngine — Đọc từ hai nguồn không đồng nhất

```java
// Nguồn 1: Attendance records
int nctt = computeActualWorkingDays(attendanceRecords);
// Đếm records có paidDay > 0

// Nguồn 2: OTRequest (đọc thẳng, không qua Attendance)
BigDecimal otPay = computeOtPay(otRequests, lhq, nt);

// Nguồn 3: LeaveRequest — KHÔNG ĐỌC, không tồn tại trong engine
```

**Hệ quả với từng kịch bản**:

| Kịch bản | Attendance | LeaveRequest | OTRequest | Kết quả Payroll |
|----------|:---:|:---:|:---:|:---:|
| Check-in bình thường | ✓ | — | — | Đúng |
| Nghỉ phép APPROVED, không check-in | ✗ | APPROVED | — | **Sai — thiếu ngày công** |
| OT được duyệt, có check-in | ✓ | — | APPROVED | Đúng (OT tính riêng) |
| OT được duyệt, không check-in | ✗ | — | APPROVED | Đúng (OT pay tính) nhưng ngày công = 0 |
| Check-in + LeaveRequest cùng ngày | ✓ | APPROVED | — | Thiết bị thắng, leave bị ignore |
| Vắng mặt không phép | ✗ | ✗ | — | Không tính công (đúng) |

---

## 3. Danh sách Edge Case Chưa Xử lý

### 3.1 Nhóm Leave × Attendance

| Edge case | Hành vi hiện tại | Hành vi mong đợi |
|-----------|-----------------|-----------------|
| Nghỉ phép APPROVED → lương bị thiếu ngày | Tính thiếu, không cảnh báo | `paidDay = 1` cho ngày nghỉ phép hợp lệ |
| Nghỉ nửa ngày (4h) + check-in nửa ngày còn lại | Chỉ tính giờ check-in, phép nửa ngày mất | Tổng `paidDay = 0.5 + 0.5 = 1` |
| Check-in ngày đã có leave APPROVED | Thiết bị thắng, leave bị bỏ qua | Cảnh báo conflict, HR quyết định |
| SICK leave không có giấy tờ được approve | Trả `paidDay = 1` theo leave | Hiện không xảy ra vì leave không tạo attendance |
| Leave REJECTED sau khi tháng đã đóng | Số dư hoàn lại, Attendance không thay đổi | Phải reopen period (hiện không hỗ trợ) |

### 3.2 Nhóm OT × Attendance

| Edge case | Hành vi hiện tại | Hành vi mong đợi |
|-----------|-----------------|-----------------|
| OT request 18:00–20:00, check-out lúc 19:00 | OT tính full 2h, checkOut = 19:00 cho Attendance | OT chỉ tính giờ thực tế đã xác nhận |
| OT request và check-in trùng giờ | Không phát hiện, tính double | Cần dedup hoặc cảnh báo |
| OT ngày nghỉ lễ, không có check-in device | OT pay tính được; `nctt = 0` cho ngày đó | Cần Attendance với type HOLIDAY_WORK |
| OT REJECTED sau khi tháng đã đóng | Không ảnh hưởng lương đã tính (nếu đã tính) | Cần invalidate payroll DRAFT |

### 3.3 Nhóm Period Close

| Edge case | Hành vi hiện tại | Hành vi mong đợi |
|-----------|-----------------|-----------------|
| Đóng kỳ xong, phát hiện leave bị approve muộn | Không xử lý | Cần reopen hoặc adjustment |
| Force close rồi tính lương — ngày leave không có Attendance | Lương thiếu ngày | Leave phải được vật liệu hóa thành Attendance trước close |
| Nhân viên mới vào giữa tháng | Tất cả ngày trước join = absent → flagged | Cần biết `dateOfJoining` trong close logic |
| Nhân viên nghỉ việc giữa tháng | Tương tự — ngày sau terminate = absent | Cần biết termination date |

### 3.4 Nhóm Payroll Calculation

| Edge case | Hành vi hiện tại | Hành vi mong đợi |
|-----------|-----------------|-----------------|
| Tháng không có Attendance nào nhưng có leave | `nctt = 0` → lương = 0 | `nctt = số ngày leave APPROVED` |
| `kpi2` auto-derive: employee nghỉ phép ANNUAL không có violation | KPI2 = 1.04 (perfect) nếu không có Attendance vi phạm | Phải xét cả leave days |
| OT night hours qua nửa đêm (23:00–01:00) | Chỉ tính giờ ngày hiện tại trong range 22:00–06:00; ngày hôm sau không được xét | Cần split OT span across days |

---

## 4. Kết luận Hiện trạng

### Điều hệ thống làm đúng
- Xử lý check-in/check-out real-time và batch từ thiết bị.
- Tính toán `lateHour`, `paidDay`, `violate` từ dữ liệu thiết bị một cách nhất quán.
- `PeriodCloseService` có xét cả Leave và PublicHoliday khi kiểm tra vắng không phép.
- OT pay tính đúng với các mức nhân (1.5×/2.0×/3.0× + night bonus).

### Vấn đề cốt lõi

**Không có abstraction tổng hợp.** Hệ thống thiếu một bảng trung gian đại diện cho *trạng thái làm việc của nhân viên trong một ngày cụ thể* tổng hợp từ tất cả nguồn. Hệ quả:

1. **Leave APPROVED** không vật liệu hóa thành dữ liệu ngày công → lương sai.
2. **Conflict** giữa các nguồn (check-in + leave cùng ngày) không được phát hiện.
3. **Period close** không thể làm nhiệm vụ "reconcile" vì không có điểm hội tụ để reconcile.
4. **Engine** phải biết về cả 3 schema riêng biệt thay vì chỉ một schema duy nhất.
5. **Demo end-to-end** không thể thực hiện: luồng Leave → lương bị đứt.

### Mức độ ảnh hưởng

| Vấn đề | Mức độ | Có thể patch? |
|--------|:------:|:-------------:|
| Leave APPROVED không tạo Attendance | **Nghiêm trọng** — sai dữ liệu lương | Patch tạm được, nhưng giải quyết từng trường hợp mà không có abstraction thì tạo thêm nợ kỹ thuật |
| OT × Attendance không đồng bộ | **Nghiêm trọng** — nguy cơ tính double | Như trên |
| Period close chưa hoàn chỉnh | **Trung bình** — UI/UX kém, không demo được | Phụ thuộc vào bước trên |
| Edge cases vắng mặt | **Trung bình** — lỗi im lặng | Phụ thuộc vào abstraction |

Ba vấn đề đầu không độc lập. Fix bất kỳ cái nào mà không có abstraction WorkDay sẽ tạo ra patch chồng patch. WorkDay là thứ cần thiết kế trước.
