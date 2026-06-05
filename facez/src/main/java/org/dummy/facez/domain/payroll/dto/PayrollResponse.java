package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PayrollResponse {

    private String payrollId;
    private String employeeId;
    private String employeeName;
    private int payrollYear;
    private int payrollMonth;
    private String rejectionReason;

    // ── Earnings breakdown ────────────────────────────────────────────────────
    private long performanceSalary;
    private long positionCoefficient;
    private long livingAllowance;
    private long languageAllowance;
    private long odcAllowance;
    private double kpi1Score;
    private double kpi2Score;
    private double kpiAverage;
    private int actualWorkingDays;
    private int standardWorkingDays;
    private long otPay;
    private long bonus;
    private long baseGross;
    private long totalGross;

    // ── Deductions ────────────────────────────────────────────────────────────
    private long insuranceBase;
    private long bhxhEmployee;
    private long bhytEmployee;
    private long bhtnEmployee;
    private int dependentCount;
    private long taxableIncome;
    private long pit;

    // ── Net ───────────────────────────────────────────────────────────────────
    private long netSalary;

    // ── Employer contributions ────────────────────────────────────────────────
    private long bhxhEmployer;
    private long bhytEmployer;
    private long bhtnEmployer;
    private long workplaceAccidentInsurance;
    private long totalEmployerContributions;
    private long totalEmploymentCost;

    private String status;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
