package org.dummy.facez.domain.department.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DepartmentResponse {
    private String departmentId;
    private String departmentName;
    private String managerId;
    private String managerName;
    private String parentId;
}
