package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PitConfigResponse {

    private String id;
    private LocalDate effectiveFrom;
    private String status;
    private String legalBasis;
    private String resolution;
    private long personalRelief;
    private long dependentRelief;
    private List<BracketItem> brackets;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    public static class BracketItem {
        private int seq;
        private long incomeFrom;
        private Long incomeTo;
        private double rate;
        private long quickDeduction;
    }
}
