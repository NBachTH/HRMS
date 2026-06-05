package org.dummy.facez.domain.payroll.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class PayrollCalculateRequest {

    @NotBlank
    private String employeeId;

    @Min(2020) @Max(2100)
    private int payrollYear;

    @Min(1) @Max(12)
    private int payrollMonth;

    /**
     * KPI1 performance rating: A (1.04), B (1.00), C (0.98).
     * Defaults to B if omitted.
     */
    private String kpi1Rating = "B";

    /**
     * KPI2 attendance rating: A (1.04), B (1.02), C (1.00).
     * Auto-computed from attendance logs if omitted.
     */
    private String kpi2Rating;

    /** Optional override for standard working days (defaults to system config: 26). */
    private Integer standardWorkingDays;

    /** Manual bonus amount (VND). Defaults to 0. */
    @Min(0)
    private long bonus = 0;

    /**
     * Language allowance tier for HT1 Japanese allowance.
     * Values: N1, N2, or null/empty for no allowance.
     */
    private String japaneseLevel;

    /**
     * ODC project allowance amount (VND) if employee is on ODC project.
     * Defaults to 0.
     */
    @Min(0)
    private long odcAllowance = 0;

    /** Free-text notes to attach to the payroll record. */
    private String notes;
}
