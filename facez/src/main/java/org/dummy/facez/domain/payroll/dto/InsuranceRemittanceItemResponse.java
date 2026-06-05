package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InsuranceRemittanceItemResponse {
    private String employeeId;
    private String employeeName;
    private String socialInsuranceCode;
    private long insuranceBase;
    private long bhxhEmployee;
    private long bhytEmployee;
    private long bhtnEmployee;
    private long totalEmployeeInsurance;
    private long bhxhEmployer;
    private long bhytEmployer;
    private long bhtnEmployer;
    private long workplaceAccidentInsurance;
    private long totalEmployerInsurance;
}
