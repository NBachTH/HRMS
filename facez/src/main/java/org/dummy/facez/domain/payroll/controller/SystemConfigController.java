package org.dummy.facez.domain.payroll.controller;

import jakarta.validation.Valid;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.domain.payroll.dto.SystemConfigRequest;
import org.dummy.facez.domain.payroll.dto.SystemConfigResponse;
import org.dummy.facez.domain.payroll.service.SystemConfigService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/system-configs")
@PreAuthorize("hasAuthority('SYSTEM_ADMIN')")
public class SystemConfigController {

    private final SystemConfigService service;

    public SystemConfigController(SystemConfigService service) {
        this.service = service;
    }

    /**
     * List all versions of a given config type.
     * ?type=SALARY_GRADE | ALLOWANCE | PIT | INSURANCE
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<SystemConfigResponse>>> list(
            @RequestParam("type") String configType) {
        return ResponseEntity.ok(ApiResponse.ok(service.listByType(configType)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SystemConfigResponse>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id)));
    }

    /**
     * Create a new (inactive) config version. Activate separately via PATCH /{id}/activate.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<SystemConfigResponse>> create(
            @Valid @RequestBody SystemConfigRequest req,
            Authentication authentication) {
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        SystemConfigResponse response = service.create(req, username);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Config created. Use PATCH /{id}/activate to make it active."));
    }

    /**
     * Activate a config version. Automatically deactivates the current active version
     * of the same type and reloads the in-memory payroll config cache.
     */
    @PatchMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<SystemConfigResponse>> activate(
            @PathVariable String id,
            Authentication authentication) {
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        return ResponseEntity.ok(ApiResponse.ok(service.activate(id, username), "Config activated and payroll cache reloaded."));
    }

    /** Delete an inactive config version. Active configs cannot be deleted. */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Config deleted."));
    }
}
