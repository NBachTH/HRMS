package org.dummy.facez.domain.otrequest.controller;

import jakarta.validation.Valid;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.employee.model.UserAccount;
import org.dummy.facez.domain.employee.service.EmployeeService;
import org.dummy.facez.domain.otrequest.dto.OTRequestCreateDto;
import org.dummy.facez.domain.otrequest.dto.OTRequestResponse;
import org.dummy.facez.domain.otrequest.service.OTRequestService;
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
@RequestMapping("/api/ot-requests")
public class OTRequestController {

    private final OTRequestService otRequestService;
    private final EmployeeService employeeService;

    public OTRequestController(OTRequestService otRequestService, EmployeeService employeeService) {
        this.otRequestService = otRequestService;
        this.employeeService  = employeeService;
    }

    /** Any authenticated employee can submit an OT request */
    @PostMapping
    @PreAuthorize("hasAuthority('EMPLOYEE') or hasAuthority('LEADER') or hasAuthority('MANAGER') or hasAuthority('HR_ADMIN')")
    public ResponseEntity<ApiResponse<OTRequestResponse>> create(
            @Valid @RequestBody OTRequestCreateDto req, Authentication auth) {
        // Identity is taken from the JWT principal, never trusted from the client.
        req.setEmployeeId(((UserAccount) auth.getPrincipal()).getEmployeeId());
        OTRequestResponse response = otRequestService.createOTRequest(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "OT request created"));
    }

    /** LEADER, MANAGER, HR_ADMIN can view all OT requests, optionally filtered by status */
    @GetMapping
    @PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('MANAGER') or hasAuthority('LEADER')")
    public ResponseEntity<ApiResponse<PageResponse<OTRequestResponse>>> getAll(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<OTRequestResponse> page = otRequestService.getAllOTRequests(status, pageable);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    /** Employee self-service: returns the calling user's own OT requests. */
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PageResponse<OTRequestResponse>>> getMy(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        String username   = ((UserDetails) authentication.getPrincipal()).getUsername();
        String employeeId = employeeService.getEmployeeIdByUsername(username);
        return ResponseEntity.ok(ApiResponse.ok(otRequestService.getByEmployee(employeeId, pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<OTRequestResponse>> getById(@PathVariable String id) {
        OTRequestResponse response = otRequestService.getOTRequestById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Approval is role-gated inside the service:
     * LEADER→level1, MANAGER→level2, HR_ADMIN→final
     */
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('MANAGER') or hasAuthority('LEADER')")
    public ResponseEntity<ApiResponse<OTRequestResponse>> approve(@PathVariable String id, Authentication auth) {
        String role = extractRole(auth);
        OTRequestResponse response = otRequestService.approveOTRequest(id, role);
        return ResponseEntity.ok(ApiResponse.ok(response, "OT request approved"));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('MANAGER') or hasAuthority('LEADER')")
    public ResponseEntity<ApiResponse<OTRequestResponse>> reject(@PathVariable String id, Authentication auth) {
        String role = extractRole(auth);
        OTRequestResponse response = otRequestService.rejectOTRequest(id, role);
        return ResponseEntity.ok(ApiResponse.ok(response, "OT request rejected"));
    }

    /** Only the submitter or HR_ADMIN can delete a pending request */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        otRequestService.deleteOTRequest(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "OT request deleted"));
    }

    private String extractRole(Authentication auth) {
        return auth.getAuthorities().stream()
                .findFirst()
                .map(a -> a.getAuthority())
                .orElse("EMPLOYEE");
    }
}
