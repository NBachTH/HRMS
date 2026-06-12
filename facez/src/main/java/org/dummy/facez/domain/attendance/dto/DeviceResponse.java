package org.dummy.facez.domain.attendance.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DeviceResponse {
    private String deviceId;
    private String deviceName;
    private String location;
    private String logType;
    private boolean active;
    private boolean apiKeyActive;
    private LocalDateTime createdAt;
}
