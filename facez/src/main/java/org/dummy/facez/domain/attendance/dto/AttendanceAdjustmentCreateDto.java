package org.dummy.facez.domain.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class AttendanceAdjustmentCreateDto {

    /** Set server-side from the JWT principal — not required from the client. */
    private String employeeId;

    @NotNull(message = "Work date is required")
    private LocalDate workDate;

    private LocalDateTime requestedCheckIn;
    private LocalDateTime requestedCheckOut;

    @NotBlank(message = "Reason is required")
    private String reason;
}
