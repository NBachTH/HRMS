package org.dummy.facez.domain.workday.controller;

import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.domain.employee.model.UserAccount;
import org.dummy.facez.domain.workday.dto.TimesheetResponse;
import org.dummy.facez.domain.workday.service.TimesheetService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/timesheets")
public class TimesheetController {

    private final TimesheetService timesheetService;

    public TimesheetController(TimesheetService timesheetService) {
        this.timesheetService = timesheetService;
    }

    /** All employees' monthly timesheets (after the period is closed). */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','MANAGER','FINANCE_ADMIN','DIRECTOR','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<List<TimesheetResponse>>> getForPeriod(
            @RequestParam int year, @RequestParam int month) {
        return ResponseEntity.ok(ApiResponse.ok(timesheetService.getForPeriod(year, month)));
    }

    /** Employee self-service: all of the caller's monthly timesheets (newest first). */
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<TimesheetResponse>>> getMy(Authentication authentication) {
        String employeeId = ((UserAccount) authentication.getPrincipal()).getEmployeeId();
        return ResponseEntity.ok(ApiResponse.ok(timesheetService.getAllForEmployee(employeeId)));
    }

    @GetMapping("/{employeeId}")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','FINANCE_ADMIN','MANAGER','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<TimesheetResponse>> getByEmployee(
            @PathVariable String employeeId, @RequestParam int year, @RequestParam int month) {
        return ResponseEntity.ok(ApiResponse.ok(timesheetService.getForEmployee(employeeId, year, month)));
    }
}
