package org.dummy.facez.domain.employee.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class EmployeeCreateRequest {
    @NotBlank(message = "Employee ID is required")
    private String employeeId;

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Role is required")
    private String role;

    @Email(message = "Invalid email format")
    private String email;

    private String phoneNumber;
    private String address;
    private LocalDate dateOfJoining;
    private String emergencyContact;
    private String departmentId;

    // User account fields
    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;

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
