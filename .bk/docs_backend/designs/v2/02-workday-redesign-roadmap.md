# Kế hoạch Tái thiết kế: WorkDay Abstraction

> Phiên bản: v1.0 — 2026-05-28  
> Tiền đề: Xem [01-current-state-investigation.md](01-current-state-investigation.md)

---

## 1. Giải pháp Trung tâm: WorkDay Entity

### 1.1 Định nghĩa

`WorkDay` là bản ghi đại diện cho **trạng thái làm việc của một nhân viên trong một ngày cụ thể**, tổng hợp từ mọi nguồn (thiết bị, đơn nghỉ phép, ngày lễ).

```
WorkDay {
  id            String (UUID)
  employeeId    String (FK → EmployeeInfo)
  date          LocalDate

  // Phân loại ngày
  type          WorkDayType     -- PRESENT | LEAVE | HOLIDAY | ABSENT | HOLIDAY_WORK

  // Nguồn tạo ra bản ghi này
  source        WorkDaySource   -- CHECKIN | LEAVE_REQUEST | PUBLIC_HOLIDAY | MANUAL | SYSTEM

  // Dữ liệu thời gian (null nếu type = LEAVE / HOLIDAY)
  checkIn       LocalDateTime?
  checkOut      LocalDateTime?
  lateHour      BigDecimal      -- 0 nếu không đi làm
  workingHour   BigDecimal
  otMinutes     Int             -- tổng OT đã duyệt trong ngày (từ OTRequest)

  // Ngày công quy đổi
  paidDay       BigDecimal      -- 0 | 0.5 | 1 | 1.x (OT day)
  workingDay    BigDecimal

  // Trạng thái tổng hợp
  violation     boolean
  locked        boolean         -- true sau khi HR close period

  // Liên kết nguồn gốc
  attendanceId      String?     -- FK → Attendance (nếu source = CHECKIN)
  leaveRequestId    String?     -- FK → LeaveRequest (nếu source = LEAVE_REQUEST)

  // Audit
  createdBy     String
  updatedBy     String
  createdAt     LocalDateTime
  updatedAt     LocalDateTime
}
```

### 1.2 WorkDayType

| Type | Khi nào | paidDay mặc định |
|------|---------|:-----------------:|
| `PRESENT` | Check-in từ thiết bị (có Attendance) | Từ Attendance.paidDay |
| `LEAVE` | Ngày thuộc approved LeaveRequest | 1.0 (trừ UNPAID → 0) |
| `HOLIDAY` | Ngày lễ quốc gia (PublicHoliday) | 1.0 (lương ngày lễ) |
| `ABSENT` | Không có gì — vắng mặt | 0 |
| `HOLIDAY_WORK` | Có check-in vào ngày lễ / cuối tuần | Từ Attendance + OT |

### 1.3 Quy tắc Conflict Resolution

Khi nhiều nguồn cùng yêu cầu WorkDay cho một ngày, áp dụng theo thứ tự ưu tiên:

```
Priority (cao → thấp):
  1. MANUAL (HR sửa tay — override mọi thứ)
  2. LEAVE (đơn nghỉ phép đã duyệt)
  3. CHECKIN (dữ liệu thiết bị)
  4. PUBLIC_HOLIDAY (ngày lễ)
  5. SYSTEM (giá trị mặc định từ scheduler)
```

Ví dụ: nếu nhân viên có cả check-in lẫn LeaveRequest APPROVED cùng ngày:
- WorkDay.source = `CONFLICT` (trạng thái đặc biệt)
- WorkDay.locked = false
- HR phải manually resolve trước khi close period

---

## 2. Kiến trúc Mới

```
CheckinLog ──────────────────────────────────────► Attendance (raw, giữ nguyên)
    │                                                    │
    │ (AFTER_COMMIT event)                               │ (WorkDayBuilder)
    ▼                                                    ▼
AttendanceService ───────────────────────────────► WorkDay (type=PRESENT)
                                                         ▲
LeaveService.approve() ──────────────────────────────────┤ (type=LEAVE)
                                                         │
OTRequestService.approve() ─────────────────────────────┤ (update otMinutes)
                                                         │
PublicHolidayService.create() ──────────────────────────┤ (type=HOLIDAY)
                                                         │
AttendanceSchedule (cron) ──────────────────────────────┤ (type=ABSENT, missing days)
                                                         │
                                                         ▼
PayrollCalculationEngine ◄─────────────────────── WorkDay (single source)
```

**Engine chỉ cần đọc từ WorkDay.** Không còn đọc từ LeaveRequest hay Attendance riêng lẻ.

---

## 3. Thay đổi Từng Module

### 3.1 Sau khi LeaveRequest APPROVED

```java
// LeaveService.approveLeaveRequest() — cấp HR_ADMIN (hiện tại)
leaveRequest.setStatus(APPROVED);
updateLeaveBalance(leaveRequest);
leaveRepository.save(leaveRequest);
// THÊM:
eventPublisher.publishEvent(new LeaveApprovedEvent(leaveRequest));
```

```java
// WorkDayService.onLeaveApproved() — @TransactionalEventListener AFTER_COMMIT
void onLeaveApproved(LeaveApprovedEvent event) {
  LeaveRequest lr = event.getLeaveRequest();
  List<LocalDate> leaveDates = expandDateRange(lr.getStartTime(), lr.getEndTime());
  for (LocalDate date : leaveDates) {
    WorkDay wd = workDayRepository.findByEmployeeAndDate(lr.getEmployeeId(), date)
        .orElse(new WorkDay());
    if (wd.isLocked()) continue;  // không sửa ngày đã khóa
    if (wd.getSource() == WorkDaySource.CHECKIN) {
      wd.setSource(WorkDaySource.CONFLICT);  // cần HR resolve
    } else {
      wd.setType(WorkDayType.LEAVE);
      wd.setSource(WorkDaySource.LEAVE_REQUEST);
      wd.setPaidDay(lr.getLeaveType() == LeaveType.UNPAID ? BigDecimal.ZERO : BigDecimal.ONE);
      wd.setLeaveRequestId(lr.getId());
    }
    workDayRepository.save(wd);
  }
}
```

### 3.2 Sau khi OTRequest APPROVED

```java
// WorkDayService.onOTApproved()
void onOTApproved(OTApprovedEvent event) {
  OTRequest ot = event.getOTRequest();
  LocalDate date = ot.getStartTime().toLocalDate();
  WorkDay wd = workDayRepository.findOrCreate(ot.getEmployeeId(), date);
  long minutes = Duration.between(ot.getStartTime(), ot.getEndTime()).toMinutes();
  wd.setOtMinutes(wd.getOtMinutes() + (int) minutes);
  // nếu date là cuối tuần/lễ và wd.type == ABSENT → đổi thành HOLIDAY_WORK
  if (isWeekendOrHoliday(date) && wd.getType() == WorkDayType.ABSENT) {
    wd.setType(WorkDayType.HOLIDAY_WORK);
  }
  workDayRepository.save(wd);
}
```

### 3.3 Sau khi Attendance được tạo/cập nhật

```java
// AttendanceService — sau save Attendance
void syncToWorkDay(Attendance attendance) {
  WorkDay wd = workDayRepository.findOrCreate(
      attendance.getEmployee().getEmployeeId(),
      attendance.getAttendanceDate()
  );
  if (wd.isLocked()) return;
  if (wd.getSource() == WorkDaySource.LEAVE_REQUEST) {
    wd.setSource(WorkDaySource.CONFLICT);  // check-in trong ngày nghỉ phép
  } else {
    wd.setType(WorkDayType.PRESENT);
    wd.setSource(WorkDaySource.CHECKIN);
    wd.setCheckIn(attendance.getCheckIn());
    wd.setCheckOut(attendance.getCheckOut());
    wd.setLateHour(attendance.getLateHour());
    wd.setWorkingHour(attendance.getWorkingHour());
    wd.setPaidDay(attendance.getPaidDay());
    wd.setViolation(attendance.isViolate());
    wd.setAttendanceId(attendance.getId());
  }
  workDayRepository.save(wd);
}
```

### 3.4 AttendanceSchedule — Sinh ABSENT records

```java
// Bổ sung: sau khi backfill attendance
void generateAbsentWorkDays(LocalDate date) {
  List<EmployeeInfo> activeEmployees = employeeRepo.findByStatusAndDeleteFlagFalse(ACTIVE);
  Set<String> joinedBefore = activeEmployees.stream()
      .filter(e -> !e.getDateOfJoining().isAfter(date))  // chỉ nhân viên đã vào
      .map(EmployeeInfo::getEmployeeId)
      .collect(toSet());
  Set<String> hasWorkDay = workDayRepo.findEmployeeIdsByDate(date);
  Set<String> missing = new HashSet<>(joinedBefore);
  missing.removeAll(hasWorkDay);
  for (String empId : missing) {
    // Kiểm tra ngày lễ/cuối tuần trước
    if (!isWorkingDay(date)) continue;
    WorkDay wd = WorkDay.absent(empId, date);
    workDayRepository.save(wd);
  }
}
```

### 3.5 PeriodCloseService — Reconcile thay vì chỉ Check

Đóng kỳ trở thành **quy trình 3 bước**:

```
Bước 1 — Auto-generate:
  Đảm bảo mọi working day trong tháng đều có WorkDay record
  (bao gồm ABSENT, LEAVE, HOLIDAY)

Bước 2 — HR Review:
  HR xem danh sách WorkDay với type = CONFLICT hoặc ABSENT
  Với mỗi CONFLICT: chọn source nào thắng (LEAVE hay CHECKIN)
  Với mỗi ABSENT: xác nhận là vắng không phép hoặc nhập lý do

Bước 3 — Lock:
  Sau khi không còn CONFLICT và HR đã confirm ABSENT
  SET WorkDay.locked = true cho tất cả ngày trong tháng
  Tạo AttendancePeriodClose record
  Từ lúc này Engine mới được phép chạy tháng đó
```

### 3.6 PayrollCalculationEngine — Chỉ đọc WorkDay

```java
// Trước (hiện tại):
int nctt = computeActualWorkingDays(attendanceRecords);  // chỉ Attendance
BigDecimal otPay = computeOtPay(otRequests, lhq, nt);    // OTRequest trực tiếp

// Sau (mới):
// Tất cả logic từ WorkDay:
int nctt = workDays.stream()
    .filter(wd -> wd.getPaidDay().compareTo(BigDecimal.ZERO) > 0)
    .mapToInt(wd -> 1).sum();

BigDecimal otPay = workDays.stream()
    .mapToInt(WorkDay::getOtMinutes)
    .sum() → computeOtPayFromMinutes(totalMinutes, wd.date, holidays);
```

---

## 4. Database Migration

### 4.1 Schema mới

```sql
-- V20__create_workday.sql
CREATE TABLE work_day (
    id                  VARCHAR(36) PRIMARY KEY,
    employee_id         VARCHAR(36) NOT NULL REFERENCES employee_info(employee_id),
    work_date           DATE NOT NULL,
    type                VARCHAR(20) NOT NULL,  -- PRESENT|LEAVE|HOLIDAY|ABSENT|HOLIDAY_WORK
    source              VARCHAR(20) NOT NULL,  -- CHECKIN|LEAVE_REQUEST|PUBLIC_HOLIDAY|MANUAL|SYSTEM|CONFLICT
    check_in            TIMESTAMP,
    check_out           TIMESTAMP,
    late_hour           NUMERIC(5,2)  DEFAULT 0,
    working_hour        NUMERIC(5,2)  DEFAULT 0,
    ot_minutes          INT           DEFAULT 0,
    paid_day            NUMERIC(5,4)  DEFAULT 0,
    working_day         NUMERIC(5,4)  DEFAULT 0,
    violation           BOOLEAN       DEFAULT FALSE,
    locked              BOOLEAN       DEFAULT FALSE,
    attendance_id       VARCHAR(36),  -- FK → attendance (nullable)
    leave_request_id    VARCHAR(36),  -- FK → leave_request (nullable)
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    created_at          TIMESTAMP     DEFAULT NOW(),
    updated_at          TIMESTAMP     DEFAULT NOW(),
    UNIQUE (employee_id, work_date)  -- một nhân viên chỉ có một WorkDay/ngày
);

CREATE INDEX idx_workday_employee_date ON work_day(employee_id, work_date);
CREATE INDEX idx_workday_date_type     ON work_day(work_date, type);
CREATE INDEX idx_workday_locked        ON work_day(locked, work_date);
```

### 4.2 Migration dữ liệu hiện có

```sql
-- V21__migrate_attendance_to_workday.sql
-- Backfill WorkDay từ Attendance hiện có
INSERT INTO work_day (
    id, employee_id, work_date, type, source,
    check_in, check_out, late_hour, working_hour,
    paid_day, working_day, violation, locked, attendance_id,
    created_at, updated_at
)
SELECT
    gen_random_uuid()::text,
    a.employee_id,
    a.attendance_date,
    CASE WHEN a.paid_day > 0 THEN 'PRESENT' ELSE 'ABSENT' END,
    'CHECKIN',
    a.check_in, a.check_out,
    COALESCE(a.late_hour, 0),
    COALESCE(a.working_hour, 0),
    COALESCE(a.paid_day, 0),
    COALESCE(a.working_day, 0),
    COALESCE(a.violate, FALSE),
    FALSE,  -- không lock dữ liệu cũ
    a.id,
    a.created_at, a.updated_at
FROM attendance a
WHERE a.delete_flag = FALSE
ON CONFLICT (employee_id, work_date) DO NOTHING;
```

---

## 5. Roadmap Triển khai

### Phase 0 — Dừng build thêm, thiết kế (1 tuần)

**Mục tiêu**: Không thêm feature mới vào Attendance/Leave/OT cho đến khi WorkDay được thiết kế xong.

**Việc cần làm**:
- [ ] Review và confirm thiết kế WorkDay entity (schema, enum values, conflict rules)
- [ ] Viết ERD cập nhật với WorkDay
- [ ] Xác định scope demo: luồng nào cần hoạt động end-to-end cho demo

**Không làm**:
- Không thêm logic vào LeaveService/OTRequestService
- Không thêm màn hình mới liên quan đến chấm công

---

### Phase 1 — Xây WorkDay Foundation (1–2 tuần)

**Mục tiêu**: WorkDay entity tồn tại, dữ liệu hiện có được migrate, các module bắt đầu ghi vào WorkDay.

**Backend**:
- [ ] Tạo `WorkDay` entity, `WorkDayRepository`, `WorkDayService`
- [ ] Flyway migration V20 (tạo bảng) + V21 (backfill từ Attendance)
- [ ] `AttendanceService.syncToWorkDay()` — gọi sau mỗi lần save Attendance
- [ ] `AttendanceSchedule` sinh ABSENT WorkDay cho nhân viên missing
- [ ] Unit test: check WorkDay được tạo đúng type từ Attendance

**Không thay đổi**:
- `PayrollCalculationEngine` vẫn đọc từ Attendance (chưa đổi)
- Bảng `Attendance` vẫn giữ nguyên — WorkDay là addition, không phải replacement

**Verify**:
- Chạy migration trên DB test, kiểm tra count WorkDay = count Attendance
- Test: checkin → Attendance → WorkDay(PRESENT) được tạo

---

### Phase 2 — Leave & OT → WorkDay (1 tuần)

**Mục tiêu**: Leave APPROVED và OT APPROVED tạo/cập nhật WorkDay.

**Backend**:
- [ ] Tạo `LeaveApprovedEvent`, publish trong `LeaveService.approveLeaveRequest()` (cấp HR_ADMIN)
- [ ] `WorkDayService.onLeaveApproved()` — tạo WorkDay(LEAVE) cho từng ngày trong leave period
- [ ] Conflict detection: nếu WorkDay(CHECKIN) đã tồn tại → set source=CONFLICT
- [ ] Tạo `OTApprovedEvent`, publish trong `OTRequestService.approveOTRequest()` (cấp HR_ADMIN)
- [ ] `WorkDayService.onOTApproved()` — update `otMinutes` trong WorkDay
- [ ] Tương tự: Leave REJECTED → xóa WorkDay(LEAVE) nếu không có source khác

**API mới**:
- `GET /api/work-days?employeeId=&year=&month=` — xem WorkDay của nhân viên
- `GET /api/work-days/conflicts?year=&month=` — xem danh sách CONFLICT, chỉ HR
- `PATCH /api/work-days/{id}/resolve` — HR resolve CONFLICT (chọn source thắng)

**Verify**:
- Test luồng: tạo leave ANNUAL → approve 3 cấp → check WorkDay(LEAVE) được tạo cho từng ngày
- Test conflict: check-in ngày X + approve leave ngày X → WorkDay(CONFLICT)

---

### Phase 3 — Period Close Redesign (1–2 tuần)

**Mục tiêu**: Đóng kỳ trở thành luồng reconcile 3 bước, demo được end-to-end.

**Backend**:
- [ ] `PeriodCloseService.generateWorkDaysForPeriod()` — auto-generate ABSENT cho ngày missing
- [ ] `PeriodCloseService.getConflictsForPeriod()` — trả về danh sách CONFLICT
- [ ] `PeriodCloseService.closePeriod()` — kiểm tra không còn CONFLICT, lock tất cả WorkDay
- [ ] Thêm validation: không cho close nếu còn WorkDay.source = CONFLICT

**Frontend**:
- [ ] Màn hình đóng kỳ (AT-03): hiển thị WorkDay summary cho tháng (breakdown by type)
- [ ] Tab "Conflicts": danh sách ngày CONFLICT cần HR resolve trước khi close
- [ ] Tab "Absent": danh sách ngày ABSENT — confirm vắng phép hoặc manual override

**Verify**:
- Demo: leave APPROVED → period close → HR thấy ngày leave trong summary → close thành công

---

### Phase 4 — Payroll reads WorkDay (1 tuần)

**Mục tiêu**: Engine chỉ đọc WorkDay, bỏ phụ thuộc vào Attendance và OTRequest trực tiếp.

**Backend**:
- [ ] Thêm `workDays: List<WorkDay>` vào input của `PayrollCalculationEngine.buildPayroll()`
- [ ] Refactor `computeActualWorkingDays()` — đọc từ `workDay.paidDay`
- [ ] Refactor `resolveKpi2()` — đọc `workDay.violation` và `workDay.type`
- [ ] Refactor `computeOtPay()` — đọc từ `workDay.otMinutes` thay vì OTRequest trực tiếp
- [ ] `PayrollService.calculate()` — thêm query `workDayRepository.findByEmployeeAndPeriod()`
- [ ] `PayrollBatchService.runBatch()` — bulk load WorkDay, không thay đổi cấu trúc batch

**Verify**:
- Test: nhân viên nghỉ phép 5 ngày, không check-in → lương tính đúng 5 ngày phép
- Test: nhân viên OT 3 ngày → otMinutes đúng → otPay đúng
- Regression test: nhân viên chỉ có check-in bình thường → kết quả không thay đổi

---

### Phase 5 — Cleanup & Hardening (1 tuần)

**Mục tiêu**: Dọn dẹp nợ kỹ thuật, xử lý edge cases còn lại.

**Backend**:
- [ ] `PayrollService` bỏ dependency vào `AttendanceRepository` (chỉ qua WorkDay)
- [ ] Deprecate các API endpoint trực tiếp đọc Attendance cho payroll purposes
- [ ] Xử lý edge case: nhân viên join/terminate giữa tháng trong `generateAbsentWorkDays()`
- [ ] Xử lý OT span midnight: split OT thành 2 WorkDay nếu qua 00:00
- [ ] Add constraint: không cho tính lương nếu period chưa được close

**Frontend**:
- [ ] Payroll calculation form: hiển thị WorkDay summary của tháng trước khi calculate
- [ ] Warning nếu period chưa close khi FINANCE_ADMIN cố tính lương

---

## 6. Đánh giá Rủi ro

| Rủi ro | Xác suất | Mức độ | Giảm thiểu |
|--------|:--------:|:------:|------------|
| Migration V21 làm chậm DB (bảng Attendance lớn) | Trung bình | Thấp | Chạy migration offline, batch insert |
| Conflict detection tạo quá nhiều CONFLICT records | Thấp | Trung bình | Log thực tế hiếm có check-in ngày đã nghỉ phép |
| Phase 4 làm thay đổi kết quả lương | Trung bình | Cao | Test so sánh kết quả cũ vs mới trên bộ dữ liệu thực trước khi deploy |
| Frontend period-close flow phức tạp hơn | Cao | Thấp | Thêm workflow nhưng không ảnh hưởng luồng chỉ check-in |
| Rollback nếu WorkDay có bug | Trung bình | Trung bình | Phase 1–3 giữ engine cũ, có thể rollback WorkDay feature flag |

---

## 7. Định nghĩa "Demo được"

Sau Phase 3, demo end-to-end có thể thực hiện:

```
1. Nhân viên A chấm công thiết bị cả tháng → Attendance + WorkDay(PRESENT) ✓
2. Nhân viên A xin nghỉ 3 ngày ANNUAL → APPROVED → WorkDay(LEAVE) tạo ✓
3. HR vào Đóng kỳ → thấy summary: 20 ngày PRESENT, 3 ngày LEAVE ✓
4. HR close → WorkDay locked ✓
5. Finance tính lương → nctt = 23 ngày → lương đúng ✓
6. Director approve → nhân viên nhận thông báo ✓
```

Đây là luồng hiện tại bị đứt ở bước 2→3: leave không tạo WorkDay, bước 5 chỉ thấy 20 ngày.

---

## 8. Không làm

Để tránh scope creep, **không** thực hiện trong roadmap này:

- Attendance Adjustment Request (ADJ) — là feature riêng, không phải prerequisite
- Thay đổi quy trình phê duyệt Leave/OT (workflow 3 cấp giữ nguyên)
- Thay đổi cách tính OT pay (công thức giữ nguyên, chỉ đổi input source)
- Thêm WorkDay vào báo cáo / export — đưa vào phase sau
- Thay thế bảng `Attendance` — WorkDay là layer trên, không xóa Attendance
