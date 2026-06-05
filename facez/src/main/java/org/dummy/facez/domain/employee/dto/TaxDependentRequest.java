package org.dummy.facez.domain.employee.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TaxDependentRequest {
    @NotBlank
    private String employeeId;
    @NotBlank
    private String fullName;
    private String nationalId;
    private LocalDate dateOfBirth;
    private String relationship;
    private LocalDate registrationDate;
    private boolean active = true;
}
