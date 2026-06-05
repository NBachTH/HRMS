package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LabourCostItemResponse {
    private String employeeId;
    private String employeeName;
    private long totalGross;
    private long netSalary;
    private long totalEmployeeInsurance;
    private long totalEmployerInsurance;
    private long pit;
    private long otPay;
    private long totalEmploymentCost;
}
