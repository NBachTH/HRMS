package org.dummy.facez.auth.dtos;

import lombok.Data;

@Data
public class RefreshToken {
    private String jti;
    private String userId;
    private String username;
    private long expiry;
    private String deviceId;
    private boolean revoked;
}
