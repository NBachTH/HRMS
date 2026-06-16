package org.dummy.facez.domain.employee.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AccountResponse {
    private String employeeId;
    private String username;
    private String role;
    private String employeeName;
    private String departmentName;
    private boolean enabled;
}
