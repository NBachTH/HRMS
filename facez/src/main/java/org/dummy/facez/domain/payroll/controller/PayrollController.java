package org.dummy.facez.domain.payroll.controller;

import jakarta.validation.Valid;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.employee.service.EmployeeService;
import org.dummy.facez.domain.payroll.dto.*;
import org.dummy.facez.domain.payroll.service.PayrollBatchService;
import org.dummy.facez.domain.payroll.service.PayrollConfigService;
import org.dummy.facez.domain.payroll.service.PayrollJobRecord;
import org.dummy.facez.domain.payroll.service.PayrollJobStore;
import org.dummy.facez.domain.payroll.service.PayrollReportService;
import org.dummy.facez.domain.payroll.service.PayrollService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payrolls")
public class PayrollController {

    private final PayrollService       payrollService;
    private final PayrollBatchService  batchService;
    private final PayrollJobStore      jobStore;
    private final EmployeeService      employeeService;
    private final PayrollReportService reportService;

    public PayrollController(PayrollService payrollService,
                              PayrollBatchService batchService,
                              PayrollJobStore jobStore,
                              EmployeeService employeeService,
                              PayrollReportService reportService) {
        this.payrollService  = payrollService;
        this.batchService    = batchService;
        this.jobStore        = jobStore;
        this.employeeService = employeeService;
        this.reportService   = reportService;
    }

    /**
     * Trigger payroll calculation for one employee in a given month.
     * Saves the result as a DRAFT record.
     */
    @PostMapping("/calculate")
    @PreAuthorize("hasAuthority('FINANCE_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollResponse>> calculate(
            @Valid @RequestBody PayrollCalculateRequest req) {
        PayrollResponse response = payrollService.calculate(req);
        return ResponseEntity.ok(ApiResponse.ok(response, "Payroll calculated and saved as DRAFT"));
    }

    /**
     * Trigger batch payroll DRAFT generation for all active employees in a period.
     *
     * Returns HTTP 202 Accepted immediately with a jobId.
     * Poll GET /api/payrolls/jobs/{jobId} to track progress.
     *
     * @Async flow:
     *  1. triggerBatch() creates a PENDING job record — fast, synchronous.
     *  2. runBatch() is called on the injected batchService proxy →
     *     Spring's @Async proxy intercepts → submits to "payrollExecutor" thread pool.
     *  3. This thread returns 202 before runBatch() has done any real work.
     */
    @PostMapping("/batch-calculate")
    @PreAuthorize("hasAuthority('FINANCE_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollJobResponse>> batchCalculate(
            @Valid @RequestBody PayrollBatchRequest req) {

        int nt = req.getStandardWorkingDays() != null
                ? req.getStandardWorkingDays()
                : PayrollConfigService.DEFAULT_STANDARD_DAYS;

        String jobId = batchService.triggerBatch(req.getPayrollYear(), req.getPayrollMonth(), nt);
        batchService.runBatch(jobId, req.getPayrollYear(), req.getPayrollMonth(), nt);

        PayrollJobRecord record = jobStore.get(jobId).orElseThrow();
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.ok(PayrollJobResponse.from(record),
                        "Batch payroll job submitted. Poll /api/payrolls/jobs/" + jobId + " for status."));
    }

    /**
     * Returns the current status of a batch payroll job.
     * Counters (succeeded, skipped, failed) update in real time while the job runs.
     */
    @GetMapping("/jobs/{jobId}")
    @PreAuthorize("hasAuthority('FINANCE_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollJobResponse>> getJobStatus(@PathVariable String jobId) {
        PayrollJobRecord record = jobStore.get(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("PayrollJob", "jobId", jobId));
        return ResponseEntity.ok(ApiResponse.ok(PayrollJobResponse.from(record)));
    }

    /** List all payroll records (paginated). */
    @GetMapping
    @PreAuthorize("hasAuthority('FINANCE_ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<PayrollResponse>>> getAll(
            @PageableDefault(size = 20, sort = "payrollYear", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(payrollService.getAll(pageable)));
    }

    /** List payroll records by period (year + month). */
    @GetMapping("/period")
    @PreAuthorize("hasAuthority('FINANCE_ADMIN')")
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
        return ResponseEntity.ok(ApiResponse.ok(payrollService.getByEmployee(employeeId, pageable)));
    }

    /** Get a single payroll record by ID — Finance/Director only (prevents cross-employee enumeration). */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('DIRECTOR')")
    public ResponseEntity<ApiResponse<PayrollResponse>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(payrollService.getById(id)));
    }

    /** Approve a DRAFT payroll — locks it for payment. */
    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('DIRECTOR')")
    public ResponseEntity<ApiResponse<PayrollResponse>> approve(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(payrollService.approve(id), "Payroll approved"));
    }

    /** Mark an APPROVED payroll as PAID. */
    @PatchMapping("/{id}/mark-paid")
    @PreAuthorize("hasAuthority('FINANCE_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollResponse>> markPaid(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(payrollService.markPaid(id), "Payroll marked as paid"));
    }

    /** Delete a DRAFT payroll record. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('FINANCE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        payrollService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Payroll deleted"));
    }

    /** FINANCE_ADMIN: DRAFT → PENDING_APPROVAL */
    @PatchMapping("/{id}/submit")
    @PreAuthorize("hasAuthority('FINANCE_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollResponse>> submit(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(
                payrollService.submitForApproval(id), "Payroll submitted for Director approval"));
    }

    /** DIRECTOR: PENDING_APPROVAL → REJECTED */
    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('DIRECTOR') or hasAuthority('SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollResponse>> reject(
            @PathVariable String id,
            @Valid @RequestBody PayrollRejectRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(
                payrollService.reject(id, req.getReason()), "Payroll rejected"));
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
