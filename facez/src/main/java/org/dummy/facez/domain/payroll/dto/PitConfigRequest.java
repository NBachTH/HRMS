package org.dummy.facez.domain.payroll.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Create payload for a PIT config draft. */
@Data
public class PitConfigRequest {

    @NotNull
    private LocalDate effectiveFrom;

    private String legalBasis;
    private String resolution;

    @NotNull
    private Long personalRelief;

    @NotNull
    private Long dependentRelief;

    @NotNull
    private List<BracketItem> brackets = new ArrayList<>();

    @Data
    public static class BracketItem {
        private Long incomeFrom;
        /** null = open-ended top bracket. */
        private Long incomeTo;
        private Double rate;
        private Long quickDeduction;
    }
}
