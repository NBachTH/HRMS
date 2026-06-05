package org.dummy.facez.domain.employee.model;

import org.dummy.facez.common.enums.EmployeeStatus;
import org.dummy.facez.common.enums.Gender;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import lombok.*;
import org.dummy.facez.common.enums.Role;
import org.dummy.facez.common.model.AuditableEntity;
import org.dummy.facez.domain.department.model.Department;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_info")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeInfo extends AuditableEntity {

    @Id
    @Column(name = "employee_id", length = 64)
    private String employeeId;

    @Column(nullable = false, length = 200)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name="department_id")
    private Department department;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    @Email
    @Column(length = 150)
    private String email;

    @Column(length = 50)
    private String phoneNumber;

    @Column(length = 500)
    private String address;

    /**
     * Use @Lob for binary data. Consider storing large images in object storage (S3/MinIO)
     * and keeping only a URL here for scalability.
     */
    @Lob
    @Basic(fetch = FetchType.LAZY)
    private byte[] profilePicture;

    /**
     * Use a proper date type for querying and sorting.
     */
    private LocalDate dateOfJoining;

    @Column(length = 200)
    private String emergencyContact;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    // ── Statutory fields for insurance, tax, and payroll ─────────────────────

    @Column(length = 20, unique = true)
    private String nationalId;

    private LocalDate nationalIdIssueDate;

    @Column(length = 200)
    private String nationalIdIssuePlace;

    @Column(length = 20, unique = true)
    private String taxCode;

    @Column(length = 20, unique = true)
    private String socialInsuranceCode;

    @Column(length = 30)
    private String bankAccountNumber;

    @Column(length = 100)
    private String bankName;

    @Column(length = 200)
    private String bankBranch;

    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Column(length = 200)
    private String hometown;

    @Column(length = 500)
    private String profilePictureUrl;

    @Column(nullable = false)
    private boolean deleteFlag = false;

    private LocalDateTime deletedAt;
}
