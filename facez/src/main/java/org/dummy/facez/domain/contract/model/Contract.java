package org.dummy.facez.domain.contract.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.model.AuditableEntity;
import org.dummy.facez.domain.employee.model.EmployeeInfo;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "contract")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contract extends AuditableEntity {
    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private EmployeeInfo employeeInfo;

    private LocalDate startDate;
    private LocalDate endDate;
    private String contractType;
    private String terms;
    private String status;
    private String salaryRank;

    /** Performance salary agreed in contract (Lhq) — VND */
    private Long baseSalary;

    /** Insurance base salary (LCB) — VND, capped at 46,800,000 for calculation */
    private Long insuranceBase;

    /** Salary grade code for position coefficient lookup (e.g. NV1, TL1, BOD) */
    @Column(length = 10)
    private String positionCode;

    /** Salary step within the grade (1–10) */
    private Integer salaryStep;

    /** Number of dependents for PIT personal-relief calculation (cached from TaxDependent table) */
    private Integer dependentCount = 0;

    // ── Contract history fields ───────────────────────────────────────────────

    /** Date this contract version takes effect */
    private LocalDate effectiveFrom;

    /** null = currently active; set when superseded by a new version */
    private LocalDate effectiveTo;

    /** true for the active/current contract version */
    @Column(name = "current_contract")
    private boolean current = true;

    private byte[] attachment;
    private boolean deleteFlag;
    private LocalDateTime deletedAt;
}
