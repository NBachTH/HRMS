package org.dummy.facez.domain.payroll.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class Kpi1RatingRequest {
    @NotBlank
    private String employeeId;
    @NotNull
    private Integer year;
    @NotNull
    private Integer month;
    /** A / B / C */
    @NotBlank
    private String rating;
    private String note;
}
