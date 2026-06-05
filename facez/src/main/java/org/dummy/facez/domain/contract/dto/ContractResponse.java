package org.dummy.facez.domain.contract.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class ContractResponse {
    private String id;
    private String employeeId;
    private String employeeName;
    private String contractType;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private boolean current;
    private String terms;
    private String salaryRank;
    private String status;
    private Long baseSalary;
    private Long insuranceBase;
    private String positionCode;
    private Integer salaryStep;
    private Integer dependentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
