package org.dummy.facez.domain.otrequest.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.domain.employee.model.EmployeeInfo;

/** One employee assigned to an {@link OTPlan}. */
@Entity
@Table(name = "ot_plan_employee",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_ot_plan_employee", columnNames = {"ot_plan_id", "employee_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OTPlanEmployee {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ot_plan_id", nullable = false)
    private OTPlan otPlan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeInfo employee;
}
