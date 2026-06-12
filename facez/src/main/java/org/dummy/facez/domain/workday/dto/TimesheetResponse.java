package org.dummy.facez.domain.workday.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class TimesheetResponse {
    private String id;
    private String employeeId;
    private String employeeName;
    private String departmentId;
    private int year;
    private int month;

    private int standardWorkingDays;
    private BigDecimal actualWorkingDays;
    private BigDecimal otHours;

    private BigDecimal holidayLeaveDays;
    private BigDecimal annualLeaveDays;
    private BigDecimal compLeaveDays;
    private BigDecimal bereavementMarriageDays;
    private BigDecimal insuranceLeaveDays;
    private BigDecimal unpaidLeaveDays;

    private BigDecimal oldRatePaidDays;
    private BigDecimal newRatePaidDays;
    private BigDecimal totalPaidDays;
    private BigDecimal carryOverPrevMonth;
    private BigDecimal businessGoOutDays;
    private BigDecimal wfhDays;
    private BigDecimal unexplainedAbsenceDays;

    private BigDecimal lateEarlyTotalHours;
    private BigDecimal violationToComp;
    private BigDecimal violationToLeave;
    private BigDecimal violationToUnpaid;

    private int unnotifiedAbsenceCount;
    private int under8hCount;
    private int attendanceRequestErrors;
    private long kpi2Deduction;
    private BigDecimal kpi2Index;
    private BigDecimal prevMonthViolationAdjust;

    private String notes;
}
