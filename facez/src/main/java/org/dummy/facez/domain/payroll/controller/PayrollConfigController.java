package org.dummy.facez.domain.payroll.controller;

import jakarta.validation.Valid;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.domain.payroll.dto.*;
import org.dummy.facez.domain.payroll.service.PayrollConfigAdminService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Typed, effective-dated payroll configuration management. Finance-owned, maker-checker:
 * <ul>
 *   <li>Read: FINANCE_ADMIN, DIRECTOR</li>
 *   <li>Create draft / delete draft: FINANCE_ADMIN</li>
 *   <li>Publish (goes live in payroll): DIRECTOR</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/payroll-configs")
public class PayrollConfigController {

    private static final String READ    = "hasAnyAuthority('FINANCE_ADMIN','DIRECTOR')";
    private static final String WRITE   = "hasAuthority('FINANCE_ADMIN')";
    private static final String PUBLISH = "hasAuthority('DIRECTOR')";

    private final PayrollConfigAdminService service;

    public PayrollConfigController(PayrollConfigAdminService service) {
        this.service = service;
    }

    // ── SALARY GRADE ───────────────────────────────────────────────────────────
    @GetMapping("/salary-grade")
    @PreAuthorize(READ)
    public ResponseEntity<ApiResponse<List<SalaryGradeConfigResponse>>> listSalaryGrade() {
        return ResponseEntity.ok(ApiResponse.ok(service.listSalaryGrade()));
    }

    @GetMapping("/salary-grade/{id}")
    @PreAuthorize(READ)
    public ResponseEntity<ApiResponse<SalaryGradeConfigResponse>> getSalaryGrade(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getSalaryGrade(id)));
    }

    @PostMapping("/salary-grade")
    @PreAuthorize(WRITE)
    public ResponseEntity<ApiResponse<SalaryGradeConfigResponse>> createSalaryGrade(
            @Valid @RequestBody SalaryGradeConfigRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.createSalaryGrade(req), "Draft created."));
    }

    @PatchMapping("/salary-grade/{id}/publish")
    @PreAuthorize(PUBLISH)
    public ResponseEntity<ApiResponse<SalaryGradeConfigResponse>> publishSalaryGrade(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.publishSalaryGrade(id), "Config published."));
    }

    @DeleteMapping("/salary-grade/{id}")
    @PreAuthorize(WRITE)
    public ResponseEntity<ApiResponse<Void>> deleteSalaryGrade(@PathVariable String id) {
        service.deleteSalaryGrade(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Draft deleted."));
    }

    // ── PIT ──────────────────────────────────────────────────────────────────
    @GetMapping("/pit")
    @PreAuthorize(READ)
    public ResponseEntity<ApiResponse<List<PitConfigResponse>>> listPit() {
        return ResponseEntity.ok(ApiResponse.ok(service.listPit()));
    }

    @GetMapping("/pit/{id}")
    @PreAuthorize(READ)
    public ResponseEntity<ApiResponse<PitConfigResponse>> getPit(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getPit(id)));
    }

    @PostMapping("/pit")
    @PreAuthorize(WRITE)
    public ResponseEntity<ApiResponse<PitConfigResponse>> createPit(@Valid @RequestBody PitConfigRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.createPit(req), "Draft created."));
    }

    @PatchMapping("/pit/{id}/publish")
    @PreAuthorize(PUBLISH)
    public ResponseEntity<ApiResponse<PitConfigResponse>> publishPit(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.publishPit(id), "Config published."));
    }

    @DeleteMapping("/pit/{id}")
    @PreAuthorize(WRITE)
    public ResponseEntity<ApiResponse<Void>> deletePit(@PathVariable String id) {
        service.deletePit(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Draft deleted."));
    }

    // ── INSURANCE ──────────────────────────────────────────────────────────────
    @GetMapping("/insurance")
    @PreAuthorize(READ)
    public ResponseEntity<ApiResponse<List<InsuranceConfigResponse>>> listInsurance() {
        return ResponseEntity.ok(ApiResponse.ok(service.listInsurance()));
    }

    @GetMapping("/insurance/{id}")
    @PreAuthorize(READ)
    public ResponseEntity<ApiResponse<InsuranceConfigResponse>> getInsurance(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getInsurance(id)));
    }

    @PostMapping("/insurance")
    @PreAuthorize(WRITE)
    public ResponseEntity<ApiResponse<InsuranceConfigResponse>> createInsurance(
            @Valid @RequestBody InsuranceConfigRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.createInsurance(req), "Draft created."));
    }

    @PatchMapping("/insurance/{id}/publish")
    @PreAuthorize(PUBLISH)
    public ResponseEntity<ApiResponse<InsuranceConfigResponse>> publishInsurance(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.publishInsurance(id), "Config published."));
    }

    @DeleteMapping("/insurance/{id}")
    @PreAuthorize(WRITE)
    public ResponseEntity<ApiResponse<Void>> deleteInsurance(@PathVariable String id) {
        service.deleteInsurance(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Draft deleted."));
    }

    // ── ALLOWANCE ──────────────────────────────────────────────────────────────
    @GetMapping("/allowance")
    @PreAuthorize(READ)
    public ResponseEntity<ApiResponse<List<AllowanceConfigResponse>>> listAllowance() {
        return ResponseEntity.ok(ApiResponse.ok(service.listAllowance()));
    }

    @GetMapping("/allowance/{id}")
    @PreAuthorize(READ)
    public ResponseEntity<ApiResponse<AllowanceConfigResponse>> getAllowance(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllowance(id)));
    }

    @PostMapping("/allowance")
    @PreAuthorize(WRITE)
    public ResponseEntity<ApiResponse<AllowanceConfigResponse>> createAllowance(
            @Valid @RequestBody AllowanceConfigRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.createAllowance(req), "Draft created."));
    }

    @PatchMapping("/allowance/{id}/publish")
    @PreAuthorize(PUBLISH)
    public ResponseEntity<ApiResponse<AllowanceConfigResponse>> publishAllowance(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.publishAllowance(id), "Config published."));
    }

    @DeleteMapping("/allowance/{id}")
    @PreAuthorize(WRITE)
    public ResponseEntity<ApiResponse<Void>> deleteAllowance(@PathVariable String id) {
        service.deleteAllowance(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Draft deleted."));
    }
}
