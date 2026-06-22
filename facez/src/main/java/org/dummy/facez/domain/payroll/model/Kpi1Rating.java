package org.dummy.facez.domain.payroll.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.model.AuditableEntity;
import org.dummy.facez.domain.employee.model.EmployeeInfo;

/**
 * Monthly KPI1 (performance) rating entered by an employee's direct superior.
 * A = 1.04, B = 1.00, C = 0.98 (resolved in the payroll engine). One row per (employee, year, month).
 */
@Entity
@Table(name = "kpi1_rating",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_kpi1_employee_period", columnNames = {"employee_id", "kpi_year", "kpi_month"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Kpi1Rating extends AuditableEntity {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeInfo employeeInfo;

    @Column(name = "kpi_year", nullable = false)
    private int year;

    @Column(name = "kpi_month", nullable = false)
    private int month;

    /** A / B / C */
    @Column(nullable = false, length = 2)
    private String rating;

    /** Employee id of the superior who entered the rating. */
    @Column(length = 64)
    private String evaluatorId;

    @Column(length = 300)
    private String note;
}
