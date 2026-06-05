package org.dummy.facez.domain.leave.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.dummy.facez.common.enums.LeaveType;

import java.time.LocalDateTime;

@Data
public class LeaveCreateRequest {
    @NotBlank(message = "Employee ID is required")
    private String employeeId;

    @NotNull(message = "Leave type is required")
    private LeaveType leaveType;

    @NotBlank(message = "Reason is required")
    private String reason;

    @NotNull(message = "Start time is required")
    private LocalDateTime startTime;

    @NotNull(message = "End time is required")
    private LocalDateTime endTime;
}
