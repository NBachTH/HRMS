package org.dummy.facez.domain.payroll.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Create payload for an allowance config draft. */
@Data
public class AllowanceConfigRequest {

    @NotNull
    private LocalDate effectiveFrom;

    private String legalBasis;
    private boolean livingProrated = true;
    private boolean japaneseProrated = false;
    private Integer japaneseMinContractMonths;

    @NotNull
    private List<LivingLevel> levels = new ArrayList<>();

    private List<JapaneseLevel> japaneseLevels = new ArrayList<>();

    // Rule lists (kind values stored verbatim).
    private List<String> livingEligibleContracts = new ArrayList<>();
    private List<String> japaneseEligibleContracts = new ArrayList<>();
    private List<String> japaneseExcludedPositions = new ArrayList<>();
    private List<String> japaneseExcludedLevels = new ArrayList<>();

    @Data
    public static class LivingLevel {
        private String levelKey;
        private long meal;
        private long phone;
        private long transport;
        private long housing;
    }

    @Data
    public static class JapaneseLevel {
        private String jlptLevel;
        private long amount;
    }
}
