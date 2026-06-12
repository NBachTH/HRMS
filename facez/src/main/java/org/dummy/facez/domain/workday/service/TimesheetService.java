package org.dummy.facez.domain.workday.service;

import org.dummy.facez.common.enums.EmployeeStatus;
import org.dummy.facez.common.enums.LeaveType;
import org.dummy.facez.common.enums.WorkDayType;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.domain.attendance.repository.PublicHolidayRepository;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.dummy.facez.domain.workday.dto.TimesheetResponse;
import org.dummy.facez.domain.workday.model.Timesheet;
import org.dummy.facez.domain.workday.model.WorkDay;
import org.dummy.facez.domain.workday.repository.TimesheetRepository;
import org.dummy.facez.domain.workday.repository.WorkDayRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class TimesheetService {

    private static final BigDecimal EIGHT = BigDecimal.valueOf(8);

    private final TimesheetRepository timesheetRepository;
    private final WorkDayRepository workDayRepository;
    private final EmployeeInfoRepository employeeInfoRepository;
    private final PublicHolidayRepository publicHolidayRepository;

    public TimesheetService(TimesheetRepository timesheetRepository,
                            WorkDayRepository workDayRepository,
                            EmployeeInfoRepository employeeInfoRepository,
                            PublicHolidayRepository publicHolidayRepository) {
        this.timesheetRepository = timesheetRepository;
        this.workDayRepository = workDayRepository;
        this.employeeInfoRepository = employeeInfoRepository;
        this.publicHolidayRepository = publicHolidayRepository;
    }

    /** Rebuild monthly timesheets for all active employees from their locked WorkDays. */
    @Transactional
    public void buildForPeriod(int year, int month) {
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to   = YearMonth.of(year, month).atEndOfMonth();
        int standardDays = countStandardWorkingDays(from, to);

        timesheetRepository.deleteByYearAndMonth(year, month);

        for (EmployeeInfo emp : employeeInfoRepository.findByStatusAndDeleteFlagFalseAndRoleNot(
                EmployeeStatus.ACTIVE, org.dummy.facez.common.enums.Role.SYSTEM_ADMIN)) {
            List<WorkDay> days = workDayRepository
                    .findByEmployeeInfo_EmployeeIdAndWorkDateBetween(emp.getEmployeeId(), from, to);
            timesheetRepository.save(aggregate(emp, year, month, standardDays, days));
        }
    }

    public TimesheetResponse getForEmployee(String employeeId, int year, int month) {
        Timesheet ts = timesheetRepository.findByEmployeeInfo_EmployeeIdAndYearAndMonth(employeeId, year, month)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet", "employee/period",
                        employeeId + " " + month + "/" + year));
        return toResponse(ts);
    }

    public List<TimesheetResponse> getForPeriod(int year, int month) {
        return timesheetRepository.findByYearAndMonth(year, month).stream().map(this::toResponse).toList();
    }

    public List<TimesheetResponse> getAllForEmployee(String employeeId) {
        return timesheetRepository.findByEmployeeInfo_EmployeeIdOrderByYearDescMonthDesc(employeeId)
                .stream().map(this::toResponse).toList();
    }

    // ── Aggregation ─────────────────────────────────────────────────────────────

    private Timesheet aggregate(EmployeeInfo emp, int year, int month, int standardDays, List<WorkDay> days) {
        BigDecimal actual = BigDecimal.ZERO, holiday = BigDecimal.ZERO, totalPaid = BigDecimal.ZERO;
        BigDecimal annual = BigDecimal.ZERO, comp = BigDecimal.ZERO, bereave = BigDecimal.ZERO;
        BigDecimal insurance = BigDecimal.ZERO, unpaid = BigDecimal.ZERO, lateEarly = BigDecimal.ZERO;
        int unnotified = 0, under8h = 0, otMinutes = 0;

        for (WorkDay wd : days) {
            BigDecimal paid = wd.getPaidDay() != null ? wd.getPaidDay() : BigDecimal.ZERO;
            totalPaid = totalPaid.add(paid);
            lateEarly = lateEarly.add(wd.getLateHour() != null ? wd.getLateHour() : BigDecimal.ZERO);
            otMinutes += wd.getOtMinutes();

            switch (wd.getType()) {
                case PRESENT, HOLIDAY_WORK -> {
                    actual = actual.add(paid);
                    if (wd.getWorkingHour() != null && wd.getWorkingHour().compareTo(EIGHT) < 0) under8h++;
                }
                case HOLIDAY -> holiday = holiday.add(BigDecimal.ONE);
                case ABSENT -> unnotified++;
                case LEAVE -> {
                    LeaveType lt = wd.getLeaveType();
                    if (lt == null) annual = annual.add(BigDecimal.ONE);
                    else switch (lt) {
                        case ANNUAL -> annual = annual.add(BigDecimal.ONE);
                        case COMPENSATORY -> comp = comp.add(BigDecimal.ONE);
                        case BEREAVEMENT, MARRIAGE -> bereave = bereave.add(BigDecimal.ONE);
                        case SICK, MATERNITY, PATERNITY -> insurance = insurance.add(BigDecimal.ONE);
                        case UNPAID -> unpaid = unpaid.add(BigDecimal.ONE);
                        default -> annual = annual.add(BigDecimal.ONE);
                    }
                }
            }
        }

        return Timesheet.builder()
                .id(UUID.randomUUID().toString())
                .employeeInfo(emp)
                .year(year)
                .month(month)
                .standardWorkingDays(standardDays)
                .actualWorkingDays(actual)
                .otHours(BigDecimal.valueOf(otMinutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP))
                .holidayLeaveDays(holiday)
                .annualLeaveDays(annual)
                .compLeaveDays(comp)
                .bereavementMarriageDays(bereave)
                .insuranceLeaveDays(insurance)
                .unpaidLeaveDays(unpaid)
                .oldRatePaidDays(BigDecimal.ZERO)
                .newRatePaidDays(totalPaid)
                .totalPaidDays(totalPaid)
                .carryOverPrevMonth(BigDecimal.ZERO)
                .businessGoOutDays(BigDecimal.ZERO)
                .wfhDays(BigDecimal.ZERO)
                .unexplainedAbsenceDays(BigDecimal.valueOf(unnotified))
                .lateEarlyTotalHours(lateEarly)
                .violationToComp(BigDecimal.ZERO)
                .violationToLeave(BigDecimal.ZERO)
                .violationToUnpaid(BigDecimal.ZERO)
                .unnotifiedAbsenceCount(unnotified)
                .under8hCount(under8h)
                .attendanceRequestErrors(0)
                .kpi2Deduction(0)
                .kpi2Index(BigDecimal.ONE)   // policy-driven; refine with a violation→KPI2 rule
                .prevMonthViolationAdjust(BigDecimal.ZERO)
                .build();
    }

    private int countStandardWorkingDays(LocalDate from, LocalDate to) {
        Set<LocalDate> holidays = publicHolidayRepository.findHolidayDatesBetween(from, to);
        int count = 0;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            DayOfWeek dow = d.getDayOfWeek();
            if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY && !holidays.contains(d)) count++;
        }
        return count;
    }

    private TimesheetResponse toResponse(Timesheet t) {
        return TimesheetResponse.builder()
                .id(t.getId())
                .employeeId(t.getEmployeeInfo() != null ? t.getEmployeeInfo().getEmployeeId() : null)
                .employeeName(t.getEmployeeInfo() != null ? t.getEmployeeInfo().getName() : null)
                .departmentId(t.getEmployeeInfo() != null && t.getEmployeeInfo().getDepartment() != null
                        ? t.getEmployeeInfo().getDepartment().getDepartmentId() : null)
                .year(t.getYear()).month(t.getMonth())
                .standardWorkingDays(t.getStandardWorkingDays())
                .actualWorkingDays(t.getActualWorkingDays())
                .otHours(t.getOtHours())
                .holidayLeaveDays(t.getHolidayLeaveDays())
                .annualLeaveDays(t.getAnnualLeaveDays())
                .compLeaveDays(t.getCompLeaveDays())
                .bereavementMarriageDays(t.getBereavementMarriageDays())
                .insuranceLeaveDays(t.getInsuranceLeaveDays())
                .unpaidLeaveDays(t.getUnpaidLeaveDays())
                .oldRatePaidDays(t.getOldRatePaidDays())
                .newRatePaidDays(t.getNewRatePaidDays())
                .totalPaidDays(t.getTotalPaidDays())
                .carryOverPrevMonth(t.getCarryOverPrevMonth())
                .businessGoOutDays(t.getBusinessGoOutDays())
                .wfhDays(t.getWfhDays())
                .unexplainedAbsenceDays(t.getUnexplainedAbsenceDays())
                .lateEarlyTotalHours(t.getLateEarlyTotalHours())
                .violationToComp(t.getViolationToComp())
                .violationToLeave(t.getViolationToLeave())
                .violationToUnpaid(t.getViolationToUnpaid())
                .unnotifiedAbsenceCount(t.getUnnotifiedAbsenceCount())
                .under8hCount(t.getUnder8hCount())
                .attendanceRequestErrors(t.getAttendanceRequestErrors())
                .kpi2Deduction(t.getKpi2Deduction())
                .kpi2Index(t.getKpi2Index())
                .prevMonthViolationAdjust(t.getPrevMonthViolationAdjust())
                .notes(t.getNotes())
                .build();
    }
}
