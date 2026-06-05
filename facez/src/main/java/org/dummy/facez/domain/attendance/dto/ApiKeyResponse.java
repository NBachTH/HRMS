package org.dummy.facez.domain.attendance.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ApiKeyResponse {
    private String keyId;
    private String deviceId;
    private String rawKey;
    private String message;
}
