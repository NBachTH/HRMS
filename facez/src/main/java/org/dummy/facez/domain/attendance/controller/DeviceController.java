package org.dummy.facez.domain.attendance.controller;

import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.domain.attendance.dto.ApiKeyResponse;
import org.dummy.facez.domain.attendance.service.ApiKeyService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    private final ApiKeyService apiKeyService;

    public DeviceController(ApiKeyService apiKeyService) {
        this.apiKeyService = apiKeyService;
    }

    @PostMapping("/{deviceId}/api-key")
    @PreAuthorize("hasAuthority('SYSTEM_ADMIN') or hasAuthority('HR_ADMIN')")
    public ResponseEntity<ApiResponse<ApiKeyResponse>> generateApiKey(@PathVariable String deviceId) {
        return ResponseEntity.ok(ApiResponse.ok(
                apiKeyService.generateApiKey(deviceId),
                "API key generated. Store the rawKey securely — it will not be shown again."));
    }
}
