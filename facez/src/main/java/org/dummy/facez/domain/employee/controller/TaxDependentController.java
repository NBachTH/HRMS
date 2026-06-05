package org.dummy.facez.domain.employee.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.domain.employee.dto.TaxDependentRequest;
import org.dummy.facez.domain.employee.dto.TaxDependentResponse;
import org.dummy.facez.domain.employee.service.TaxDependentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tax-dependents")
@RequiredArgsConstructor
public class TaxDependentController {

    private final TaxDependentService taxDependentService;

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<List<TaxDependentResponse>>> getByEmployee(@PathVariable String employeeId) {
        return ResponseEntity.ok(ApiResponse.ok(taxDependentService.getByEmployee(employeeId)));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<TaxDependentResponse>> create(@Valid @RequestBody TaxDependentRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(taxDependentService.create(req), "Tax dependent created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<TaxDependentResponse>> update(@PathVariable String id,
            @Valid @RequestBody TaxDependentRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(taxDependentService.update(id, req), "Tax dependent updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        taxDependentService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Tax dependent deactivated"));
    }
}
