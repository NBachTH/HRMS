package org.dummy.facez.domain.employee.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class TaxDependentResponse {
    private String id;
    private String employeeId;
    private String fullName;
    private String nationalId;
    private LocalDate dateOfBirth;
    private String relationship;
    private LocalDate registrationDate;
    private boolean active;
}
