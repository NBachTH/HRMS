package org.dummy.facez.domain.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DeviceCreateRequest {

    @NotBlank(message = "Device name is required")
    private String deviceName;

    private String location;

    /** IN or OUT; defaults to IN when omitted. */
    private String logType;
}
