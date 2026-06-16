package org.dummy.facez.domain.payroll.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Create payload for an insurance config draft. */
@Data
public class InsuranceConfigRequest {

    @NotNull
    private LocalDate effectiveFrom;

    private String legalBasis;
    private Long governmentBaseSalary;
    private Long insuranceCeiling;
    private Long statutoryMinWage;

    @NotNull private Double eeBhxh;
    @NotNull private Double eeBhyt;
    @NotNull private Double eeBhtn;

    @NotNull private Double erBhxhPension;
    @NotNull private Double erBhxhSicknessMaternity;
    @NotNull private Double erBhxhAccident;
    @NotNull private Double erBhyt;
    @NotNull private Double erBhtn;

    private boolean probationExempt = true;

    private List<String> eligibleContractTypes = new ArrayList<>();
}
