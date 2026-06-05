package org.dummy.facez.domain.contract.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ContractRequest {
    @NotBlank(message = "Employee ID is required")
    private String employeeId;

    @NotBlank(message = "Contract type is required")
    private String contractType;

    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate effectiveFrom;
    private String terms;
    private String salaryRank;
    private String status;
    private Long baseSalary;
    private Long insuranceBase;
    private String positionCode;
    private Integer salaryStep;
    private Integer dependentCount;
}
