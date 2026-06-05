package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PitSummaryItemResponse {
    private String employeeId;
    private String employeeName;
    private String taxCode;
    private int dependentCount;
    private long taxableIncome;
    private long pit;
}
