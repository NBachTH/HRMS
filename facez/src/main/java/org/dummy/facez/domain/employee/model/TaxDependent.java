package org.dummy.facez.domain.employee.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "tax_dependent")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaxDependent {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeInfo employeeInfo;

    @Column(nullable = false, length = 200)
    private String fullName;

    @Column(length = 20)
    private String nationalId;

    private LocalDate dateOfBirth;

    @Column(length = 100)
    private String relationship;

    private LocalDate registrationDate;

    @Column(nullable = false)
    private boolean active = true;
}
