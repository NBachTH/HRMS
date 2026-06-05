package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PitSummaryResponse {
    private String period;
    private long totalPit;
    private List<PitSummaryItemResponse> items;
}
