package org.dummy.facez.domain.payroll.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class PayrollBatchRequest {

    @Min(2020) @Max(2100)
    private int payrollYear;

    @Min(1) @Max(12)
    private int payrollMonth;

    /**
     * Standard working days for the period.
     * Defaults to {@link org.dummy.facez.domain.payroll.service.PayrollConfigService#DEFAULT_STANDARD_DAYS}
     * if omitted.
     */
    private Integer standardWorkingDays;

    /**
     * Default KPI1 rating applied to every employee in the batch.
     * A = 1.04, B = 1.00 (default), C = 0.98.
     * Individual employees can be recalculated with a different rating
     * via DELETE + POST /api/payrolls/calculate.
     */
    private String kpi1Rating = "B";
}
