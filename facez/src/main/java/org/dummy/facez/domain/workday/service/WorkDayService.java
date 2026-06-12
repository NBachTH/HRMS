package org.dummy.facez.domain.workday.service;

import org.dummy.facez.common.enums.EmployeeStatus;
import org.dummy.facez.common.enums.LeaveType;
import org.dummy.facez.common.enums.WorkDaySource;
import org.dummy.facez.common.enums.WorkDayType;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.domain.attendance.model.Attendance;
import org.dummy.facez.domain.attendance.repository.PublicHolidayRepository;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.dummy.facez.domain.workday.dto.WorkDayResponse;
import org.dummy.facez.domain.workday.event.LeaveApprovedEvent;
import org.dummy.facez.domain.workday.event.OTApprovedEvent;
import org.dummy.facez.domain.workday.model.WorkDay;
import org.dummy.facez.domain.workday.repository.WorkDayRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class WorkDayService {

    private static final Logger log = LoggerFactory.getLogger(WorkDayService.class);

    private final WorkDayRepository workDayRepository;
    private final EmployeeInfoRepository employeeInfoRepository;
    private final PublicHolidayRepository publicHolidayRepository;

    public WorkDayService(WorkDayRepository workDayRepository,
                          EmployeeInfoRepository employeeInfoRepository,
                          PublicHolidayRepository publicHolidayRepository) {
        this.workDayRepository = workDayRepository;
        this.employeeInfoRepository = employeeInfoRepository;
        this.publicHolidayRepository = publicHolidayRepository;
    }

    // ── Event listeners ─────────────────────────────────────────────────────────

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onLeaveApproved(LeaveApprovedEvent e) {
        try {
            boolean unpaid = e.getLeaveType() == LeaveType.UNPAID;
            LocalDate d = e.getStartTime().toLocalDate();
            LocalDate end = e.getEndTime().toLocalDate();
            while (!d.isAfter(end)) {
                applyLeave(e.getEmployeeId(), d, e.getLeaveType(), e.getLeaveRequestId(), unpaid);
                d = d.plusDays(1);
            }
        } catch (Exception ex) {
            log.error("Failed to sync WorkDay for approved leave {}: {}", e.getLeaveRequestId(), ex.getMessage(), ex);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onOTApproved(OTApprovedEvent e) {
        try {
            LocalDate date = e.getStartTime().toLocalDate();
            WorkDay wd = findOrCreate(e.getEmployeeId(), date);
            if (wd.isLocked()) return;
            int minutes = (int) Duration.between(e.getStartTime(), e.getEndTime()).toMinutes();
            wd.setOtMinutes(wd.getOtMinutes() + Math.max(0, minutes));
            if (!isWorkingDay(date) && wd.getType() == WorkDayType.ABSENT) {
                wd.setType(WorkDayType.HOLIDAY_WORK);
                wd.setSource(WorkDaySource.CHECKIN);
            }
            workDayRepository.save(wd);
        } catch (Exception ex) {
            log.error("Failed to sync WorkDay for approved OT {}: {}", e.getOtRequestId(), ex.getMessage(), ex);
        }
    }

    // ── Direct sync (called by AttendanceService after saving) ──────────────────

    @Transactional
    public void syncFromAttendance(Attendance att) {
        if (att.getEmployeeInfo() == null || att.getAttendanceDate() == null) return;
        WorkDay wd = findOrCreate(att.getEmployeeInfo().getEmployeeId(), att.getAttendanceDate());
        if (wd.isLocked()) return;

        // Check-in on a day already marked as approved leave → flag for HR.
        if (wd.getSource() == WorkDaySource.LEAVE_REQUEST) {
            wd.setSource(WorkDaySource.CONFLICT);
            workDayRepository.save(wd);
            return;
        }

        boolean weekendOrHoliday = !isWorkingDay(att.getAttendanceDate());
        wd.setType(weekendOrHoliday ? WorkDayType.HOLIDAY_WORK : WorkDayType.PRESENT);
        wd.setSource(WorkDaySource.CHECKIN);
        wd.setCheckIn(att.getCheckIn());
        wd.setCheckOut(att.getCheckOut());
        wd.setLateHour(nz(att.getLateHour()));
        wd.setWorkingHour(nz(att.getWorkingHour()));
        wd.setPaidDay(nz(att.getPaidDay()));
        wd.setWorkingDay(nz(att.getWorkingDay()));
        wd.setViolation(att.isViolate());
        wd.setAttendanceId(att.getAttendanceId());
        workDayRepository.save(wd);
    }

    // ── Period generation / locking (used by PeriodCloseService) ────────────────

    /**
     * Ensures every active employee has a WorkDay for every day of the month:
     * missing working days → ABSENT, missing public holidays → HOLIDAY.
     * PRESENT / LEAVE / HOLIDAY_WORK rows already exist from events.
     */
    @Transactional
    public void generateForPeriod(LocalDate from, LocalDate to) {
        Set<LocalDate> holidays = publicHolidayRepository.findHolidayDatesBetween(from, to);
        List<EmployeeInfo> employees = employeeInfoRepository
                .findByStatusAndDeleteFlagFalseAndRoleNot(EmployeeStatus.ACTIVE, org.dummy.facez.common.enums.Role.SYSTEM_ADMIN);

        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            boolean holiday = holidays.contains(cursor);
            boolean weekend = cursor.getDayOfWeek() == DayOfWeek.SATURDAY || cursor.getDayOfWeek() == DayOfWeek.SUNDAY;
            Set<String> covered = new HashSet<>(workDayRepository.findEmployeeIdsByDate(cursor));

            for (EmployeeInfo emp : employees) {
                if (emp.getDateOfJoining() != null && emp.getDateOfJoining().isAfter(cursor)) continue;
                if (covered.contains(emp.getEmployeeId())) continue;
                if (weekend && !holiday) continue; // weekends with nothing recorded are simply non-working

                WorkDay wd = newWorkDay(emp.getEmployeeId(), cursor);
                if (holiday) {
                    wd.setType(WorkDayType.HOLIDAY);
                    wd.setSource(WorkDaySource.PUBLIC_HOLIDAY);
                    wd.setPaidDay(BigDecimal.ONE);
                } else {
                    wd.setType(WorkDayType.ABSENT);
                    wd.setSource(WorkDaySource.SYSTEM);
                    wd.setPaidDay(BigDecimal.ZERO);
                    wd.setViolation(true);
                }
                workDayRepository.save(wd);
            }
            cursor = cursor.plusDays(1);
        }
    }

    @Transactional
    public void lockPeriod(LocalDate from, LocalDate to) {
        // lock every workday in range (load via a wide query per employee is heavy; do a date scan)
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            for (String empId : workDayRepository.findEmployeeIdsByDate(cursor)) {
                workDayRepository.findByEmployeeInfo_EmployeeIdAndWorkDate(empId, cursor)
                        .ifPresent(wd -> { wd.setLocked(true); workDayRepository.save(wd); });
            }
            cursor = cursor.plusDays(1);
        }
    }

    public long countConflicts(LocalDate from, LocalDate to) {
        return workDayRepository.countByWorkDateBetweenAndSource(from, to, WorkDaySource.CONFLICT);
    }

    public List<WorkDay> getConflicts(LocalDate from, LocalDate to) {
        return workDayRepository.findByWorkDateBetweenAndSource(from, to, WorkDaySource.CONFLICT);
    }

    @Transactional(readOnly = true)
    public List<WorkDayResponse> getForEmployeePeriod(String employeeId, LocalDate from, LocalDate to) {
        return workDayRepository.findByEmployeeInfo_EmployeeIdAndWorkDateBetween(employeeId, from, to)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<WorkDayResponse> getConflictResponses(LocalDate from, LocalDate to) {
        return getConflicts(from, to).stream().map(this::toResponse).toList();
    }

    /** HR resolves a CONFLICT day by choosing which source wins. */
    @Transactional
    public WorkDayResponse resolveConflict(String id, WorkDaySource chosen) {
        WorkDay wd = workDayRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorkDay", "id", id));
        if (wd.isLocked()) {
            throw new BadRequestException("This day is locked (period already closed).");
        }
        if (wd.getSource() != WorkDaySource.CONFLICT) {
            throw new BadRequestException("WorkDay is not in CONFLICT state.");
        }
        switch (chosen) {
            case CHECKIN -> {
                wd.setType(isWorkingDay(wd.getWorkDate()) ? WorkDayType.PRESENT : WorkDayType.HOLIDAY_WORK);
                wd.setSource(WorkDaySource.CHECKIN);
                wd.setLeaveType(null);
                wd.setLeaveRequestId(null);
            }
            case LEAVE_REQUEST -> {
                wd.setType(WorkDayType.LEAVE);
                wd.setSource(WorkDaySource.LEAVE_REQUEST);
                wd.setPaidDay(BigDecimal.ONE);
                wd.setViolation(false);
            }
            default -> throw new BadRequestException("Choose CHECKIN or LEAVE_REQUEST to resolve.");
        }
        workDayRepository.save(wd);
        return toResponse(wd);
    }

    private WorkDayResponse toResponse(WorkDay w) {
        return WorkDayResponse.builder()
                .id(w.getId())
                .employeeId(w.getEmployeeInfo() != null ? w.getEmployeeInfo().getEmployeeId() : null)
                .employeeName(w.getEmployeeInfo() != null ? w.getEmployeeInfo().getName() : null)
                .workDate(w.getWorkDate())
                .type(w.getType() != null ? w.getType().name() : null)
                .source(w.getSource() != null ? w.getSource().name() : null)
                .leaveType(w.getLeaveType() != null ? w.getLeaveType().name() : null)
                .checkIn(w.getCheckIn())
                .checkOut(w.getCheckOut())
                .lateHour(w.getLateHour())
                .workingHour(w.getWorkingHour())
                .otMinutes(w.getOtMinutes())
                .paidDay(w.getPaidDay())
                .workingDay(w.getWorkingDay())
                .violation(w.isViolation())
                .locked(w.isLocked())
                .build();
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private void applyLeave(String employeeId, LocalDate date, LeaveType leaveType,
                            String leaveRequestId, boolean unpaid) {
        WorkDay wd = findOrCreate(employeeId, date);
        if (wd.isLocked()) return;
        if (wd.getSource() == WorkDaySource.CHECKIN) {
            wd.setSource(WorkDaySource.CONFLICT);  // worked AND on leave — HR resolves
        } else {
            wd.setType(WorkDayType.LEAVE);
            wd.setSource(WorkDaySource.LEAVE_REQUEST);
            wd.setLeaveType(leaveType);
            wd.setLeaveRequestId(leaveRequestId);
            wd.setPaidDay(unpaid ? BigDecimal.ZERO : BigDecimal.ONE);
            wd.setViolation(false);
        }
        workDayRepository.save(wd);
    }

    private WorkDay findOrCreate(String employeeId, LocalDate date) {
        return workDayRepository.findByEmployeeInfo_EmployeeIdAndWorkDate(employeeId, date)
                .orElseGet(() -> newWorkDay(employeeId, date));
    }

    private WorkDay newWorkDay(String employeeId, LocalDate date) {
        return WorkDay.builder()
                .id(UUID.randomUUID().toString())
                .employeeInfo(employeeInfoRepository.getReferenceById(employeeId))
                .workDate(date)
                .type(WorkDayType.ABSENT)
                .source(WorkDaySource.SYSTEM)
                .build();
    }

    private boolean isWorkingDay(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) return false;
        return !publicHolidayRepository.existsByHolidayDate(date);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
