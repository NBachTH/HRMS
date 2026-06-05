package org.dummy.facez.domain.employee.controller;

import jakarta.validation.Valid;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.employee.dto.EmployeeCreateRequest;
import org.dummy.facez.domain.employee.dto.EmployeeResponse;
import org.dummy.facez.domain.employee.dto.EmployeeUpdateRequest;
import org.dummy.facez.domain.employee.service.EmployeeService;
import org.dummy.facez.domain.employee.service.ProfilePictureService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final ProfilePictureService profilePictureService;

    public EmployeeController(EmployeeService employeeService,
                               ProfilePictureService profilePictureService) {
        this.employeeService = employeeService;
        this.profilePictureService = profilePictureService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> create(@Valid @RequestBody EmployeeCreateRequest req) {
        EmployeeResponse response = employeeService.createEmployee(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Employee created successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('MANAGER') or hasAuthority('LEADER')")
    public ResponseEntity<ApiResponse<PageResponse<EmployeeResponse>>> getAll(
            @RequestParam(required = false) String departmentId,
            @PageableDefault(size = 20, sort = "employeeId", direction = Sort.Direction.ASC) Pageable pageable) {
        PageResponse<EmployeeResponse> page = employeeService.getAllEmployees(departmentId, pageable);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('MANAGER') or hasAuthority('LEADER')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> getById(@PathVariable String id) {
        EmployeeResponse response = employeeService.getEmployeeById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<EmployeeResponse>> getMe(Authentication authentication) {
        UserDetails ud = (UserDetails) authentication.getPrincipal();
        // Use username to find employee
        EmployeeResponse response = employeeService.getEmployeeById(
                employeeService.getEmployeeIdByUsername(ud.getUsername()));
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> update(
            @PathVariable String id,
            @Valid @RequestBody EmployeeUpdateRequest req) {
        EmployeeResponse response = employeeService.updateEmployee(id, req);
        return ResponseEntity.ok(ApiResponse.ok(response, "Employee updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        employeeService.deleteEmployee(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Employee deleted successfully"));
    }

    @PostMapping(value = "/{id}/profile-picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<ApiResponse<String>> uploadProfilePicture(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file) {
        String url = profilePictureService.uploadProfilePicture(id, file);
        return ResponseEntity.ok(ApiResponse.ok(url, "Profile picture uploaded successfully"));
    }

}
