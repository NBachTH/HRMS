package org.dummy.facez.domain.department.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DepartmentRequest {
    @NotBlank(message = "Department ID is required")
    private String departmentId;

    @NotBlank(message = "Department name is required")
    private String departmentName;

    private String managerId;
    private String parentId;
}
