package org.dummy.facez.domain.attendance.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PeriodCloseResponse {
    private String id;
    private int year;
    private int month;
    private String closedBy;
    private LocalDateTime closedAt;
    private String notes;
    private List<UnexplainedAbsenceDto> unexplainedAbsences;
    private boolean closed;
    private String message;
}
