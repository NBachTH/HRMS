package org.dummy.facez.domain.otrequest.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
public class OTPlanCreateDto {

    @NotNull(message = "OT date is required")
    private LocalDate otDate;

    private LocalTime plannedStartTime;

    private LocalTime plannedEndTime;

    private String departmentId;

    private String reason;

    @NotEmpty(message = "At least one employee is required")
    private List<String> employeeIds;
}
