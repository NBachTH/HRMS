package org.dummy.facez.domain.payroll.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.enums.PayrollStatus;
import org.dummy.facez.common.model.AuditableEntity;

/**
 * A persistent payroll period (run). Groups the per-employee {@link Payroll} lines and
 * carries the period-level workflow status (DRAFT → PENDING_APPROVAL → APPROVED → PAID).
 */
@Entity
@Table(name = "payroll_run",
        uniqueConstraints = @UniqueConstraint(name = "uk_payroll_run_period", columnNames = {"run_year", "run_month"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollRun extends AuditableEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "run_year", nullable = false)
    private int year;

    @Column(name = "run_month", nullable = false)
    private int month;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PayrollStatus status;

    private int employeeCount;
    private long totalGross;
    private long totalNet;

    @Column(length = 100)
    private String submittedBy;
    @Column(length = 100)
    private String approvedBy;
    @Column(length = 500)
    private String rejectionReason;
}
