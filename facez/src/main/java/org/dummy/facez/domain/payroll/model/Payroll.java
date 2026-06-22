package org.dummy.facez.domain.payroll.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.enums.PayrollStatus;
import org.dummy.facez.common.model.AuditableEntity;
import org.dummy.facez.domain.employee.model.EmployeeInfo;

import java.time.LocalDateTime;

/**
 * Monthly payroll record for one employee.
 * Stores every intermediate value so the payslip can be fully reconstructed.
 *
 * Formula:
 *   GROSS  = [(Lhq × KPItb) + Li + HTi] × (NCtt / Nt) + OT_Pay + Bonus
 *   NET    = GROSS − BHXH − BHYT − BHTN − PIT
 */
@Entity
@Table(name = "payroll",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_payroll_employee_period",
                columnNames = {"employee_id", "payroll_year", "payroll_month"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payroll extends AuditableEntity {

    @Id
    @Column(length = 64)
    private String payrollId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", referencedColumnName = "employee_id", nullable = false)
    private EmployeeInfo employeeInfo;

    @Column(nullable = false)
    private int payrollYear;

    @Column(nullable = false)
    private int payrollMonth;

    // ── Gross inputs ──────────────────────────────────────────────────────────

    /** Lhq — performance/contract salary (VND) */
    private long performanceSalary;

    /** Li — position coefficient amount (VND), looked up from salary grade JSON */
    private long positionCoefficient;

    /** HT2 — prorated living allowance (VND) */
    private long livingAllowance;

    /** HT1 — Japanese language allowance (VND), not prorated */
    private long languageAllowance;

    /** HT3 — ODC project allowance (VND), not prorated */
    private long odcAllowance;

    /** KPI1 multiplier (0.98, 1.00, or 1.04) */
    @Column(name = "kpi1score")
    private double kpi1Score;

    /** KPI2 multiplier (1.00, 1.02, or 1.04) */
    @Column(name = "kpi2score")
    private double kpi2Score;

    /** KPItb = (KPI1 + KPI2) / 2 */
    private double kpiAverage;

    /** NCtt — actual paid working days counted for this month */
    private int actualWorkingDays;

    /** Nt — standard working days in the month (system config, typically 26) */
    private int standardWorkingDays;

    /** Approved OT pay (VND) */
    private long otPay;

    /** OT hour breakdown (for the payslip). Night hours overlap with the other three. */
    @Column(name = "ot_weekday_hours")
    private double otWeekdayHours;
    @Column(name = "ot_weekend_hours")
    private double otWeekendHours;
    @Column(name = "ot_holiday_hours")
    private double otHolidayHours;
    @Column(name = "ot_night_hours")
    private double otNightHours;

    /** Variable bonus for the month (VND) */
    private long bonus;

    // ── Computed gross ────────────────────────────────────────────────────────

    /** [(Lhq × KPItb) + Li + HTi] × (NCtt / Nt) */
    private long baseGross;

    /** baseGross + otPay + bonus */
    private long totalGross;

    // ── Insurance deductions (employee portion) ───────────────────────────────

    /** LCB — insurance base salary, capped at 46,800,000 VND */
    private long insuranceBase;

    /** BHXH employee = insuranceBase × 8% */
    private long bhxhEmployee;

    /** BHYT employee = insuranceBase × 1.5% */
    private long bhytEmployee;

    /** BHTN employee = insuranceBase × 1% */
    private long bhtnEmployee;

    // ── PIT ──────────────────────────────────────────────────────────────────

    /** Number of registered dependents */
    private int dependentCount;

    /** Gross − insurance − personal relief − dependent relief */
    private long taxableIncome;

    /** Personal Income Tax per progressive brackets */
    private long pit;

    // ── Employer contributions ────────────────────────────────────────────────

    /** BHXH employer = cappedInsuranceBase × 17% */
    private long bhxhEmployer;

    /** BHYT employer = cappedInsuranceBase × 3% */
    private long bhytEmployer;

    /** BHTN employer = cappedInsuranceBase × 1% */
    private long bhtnEmployer;

    /** TNLĐ-BNN employer = cappedInsuranceBase × 0.5% */
    private long workplaceAccidentInsurance;

    /** Sum of all employer contributions */
    private long totalEmployerContributions;

    /** Total employment cost: totalGross + employer contributions */
    private long totalEmploymentCost;

    // ── Net ──────────────────────────────────────────────────────────────────

    /** totalGross − bhxhEmployee − bhytEmployee − bhtnEmployee − pit */
    private long netSalary;

    // ── Metadata ─────────────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PayrollStatus status;

    @Column(length = 500)
    private String rejectionReason;

    @Column(length = 500)
    private String notes;

    /** The payroll run (period) this line belongs to. */
    @Column(name = "payroll_run_id", length = 64)
    private String payrollRunId;

    /** Manually edited/recalculated lines are locked and skipped by a whole-period recalc. */
    @Column(nullable = false)
    @Builder.Default
    private boolean locked = false;

    // createdAt / updatedAt / createdBy / updatedBy are inherited from AuditableEntity.
}
