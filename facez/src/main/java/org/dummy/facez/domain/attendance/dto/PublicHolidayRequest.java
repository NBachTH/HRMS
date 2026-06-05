package org.dummy.facez.domain.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class PublicHolidayRequest {
    @NotNull
    private LocalDate holidayDate;
    @NotBlank
    private String name;
    private boolean compensatoryDay = false;
}
