package org.dummy.facez.domain.department.service;

import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.domain.department.repository.DepartmentRepository;
import org.dummy.facez.domain.department.model.Department;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.department.dto.DepartmentRequest;
import org.dummy.facez.domain.department.dto.DepartmentResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentService(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @Transactional
    public DepartmentResponse createDepartment(DepartmentRequest req) {
        if (departmentRepository.existsById(req.getDepartmentId())) {
            throw new BadRequestException("Department ID already exists: " + req.getDepartmentId());
        }

        Department department = Department.builder()
                .departmentId(req.getDepartmentId())
                .departmentName(req.getDepartmentName())
                .build();

        departmentRepository.save(department);
        return toResponse(department);
    }

    public List<DepartmentResponse> getAllDepartments() {
        return departmentRepository.findAll().stream()
                .filter(d -> !d.isDeleteFlag())
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public DepartmentResponse getDepartmentById(String id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));
        return toResponse(dept);
    }

    @Transactional
    public DepartmentResponse updateDepartment(String id, DepartmentRequest req) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));

        if (req.getDepartmentName() != null) {
            dept.setDepartmentName(req.getDepartmentName());
        }

        departmentRepository.save(dept);
        return toResponse(dept);
    }

    @Transactional
    public void deleteDepartment(String id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));
        dept.setDeleteFlag(true);
        departmentRepository.save(dept);
    }

    private DepartmentResponse toResponse(Department dept) {
        DepartmentResponse.DepartmentResponseBuilder builder = DepartmentResponse.builder()
                .departmentId(dept.getDepartmentId())
                .departmentName(dept.getDepartmentName());

        EmployeeInfo manager = dept.getEmployeeInfo();
        if (manager != null) {
            builder.managerId(manager.getEmployeeId())
                    .managerName(manager.getName());
        }
        return builder.build();
    }
}
