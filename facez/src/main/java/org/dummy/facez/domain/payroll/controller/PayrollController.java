package org.dummy.facez.domain.payroll.controller;

import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.employee.service.EmployeeService;
import org.dummy.facez.domain.payroll.dto.*;
import org.dummy.facez.domain.payroll.service.PayrollReportService;
import org.dummy.facez.domain.payroll.service.PayrollService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * Read-only payroll API. The whole calculate / submit / approve / pay workflow now lives at the
 * period level in {@code PayrollRunController}; this controller only serves listing, the employee
 * self-service payslip, and the finance/director reports.
 */
@RestController
@RequestMapping("/api/payrolls")
public class PayrollController {

    private final PayrollService       payrollService;
    private final EmployeeService      employeeService;
    private final PayrollReportService reportService;

    public PayrollController(PayrollService payrollService,
                              EmployeeService employeeService,
                              PayrollReportService reportService) {
        this.payrollService  = payrollService;
        this.employeeService = employeeService;
        this.reportService   = reportService;
    }

    /** List all payroll records (paginated). */
    @GetMapping
    @PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('DIRECTOR')")
    public ResponseEntity<ApiResponse<PageResponse<PayrollResponse>>> getAll(
            @PageableDefault(size = 20, sort = "payrollYear", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(payrollService.getAll(pageable)));
    }

    /** List payroll records by period (year + month). */
    @GetMapping("/period")
    @PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('DIRECTOR')")
    public ResponseEntity<ApiResponse<PageResponse<PayrollResponse>>> getByPeriod(
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(payrollService.getByPeriod(year, month, pageable)));
    }

    /** List payroll records for a specific employee — HR/admin/manager only. */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('DIRECTOR')")
    public ResponseEntity<ApiResponse<PageResponse<PayrollResponse>>> getByEmployee(
            @PathVariable String employeeId,
            @PageableDefault(size = 20, sort = "payrollYear", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(payrollService.getByEmployee(employeeId, pageable)));
    }

    /**
     * Employee self-service: returns the calling user's own payroll history.
     * Reads employeeId from the JWT principal — no path parameter needed.
     */
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PageResponse<PayrollResponse>>> getMy(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "payrollYear", direction = Sort.Direction.DESC) Pageable pageable) {
        String username   = ((UserDetails) authentication.getPrincipal()).getUsername();
        String employeeId = employeeService.getEmployeeIdByUsername(username);
        return ResponseEntity.ok(ApiResponse.ok(payrollService.getMyPayslips(employeeId, pageable)));
    }

    /** Get a single payroll record by ID — Finance/Director only (prevents cross-employee enumeration). */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('DIRECTOR')")
    public ResponseEntity<ApiResponse<PayrollResponse>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(payrollService.getById(id)));
    }

    // ── Phase 7.2 — Labour cost report ───────────────────────────────────────

    @GetMapping("/reports/labour-cost")
    @PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('DIRECTOR')")
    public ResponseEntity<ApiResponse<LabourCostResponse>> getLabourCostReport(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) String deptId) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getLabourCostReport(year, month, deptId)));
    }

    // ── Phase 7.3 — Insurance remittance report ───────────────────────────────

    @GetMapping("/reports/insurance-remittance")
    @PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('DIRECTOR')")
    public ResponseEntity<ApiResponse<InsuranceRemittanceResponse>> getInsuranceRemittanceReport(
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getInsuranceRemittanceReport(year, month)));
    }

    // ── Phase 7.4 — PIT summary report ───────────────────────────────────────

    @GetMapping("/reports/pit-summary")
    @PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('DIRECTOR')")
    public ResponseEntity<ApiResponse<PitSummaryResponse>> getPitSummaryReport(
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getPitSummaryReport(year, month)));
    }

    // ── Phase 7.6 — Employee self-service payslip ─────────────────────────────

    @GetMapping("/my/{year}/{month}/slip")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PayslipResponse>> getMyPayslip(
            @PathVariable int year,
            @PathVariable int month,
            Authentication authentication) {
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        return ResponseEntity.ok(ApiResponse.ok(payrollService.getMyPayslip(year, month, username)));
    }
}
