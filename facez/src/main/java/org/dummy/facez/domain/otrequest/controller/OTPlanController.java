package org.dummy.facez.domain.otrequest.controller;

import jakarta.validation.Valid;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.employee.model.UserAccount;
import org.dummy.facez.domain.otrequest.dto.OTPlanCreateDto;
import org.dummy.facez.domain.otrequest.dto.OTPlanResponse;
import org.dummy.facez.domain.otrequest.service.OTPlanService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ot-plans")
public class OTPlanController {

    private final OTPlanService otPlanService;

    public OTPlanController(OTPlanService otPlanService) {
        this.otPlanService = otPlanService;
    }

    /** LEADER creates an OT plan (list of employees + planned window). */
    @PostMapping
    @PreAuthorize("hasAnyAuthority('LEADER','MANAGER','HR_ADMIN')")
    public ResponseEntity<ApiResponse<OTPlanResponse>> create(@Valid @RequestBody OTPlanCreateDto req) {
        OTPlanResponse response = otPlanService.createPlan(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "OT plan created"));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('LEADER','MANAGER','HR_ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<OTPlanResponse>>> getAll(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "otDate", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(otPlanService.getAllPlans(status, pageable)));
    }

    /** Employee self-service: approved plans the caller is assigned to (OT-request picker). */
    @GetMapping("/my-approved")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<OTPlanResponse>>> getMyApproved(Authentication authentication) {
        String employeeId = ((UserAccount) authentication.getPrincipal()).getEmployeeId();
        return ResponseEntity.ok(ApiResponse.ok(otPlanService.getMyApprovedPlans(employeeId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<OTPlanResponse>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(otPlanService.getPlanById(id)));
    }

    /** MANAGER approves a pending OT plan. */
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('MANAGER','HR_ADMIN')")
    public ResponseEntity<ApiResponse<OTPlanResponse>> approve(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(otPlanService.approvePlan(id), "OT plan approved"));
    }

    /** MANAGER rejects a pending OT plan. */
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('MANAGER','HR_ADMIN')")
    public ResponseEntity<ApiResponse<OTPlanResponse>> reject(
            @PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(ApiResponse.ok(otPlanService.rejectPlan(id, reason), "OT plan rejected"));
    }
}
