package org.dummy.facez.domain.employee.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class EmployeeResponse {
    private String employeeId;
    private String name;
    private String role;
    private String email;
    private String phoneNumber;
    private String address;
    private LocalDate dateOfJoining;
    private String emergencyContact;
    private String status;
    private String departmentId;
    private String departmentName;
    private String username;

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
    private String profilePictureUrl;
}
