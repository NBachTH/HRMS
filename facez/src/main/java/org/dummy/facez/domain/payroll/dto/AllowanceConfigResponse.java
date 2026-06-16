package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AllowanceConfigResponse {

    private String id;
    private LocalDate effectiveFrom;
    private String status;
    private String legalBasis;
    private boolean livingProrated;
    private boolean japaneseProrated;
    private Integer japaneseMinContractMonths;
    private List<LivingLevel> levels;
    private List<JapaneseLevel> japaneseLevels;
    private List<String> livingEligibleContracts;
    private List<String> japaneseEligibleContracts;
    private List<String> japaneseExcludedPositions;
    private List<String> japaneseExcludedLevels;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    public static class LivingLevel {
        private String levelKey;
        private long meal;
        private long phone;
        private long transport;
        private long housing;
    }

    @Data
    @Builder
    public static class JapaneseLevel {
        private String jlptLevel;
        private long amount;
    }
}
