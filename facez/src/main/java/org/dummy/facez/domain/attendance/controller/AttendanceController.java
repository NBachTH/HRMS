package org.dummy.facez.domain.attendance.controller;

import jakarta.validation.Valid;
import org.dummy.facez.domain.attendance.dto.AttendanceRequest;
import org.dummy.facez.domain.attendance.dto.AttendanceResponse;
import org.dummy.facez.domain.attendance.dto.PeriodCloseRequest;
import org.dummy.facez.domain.attendance.dto.PeriodCloseResponse;
import org.dummy.facez.domain.attendance.service.AttendanceService;
import org.dummy.facez.domain.attendance.service.PeriodCloseService;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.employee.service.EmployeeService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/attendances")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final EmployeeService employeeService;
    private final PeriodCloseService periodCloseService;

    public AttendanceController(AttendanceService attendanceService, EmployeeService employeeService,
            PeriodCloseService periodCloseService) {
        this.attendanceService = attendanceService;
        this.employeeService   = employeeService;
        this.periodCloseService = periodCloseService;
    }

    /** HR/Manager/Admin can query all records, optionally filtered by employeeId or date range. */
    @GetMapping
    @PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('MANAGER')")
    public ResponseEntity<ApiResponse<PageResponse<AttendanceResponse>>> getAll(
            @RequestParam(required = false, name = "employeeId") String employeeId,
            @RequestParam(required = false, name = "date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false, name = "from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false, name = "to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20, sort = "checkIn", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<AttendanceResponse> page = attendanceService.getAllAttendances(employeeId, date, from, to, pageable);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    /** Employee self-service: returns the calling user's own attendance history. */
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PageResponse<AttendanceResponse>>> getMy(
            Authentication authentication,
            @RequestParam(required = false, name = "date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false, name = "from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false, name = "to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20, sort = "checkIn", direction = Sort.Direction.DESC) Pageable pageable) {
        String username   = ((UserDetails) authentication.getPrincipal()).getUsername();
        String employeeId = employeeService.getEmployeeIdByUsername(username);
        PageResponse<AttendanceResponse> page = attendanceService.getAllAttendances(employeeId, date, from, to, pageable);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<AttendanceResponse>> update(
            @PathVariable(name = "id") String id,
            @Valid @RequestBody AttendanceRequest req) {
        AttendanceResponse response = attendanceService.updateAttendance(id, req);
        return ResponseEntity.ok(ApiResponse.ok(response, "Attendance updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable(name = "id") String id) {
        attendanceService.deleteAttendance(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Attendance deleted"));
    }

    @PostMapping("/close-period")
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<ApiResponse<PeriodCloseResponse>> closePeriod(
            @Valid @RequestBody PeriodCloseRequest req, Authentication authentication) {
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        PeriodCloseResponse response = periodCloseService.closePeriod(req, username);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getMessage()));
    }
}
