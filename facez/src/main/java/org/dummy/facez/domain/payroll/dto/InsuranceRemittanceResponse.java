package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class InsuranceRemittanceResponse {
    private String period;
    private int headcount;
    private long totalEmployeeInsurance;
    private long totalEmployerInsurance;
    private long grandTotal;
    private List<InsuranceRemittanceItemResponse> items;
}
