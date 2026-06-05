package org.dummy.facez.domain.leave.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.enums.LeaveType;
import org.dummy.facez.domain.employee.model.EmployeeInfo;

import java.math.BigDecimal;

@Entity
@Table(name = "leave_balance",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"employee_id", "leave_year", "leave_type"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveBalance {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeInfo employeeInfo;

    @Column(nullable = false)
    private int leaveYear;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private LeaveType leaveType;

    @Column(nullable = false)
    private BigDecimal entitlementDays = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal carriedOverDays = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal pendingDays = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal usedDays = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal remainingDays = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal carryOverCap = BigDecimal.valueOf(5);
}
