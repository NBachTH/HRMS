package org.dummy.facez.domain.employee.dto;

import jakarta.validation.constraints.Email;
import lombok.Data;

import java.time.LocalDate;

@Data
public class EmployeeUpdateRequest {
    private String name;

    @Email(message = "Invalid email format")
    private String email;

    private String phoneNumber;
    private String address;
    private LocalDate dateOfJoining;
    private String emergencyContact;
    private String departmentId;
    private String status;
    private String role;

    // Statutory fields
    private String nationalId;
    private LocalDate nationalIdIssueDate;
    private String nationalIdIssuePlace;
    private String taxCode;
    private String socialInsuranceCode;
    private String bankAccountNumber;
    private String bankName;
    private String bankBranch;
    private LocalDate dateOfBirth;
    private String gender;
    private String hometown;
}
