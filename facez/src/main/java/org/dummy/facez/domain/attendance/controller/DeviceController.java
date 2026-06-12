package org.dummy.facez.domain.attendance.controller;

import jakarta.validation.Valid;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.domain.attendance.dto.ApiKeyResponse;
import org.dummy.facez.domain.attendance.dto.DeviceCreateRequest;
import org.dummy.facez.domain.attendance.dto.DeviceResponse;
import org.dummy.facez.domain.attendance.service.ApiKeyService;
import org.dummy.facez.domain.attendance.service.DeviceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/devices")
@PreAuthorize("hasAnyAuthority('HR_ADMIN','SYSTEM_ADMIN')")
public class DeviceController {

    private final DeviceService deviceService;
    private final ApiKeyService apiKeyService;

    public DeviceController(DeviceService deviceService, ApiKeyService apiKeyService) {
        this.deviceService = deviceService;
        this.apiKeyService = apiKeyService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DeviceResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(deviceService.getAll()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DeviceResponse>> create(@Valid @RequestBody DeviceCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(deviceService.create(req), "Device created"));
    }

    @DeleteMapping("/{deviceId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String deviceId) {
        deviceService.delete(deviceId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Device deleted"));
    }

    @PostMapping("/{deviceId}/api-keys")
    public ResponseEntity<ApiResponse<ApiKeyResponse>> generateApiKey(@PathVariable String deviceId) {
        return ResponseEntity.ok(ApiResponse.ok(
                apiKeyService.generateApiKey(deviceId),
                "API key generated. Store the rawKey securely — it will not be shown again."));
    }

    @PatchMapping("/{deviceId}/api-keys/{keyId}/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivateApiKey(
            @PathVariable String deviceId, @PathVariable String keyId) {
        apiKeyService.deactivate(keyId);
        return ResponseEntity.ok(ApiResponse.ok(null, "API key deactivated"));
    }
}
