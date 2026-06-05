package org.dummy.facez.domain.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.dummy.facez.common.enums.LogTypes;

import java.time.LocalDateTime;

@Data
public class CheckinLogRequest {

    @NotBlank(message = "Employee ID is required")
    private String employeeId;

    @NotBlank(message = "Device ID is required")
    private String deviceId;

    @NotNull(message = "Log time is required")
    private LocalDateTime logTime;

    @NotNull(message = "Log type is required")
    private LogTypes logType;
}
