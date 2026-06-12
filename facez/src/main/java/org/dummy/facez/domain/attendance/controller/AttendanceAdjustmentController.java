package org.dummy.facez.domain.attendance.controller;

import jakarta.validation.Valid;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.attendance.dto.AttendanceAdjustmentCreateDto;
import org.dummy.facez.domain.attendance.dto.AttendanceAdjustmentResponse;
import org.dummy.facez.domain.attendance.service.AttendanceAdjustmentService;
import org.dummy.facez.domain.employee.model.UserAccount;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/attendance-adjustments")
public class AttendanceAdjustmentController {

    private final AttendanceAdjustmentService service;

    public AttendanceAdjustmentController(AttendanceAdjustmentService service) {
        this.service = service;
    }

    /** Employee submits an attendance-supplement request. */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AttendanceAdjustmentResponse>> create(
            @Valid @RequestBody AttendanceAdjustmentCreateDto req, Authentication auth) {
        // force the submitter to be the calling user
        req.setEmployeeId(((UserAccount) auth.getPrincipal()).getEmployeeId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.create(req), "Attendance adjustment submitted"));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PageResponse<AttendanceAdjustmentResponse>>> getMy(
            Authentication auth,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        String employeeId = ((UserAccount) auth.getPrincipal()).getEmployeeId();
        return ResponseEntity.ok(ApiResponse.ok(service.getByEmployee(employeeId, pageable)));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','MANAGER','LEADER','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<AttendanceAdjustmentResponse>>> getAll(
            @RequestParam(required = false) String status, Authentication auth,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.getAll(status, empId(auth), isUnrestricted(auth), pageable)));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','MANAGER','LEADER','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<AttendanceAdjustmentResponse>> approve(
            @PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.approve(id, empId(auth), isUnrestricted(auth)), "Adjustment approved"));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','MANAGER','LEADER','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<AttendanceAdjustmentResponse>> reject(
            @PathVariable String id, @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.reject(id, body != null ? body.get("reason") : null, empId(auth), isUnrestricted(auth)),
                "Adjustment rejected"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Adjustment cancelled"));
    }

    private static String empId(Authentication auth) {
        return ((UserAccount) auth.getPrincipal()).getEmployeeId();
    }

    /** HR_ADMIN / SYSTEM_ADMIN see and act on every department; others are team-scoped. */
    private static boolean isUnrestricted(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("HR_ADMIN") || a.getAuthority().equals("SYSTEM_ADMIN"));
    }
}
