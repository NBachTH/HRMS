package org.dummy.facez.domain.payroll.controller;

import jakarta.validation.Valid;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.domain.employee.model.UserAccount;
import org.dummy.facez.domain.payroll.dto.Kpi1RatingRequest;
import org.dummy.facez.domain.payroll.dto.Kpi1RatingResponse;
import org.dummy.facez.domain.payroll.service.Kpi1Service;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/kpi1")
public class Kpi1Controller {

    private final Kpi1Service kpi1Service;

    public Kpi1Controller(Kpi1Service kpi1Service) {
        this.kpi1Service = kpi1Service;
    }

    /**
     * Whoever manages a department may rate its staff (checked by Department.managerId in the service),
     * so HR/Finance department managers can rate even though their role is HR_ADMIN/FINANCE_ADMIN.
     * HR_ADMIN/SYSTEM_ADMIN are unrestricted. (LEADER/DIRECTOR do not rate HS1.)
     */
    @PutMapping
    @PreAuthorize("hasAnyAuthority('MANAGER','HR_ADMIN','FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<Kpi1RatingResponse>> upsert(
            @Valid @RequestBody Kpi1RatingRequest req, Authentication auth) {
        String evaluatorId = ((UserAccount) auth.getPrincipal()).getEmployeeId();
        return ResponseEntity.ok(ApiResponse.ok(
                kpi1Service.upsert(req, evaluatorId, isUnrestricted(auth)), "KPI1 saved"));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('MANAGER','HR_ADMIN','FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<List<Kpi1RatingResponse>>> getForPeriod(
            @RequestParam int year, @RequestParam int month) {
        return ResponseEntity.ok(ApiResponse.ok(kpi1Service.getForPeriod(year, month)));
    }

    /**
     * Only SYSTEM_ADMIN rates without a department restriction. Everyone else (incl. HR_ADMIN /
     * FINANCE_ADMIN) may rate only the departments they actually manage — so a non-manager HR_ADMIN
     * cannot rate other departments' staff.
     */
    private static boolean isUnrestricted(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("SYSTEM_ADMIN"));
    }
}
