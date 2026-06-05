package org.dummy.facez.domain.department.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.dummy.facez.domain.employee.model.EmployeeInfo;

import java.time.LocalDateTime;

@Entity
@Table(name = "department")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Department {
    @Id
    private String departmentId;

    private String departmentName;

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "manager_id")
    private EmployeeInfo employeeInfo;

    private boolean deleteFlag;

    private LocalDateTime deletedAt;
}
