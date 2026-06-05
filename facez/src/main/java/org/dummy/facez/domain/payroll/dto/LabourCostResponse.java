package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LabourCostResponse {
    private String period;
    private String departmentId;
    private String departmentName;
    private int headcount;
    private long totalGross;
    private long totalNetSalary;
    private long totalEmployeeInsurance;
    private long totalEmployerInsurance;
    private long totalPit;
    private long totalOtPay;
    private long totalEmploymentCost;
    private List<LabourCostItemResponse> byEmployee;
}
