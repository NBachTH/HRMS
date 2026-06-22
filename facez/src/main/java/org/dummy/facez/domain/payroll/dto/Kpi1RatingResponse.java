package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class Kpi1RatingResponse {
    private String id;
    private String employeeId;
    private String employeeName;
    private int year;
    private int month;
    private String rating;
    private String evaluatorId;
    private String note;
}
