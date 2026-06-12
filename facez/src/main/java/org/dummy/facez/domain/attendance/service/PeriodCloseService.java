package org.dummy.facez.domain.attendance.service;

import lombok.RequiredArgsConstructor;
import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.domain.attendance.dto.PeriodCloseRequest;
import org.dummy.facez.domain.attendance.dto.PeriodCloseResponse;
import org.dummy.facez.domain.attendance.dto.UnexplainedAbsenceDto;
import org.dummy.facez.domain.attendance.model.AttendancePeriodClose;
import org.dummy.facez.domain.attendance.repository.AttendancePeriodCloseRepository;
import org.dummy.facez.domain.attendance.repository.AttendanceRepository;
import org.dummy.facez.domain.attendance.repository.PublicHolidayRepository;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.dummy.facez.domain.leave.repository.LeaveRequestRepository;
import org.dummy.facez.domain.workday.service.TimesheetService;
import org.dummy.facez.domain.workday.service.WorkDayService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PeriodCloseService {

    private final AttendancePeriodCloseRepository periodCloseRepository;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeInfoRepository employeeInfoRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final PublicHolidayRepository publicHolidayRepository;
    private final WorkDayService workDayService;
    private final TimesheetService timesheetService;

    @Transactional
    public PeriodCloseResponse closePeriod(PeriodCloseRequest req, String closedByUsername) {
        if (periodCloseRepository.existsByCloseYearAndCloseMonth(req.getYear(), req.getMonth())) {
            throw new BadRequestException(
                    "Attendance period " + req.getMonth() + "/" + req.getYear() + " is already closed.");
        }

        LocalDate from = LocalDate.of(req.getYear(), req.getMonth(), 1);
        LocalDate to   = YearMonth.of(req.getYear(), req.getMonth()).atEndOfMonth();

        // Step 1 — make sure every employee has a WorkDay for every day (fills ABSENT/HOLIDAY)
        workDayService.generateForPeriod(from, to);

        // Step 2a — CONFLICT days (check-in + leave on the same day) must be resolved by HR first
        long conflicts = workDayService.countConflicts(from, to);
        if (conflicts > 0) {
            return PeriodCloseResponse.builder()
                    .year(req.getYear())
                    .month(req.getMonth())
                    .closed(false)
                    .message("Cannot close period: " + conflicts +
                             " day(s) have a check-in / leave conflict. Resolve them before closing.")
                    .build();
        }

        // Step 2b — unexplained absences require force-close acknowledgement
        List<UnexplainedAbsenceDto> absences = checkForUnexplainedAbsences(req.getYear(), req.getMonth());
        if (!absences.isEmpty() && !req.isForceClose()) {
            return PeriodCloseResponse.builder()
                    .year(req.getYear())
                    .month(req.getMonth())
                    .closed(false)
                    .unexplainedAbsences(absences)
                    .message("Cannot close period: " + absences.size() +
                             " employees have unexplained absences. Set forceClose=true to acknowledge as unpaid leave.")
                    .build();
        }

        // Step 3 — lock WorkDays, record the close, and build the monthly timesheets
        AttendancePeriodClose close = AttendancePeriodClose.builder()
                .id(UUID.randomUUID().toString())
                .closeYear(req.getYear())
                .closeMonth(req.getMonth())
                .closedBy(closedByUsername)
                .closedAt(LocalDateTime.now())
                .notes(req.getNotes())
                .build();
        periodCloseRepository.save(close);

        workDayService.lockPeriod(from, to);
        timesheetService.buildForPeriod(req.getYear(), req.getMonth());

        return PeriodCloseResponse.builder()
                .id(close.getId())
                .year(close.getCloseYear())
                .month(close.getCloseMonth())
                .closedBy(close.getClosedBy())
                .closedAt(close.getClosedAt())
                .notes(close.getNotes())
                .closed(true)
                .unexplainedAbsences(absences)
                .message("Attendance period closed successfully.")
                .build();
    }

    public boolean isPeriodClosed(int year, int month) {
        return periodCloseRepository.existsByCloseYearAndCloseMonth(year, month);
    }

    public List<UnexplainedAbsenceDto> checkForUnexplainedAbsences(int year, int month) {
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to   = YearMonth.of(year, month).atEndOfMonth();

        // Get public holiday dates for the period
        Set<LocalDate> holidays = publicHolidayRepository.findHolidayDatesBetween(from, to);

        // Get all working days in the period (Mon–Fri, excluding holidays)
        List<LocalDate> workingDays = new ArrayList<>();
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            DayOfWeek dow = cursor.getDayOfWeek();
            if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY && !holidays.contains(cursor)) {
                workingDays.add(cursor);
            }
            cursor = cursor.plusDays(1);
        }

        // Load active employees
        List<EmployeeInfo> activeEmployees = employeeInfoRepository.findByStatusAndDeleteFlagFalseAndRoleNot(
                org.dummy.facez.common.enums.EmployeeStatus.ACTIVE, org.dummy.facez.common.enums.Role.SYSTEM_ADMIN);

        List<UnexplainedAbsenceDto> result = new ArrayList<>();

        for (EmployeeInfo emp : activeEmployees) {
            // Find days with attendance
            Set<LocalDate> attendedDays = attendanceRepository
                    .findByEmployeeAndDateRange(emp.getEmployeeId(), from, to)
                    .stream()
                    .map(a -> a.getAttendanceDate())
                    .collect(Collectors.toSet());

            // Find days with approved leave
            Set<LocalDate> leaveDays = new HashSet<>();
            leaveRequestRepository
                    .findByEmployeeInfo_EmployeeIdAndStatus(emp.getEmployeeId(), RequestStatus.APPROVED)
                    .forEach(lr -> {
                        LocalDate leaveFrom = lr.getStartTime().toLocalDate();
                        LocalDate leaveTo   = lr.getEndTime().toLocalDate();
                        LocalDate d = leaveFrom;
                        while (!d.isAfter(leaveTo)) {
                            if (!d.isBefore(from) && !d.isAfter(to)) leaveDays.add(d);
                            d = d.plusDays(1);
                        }
                    });

            // Find unexplained working days (no attendance and no leave)
            List<LocalDate> missing = workingDays.stream()
                    .filter(d -> !attendedDays.contains(d) && !leaveDays.contains(d) && !holidays.contains(d))
                    .collect(Collectors.toList());

            if (!missing.isEmpty()) {
                result.add(UnexplainedAbsenceDto.builder()
                        .employeeId(emp.getEmployeeId())
                        .employeeName(emp.getName())
                        .missingDates(missing)
                        .build());
            }
        }
        return result;
    }
}
