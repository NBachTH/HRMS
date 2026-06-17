package org.dummy.facez.domain.payroll.controller;

import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.domain.payroll.dto.SystemConfigResponse;
import org.dummy.facez.domain.payroll.service.SystemConfigService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * DEPRECATED, read-only. The legacy JSONB {@code system_config} records are exposed for
 * reference/rollback only. Payroll configuration is now managed via {@code PayrollConfigController}
 * ({@code /api/payroll-configs}). All mutation endpoints have been removed.
 */
@RestController
@RequestMapping("/api/system-configs")
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
    @PreAuthorize("hasAnyAuthority('FINANCE_ADMIN','DIRECTOR')")
    public ResponseEntity<ApiResponse<List<SystemConfigResponse>>> list(
            @RequestParam("type") String configType) {
        return ResponseEntity.ok(ApiResponse.ok(service.listByType(configType)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('FINANCE_ADMIN','DIRECTOR')")
    public ResponseEntity<ApiResponse<SystemConfigResponse>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id)));
    }
}
