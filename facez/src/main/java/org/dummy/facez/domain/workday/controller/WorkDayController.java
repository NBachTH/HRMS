package org.dummy.facez.domain.workday.controller;

import org.dummy.facez.common.enums.WorkDaySource;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.domain.employee.model.UserAccount;
import org.dummy.facez.domain.workday.dto.WorkDayResponse;
import org.dummy.facez.domain.workday.service.WorkDayService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/work-days")
public class WorkDayController {

    private final WorkDayService workDayService;

    public WorkDayController(WorkDayService workDayService) {
        this.workDayService = workDayService;
    }

    /** Employee self-service: own WorkDays for a month. */
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<WorkDayResponse>>> getMy(
            Authentication authentication,
            @RequestParam int year, @RequestParam int month) {
        String employeeId = ((UserAccount) authentication.getPrincipal()).getEmployeeId();
        return ResponseEntity.ok(ApiResponse.ok(
                workDayService.getForEmployeePeriod(employeeId, first(year, month), last(year, month))));
    }

    /** Manager / HR: a given employee's WorkDays for a month. */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','MANAGER','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<List<WorkDayResponse>>> getByEmployee(
            @RequestParam String employeeId, @RequestParam int year, @RequestParam int month) {
        return ResponseEntity.ok(ApiResponse.ok(
                workDayService.getForEmployeePeriod(employeeId, first(year, month), last(year, month))));
    }

    /** HR: days needing reconciliation (check-in vs leave conflict) before closing. */
    @GetMapping("/conflicts")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<List<WorkDayResponse>>> getConflicts(
            @RequestParam int year, @RequestParam int month) {
        return ResponseEntity.ok(ApiResponse.ok(
                workDayService.getConflictResponses(first(year, month), last(year, month))));
    }

    /** HR resolves a conflict by choosing CHECKIN or LEAVE_REQUEST. */
    @PatchMapping("/{id}/resolve")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<WorkDayResponse>> resolve(
            @PathVariable String id, @RequestParam WorkDaySource source) {
        return ResponseEntity.ok(ApiResponse.ok(workDayService.resolveConflict(id, source), "Conflict resolved"));
    }

    private static LocalDate first(int year, int month) { return LocalDate.of(year, month, 1); }
    private static LocalDate last(int year, int month)  { return YearMonth.of(year, month).atEndOfMonth(); }
}
