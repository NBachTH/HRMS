package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class InsuranceConfigResponse {

    private String id;
    private LocalDate effectiveFrom;
    private String status;
    private String legalBasis;
    private Long governmentBaseSalary;
    private Long insuranceCeiling;
    private Long statutoryMinWage;
    private double eeBhxh;
    private double eeBhyt;
    private double eeBhtn;
    private double erBhxhPension;
    private double erBhxhSicknessMaternity;
    private double erBhxhAccident;
    private double erBhyt;
    private double erBhtn;
    private boolean probationExempt;
    private List<String> eligibleContractTypes;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
