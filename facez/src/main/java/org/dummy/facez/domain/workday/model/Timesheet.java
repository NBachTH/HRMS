package org.dummy.facez.domain.workday.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.model.AuditableEntity;
import org.dummy.facez.domain.employee.model.EmployeeInfo;

import java.math.BigDecimal;

/**
 * Monthly aggregate of an employee's WorkDays, produced when HR closes the period.
 * Mirrors the VMS "Payroll Employee Timesheet" report.
 */
@Entity
@Table(name = "timesheet",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_timesheet_employee_period", columnNames = {"employee_id", "ts_year", "ts_month"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Timesheet extends AuditableEntity {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeInfo employeeInfo;

    @Column(name = "ts_year", nullable = false)
    private int year;

    @Column(name = "ts_month", nullable = false)
    private int month;

    // ── Working days ───────────────────────────────────────────────────────────
    private int standardWorkingDays;          // Ngày công chuẩn
    private BigDecimal actualWorkingDays;      // Tổng ngày công thực tế (PRESENT)
    private BigDecimal otHours;                // Tổng giờ OT trong tháng

    // ── Leave breakdown (paid days by leave type) ──────────────────────────────
    private BigDecimal holidayLeaveDays;       // Nghỉ lễ / bù nghỉ lễ
    private BigDecimal annualLeaveDays;        // Nghỉ phép
    private BigDecimal compLeaveDays;          // Nghỉ bù
    private BigDecimal bereavementMarriageDays;// Nghỉ hiếu/hỉ
    private BigDecimal insuranceLeaveDays;     // Nghỉ hưởng chế độ bảo hiểm
    private BigDecimal unpaidLeaveDays;        // Nghỉ không hưởng lương

    // ── Paid-day totals ────────────────────────────────────────────────────────
    private BigDecimal oldRatePaidDays;        // Ngày công hưởng lương cũ
    private BigDecimal newRatePaidDays;        // Ngày công hưởng lương mới
    private BigDecimal totalPaidDays;          // Tổng công hưởng lương tháng
    private BigDecimal carryOverPrevMonth;     // Bù ngày công tháng trước
    private BigDecimal businessGoOutDays;      // Business go out
    private BigDecimal wfhDays;                // WFH
    private BigDecimal unexplainedAbsenceDays; // Nghỉ không lí do

    // ── Violation details ──────────────────────────────────────────────────────
    private BigDecimal lateEarlyTotalHours;    // Tổng thời gian đi muộn/về sớm (giờ)
    private BigDecimal violationToComp;         // quy đổi ra nghỉ bù
    private BigDecimal violationToLeave;        // quy đổi ra nghỉ phép
    private BigDecimal violationToUnpaid;       // quy đổi ra nghỉ không lương

    // ── Violation totals ───────────────────────────────────────────────────────
    private int unnotifiedAbsenceCount;        // Nghỉ làm không thông báo
    private int under8hCount;                  // Vi phạm thời gian làm việc không đủ 8h
    private int attendanceRequestErrors;       // Lỗi log Attendance Request quá 4 lần
    private long kpi2Deduction;                // Trừ lương KPI2
    private BigDecimal kpi2Index;              // Chỉ số KPI2
    private BigDecimal prevMonthViolationAdjust;// Bù/trừ vi phạm chấm công tháng trước

    @Column(length = 1000)
    private String notes;
}
