package org.dummy.facez.domain.department.controller;

import jakarta.validation.Valid;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.domain.department.dto.DepartmentRequest;
import org.dummy.facez.domain.department.dto.DepartmentResponse;
import org.dummy.facez.domain.department.service.DepartmentService;
import org.dummy.facez.domain.employee.model.UserAccount;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> create(@Valid @RequestBody DepartmentRequest req) {
        DepartmentResponse response = departmentService.createDepartment(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Department created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DepartmentResponse>>> getAll() {
        List<DepartmentResponse> departments = departmentService.getAllDepartments();
        return ResponseEntity.ok(ApiResponse.ok(departments));
    }

    /** Leader/Manager: only the department(s) they manage (or their own). */
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<DepartmentResponse>>> getMy(Authentication auth) {
        String employeeId = ((UserAccount) auth.getPrincipal()).getEmployeeId();
        return ResponseEntity.ok(ApiResponse.ok(departmentService.getMyDepartments(employeeId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DepartmentResponse>> getById(@PathVariable(name = "id") String id) {
        DepartmentResponse response = departmentService.getDepartmentById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> update(
            @PathVariable(name = "id") String id,
            @Valid @RequestBody DepartmentRequest req) {
        DepartmentResponse response = departmentService.updateDepartment(id, req);
        return ResponseEntity.ok(ApiResponse.ok(response, "Department updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable(name = "id") String id) {
        departmentService.deleteDepartment(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Department deleted successfully"));
    }
}
