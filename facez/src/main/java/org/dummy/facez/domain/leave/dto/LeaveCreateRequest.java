package org.dummy.facez.domain.leave.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.dummy.facez.common.enums.LeaveType;

import java.time.LocalDateTime;

@Data
public class LeaveCreateRequest {
    /** Set server-side from the JWT principal — not required from the client. */
    private String employeeId;

    @NotNull(message = "Leave type is required")
    private LeaveType leaveType;

    @NotBlank(message = "Reason is required")
    private String reason;

    @NotNull(message = "Start time is required")
    private LocalDateTime startTime;

    @NotNull(message = "End time is required")
    private LocalDateTime endTime;

    /** Half-day leave (0.5 working day). Only meaningful for a single-day range. */
    private boolean halfDay;
}
