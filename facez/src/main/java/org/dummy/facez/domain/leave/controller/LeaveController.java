package org.dummy.facez.domain.leave.controller;

import jakarta.validation.Valid;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.employee.service.EmployeeService;
import org.dummy.facez.domain.leave.dto.LeaveBalanceResponse;
import org.dummy.facez.domain.leave.dto.LeaveCreateRequest;
import org.dummy.facez.domain.leave.dto.LeaveResponse;
import org.dummy.facez.domain.leave.service.LeaveService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/leaves")
public class LeaveController {

    private final LeaveService leaveService;
    private final EmployeeService employeeService;

    public LeaveController(LeaveService leaveService, EmployeeService employeeService) {
        this.leaveService    = leaveService;
        this.employeeService = employeeService;
    }

    /** Any authenticated employee can submit a leave request */
    @PostMapping
    @PreAuthorize("hasAuthority('EMPLOYEE') or hasAuthority('LEADER') or hasAuthority('MANAGER') or hasAuthority('HR_ADMIN')")
    public ResponseEntity<ApiResponse<LeaveResponse>> create(@Valid @RequestBody LeaveCreateRequest req) {
        LeaveResponse response = leaveService.createLeaveRequest(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Leave request created"));
    }

    /** LEADER, MANAGER, HR_ADMIN can view all leave requests, optionally filtered by status */
    @GetMapping
    @PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('MANAGER') or hasAuthority('LEADER')")
    public ResponseEntity<ApiResponse<PageResponse<LeaveResponse>>> getAll(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<LeaveResponse> page = leaveService.getAllLeaveRequests(status, pageable);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    /** Employee self-service: returns the calling user's own leave requests. */
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PageResponse<LeaveResponse>>> getMy(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        String username   = ((UserDetails) authentication.getPrincipal()).getUsername();
        String employeeId = employeeService.getEmployeeIdByUsername(username);
        return ResponseEntity.ok(ApiResponse.ok(leaveService.getByEmployee(employeeId, pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<LeaveResponse>> getById(@PathVariable String id) {
        LeaveResponse response = leaveService.getLeaveRequestById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Approval is role-gated inside the service:
     * LEADER→level1, MANAGER→level2, HR_ADMIN→final
     */
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('MANAGER') or hasAuthority('LEADER')")
    public ResponseEntity<ApiResponse<LeaveResponse>> approve(@PathVariable String id, Authentication auth) {
        String role = extractRole(auth);
        LeaveResponse response = leaveService.approveLeaveRequest(id, role);
        return ResponseEntity.ok(ApiResponse.ok(response, "Leave request approved"));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('MANAGER') or hasAuthority('LEADER')")
    public ResponseEntity<ApiResponse<LeaveResponse>> reject(@PathVariable String id, Authentication auth) {
        String role = extractRole(auth);
        LeaveResponse response = leaveService.rejectLeaveRequest(id, role);
        return ResponseEntity.ok(ApiResponse.ok(response, "Leave request rejected"));
    }

    /** Only the submitter (EMPLOYEE) or HR_ADMIN can delete a pending request */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        leaveService.deleteLeaveRequest(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Leave request deleted"));
    }

    @GetMapping("/balances/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<LeaveBalanceResponse>>> getMyBalance(
            Authentication authentication,
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}") int year) {
        String username   = ((UserDetails) authentication.getPrincipal()).getUsername();
        String employeeId = employeeService.getEmployeeIdByUsername(username);
        return ResponseEntity.ok(ApiResponse.ok(leaveService.getMyBalance(employeeId, year)));
    }

    @GetMapping("/balances/{employeeId}")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<List<LeaveBalanceResponse>>> getBalanceByEmployee(
            @PathVariable String employeeId,
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}") int year) {
        return ResponseEntity.ok(ApiResponse.ok(leaveService.getMyBalance(employeeId, year)));
    }

    private String extractRole(Authentication auth) {
        return auth.getAuthorities().stream()
                .findFirst()
                .map(a -> a.getAuthority())
                .orElse("EMPLOYEE");
    }
}
