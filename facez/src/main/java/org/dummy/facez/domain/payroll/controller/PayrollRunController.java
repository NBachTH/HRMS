package org.dummy.facez.domain.payroll.controller;

import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.domain.payroll.dto.PayrollResponse;
import org.dummy.facez.domain.payroll.dto.PayrollRunResponse;
import org.dummy.facez.domain.payroll.service.PayrollRunService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payroll-runs")
public class PayrollRunController {

    private final PayrollRunService payrollRunService;

    public PayrollRunController(PayrollRunService payrollRunService) {
        this.payrollRunService = payrollRunService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('FINANCE_ADMIN','DIRECTOR','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<List<PayrollRunResponse>>> getRuns() {
        return ResponseEntity.ok(ApiResponse.ok(payrollRunService.getRuns()));
    }

    @GetMapping("/{id}/lines")
    @PreAuthorize("hasAnyAuthority('FINANCE_ADMIN','DIRECTOR','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<List<PayrollResponse>>> getLines(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(payrollRunService.getRunLines(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollRunResponse>> create(@RequestBody Map<String, Integer> body) {
        PayrollRunResponse res = payrollRunService.createRun(body.get("year"), body.get("month"));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(res, "Payroll run created"));
    }

    @PostMapping("/{id}/recalc")
    @PreAuthorize("hasAnyAuthority('FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollRunResponse>> recalcRun(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(payrollRunService.recalcRun(id), "Run recalculated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteRun(@PathVariable String id) {
        payrollRunService.deleteRun(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Payroll run deleted"));
    }

    @PostMapping("/{id}/recalc/{employeeId}")
    @PreAuthorize("hasAnyAuthority('FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollRunResponse>> recalcLine(
            @PathVariable String id, @PathVariable String employeeId) {
        return ResponseEntity.ok(ApiResponse.ok(payrollRunService.recalcLine(id, employeeId), "Line recalculated"));
    }

    @PostMapping("/{id}/exclude/{employeeId}")
    @PreAuthorize("hasAnyAuthority('FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollRunResponse>> excludeLine(
            @PathVariable String id, @PathVariable String employeeId,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(ApiResponse.ok(payrollRunService.excludeLine(id, employeeId, reason), "Line excluded"));
    }

    @PutMapping("/{id}/submit")
    @PreAuthorize("hasAnyAuthority('FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollRunResponse>> submit(@PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(payrollRunService.submit(id, username(auth)), "Run submitted"));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('DIRECTOR','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollRunResponse>> approve(@PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(payrollRunService.approve(id, username(auth)), "Run approved"));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('DIRECTOR','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollRunResponse>> reject(
            @PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok(
                payrollRunService.reject(id, body != null ? body.get("reason") : null), "Run rejected"));
    }

    @PutMapping("/{id}/mark-paid")
    @PreAuthorize("hasAnyAuthority('FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollRunResponse>> markPaid(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(payrollRunService.markPaid(id), "Run marked paid"));
    }

    private static String username(Authentication auth) {
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
