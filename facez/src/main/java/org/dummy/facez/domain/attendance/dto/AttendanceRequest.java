package org.dummy.facez.domain.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AttendanceRequest {
    @NotBlank(message = "Employee ID is required")
    private String employeeId;

    @NotNull(message = "Check-in time is required")
    private LocalDateTime checkIn;

    private LocalDateTime checkOut;
}
