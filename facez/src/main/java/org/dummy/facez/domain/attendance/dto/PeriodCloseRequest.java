package org.dummy.facez.domain.attendance.dto;

import lombok.Data;

@Data
public class PeriodCloseRequest {
    private int year;
    private int month;
    private String notes;
    private boolean forceClose = false;
}
