package org.dummy.facez.domain.payroll.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.enums.ConfigStatus;
import org.dummy.facez.common.model.AuditableEntity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Effective-dated social/health/unemployment insurance config (rates, ceiling, eligibility). */
@Entity
@Table(name = "insurance_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InsuranceConfig extends AuditableEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ConfigStatus status;

    @Column(name = "legal_basis", length = 300)
    private String legalBasis;

    @Column(name = "government_base_salary")
    private Long governmentBaseSalary;

    @Column(name = "insurance_ceiling")
    private Long insuranceCeiling;

    @Column(name = "statutory_min_wage")
    private Long statutoryMinWage;

    // Employee contribution rates
    @Column(name = "ee_bhxh", nullable = false) private double eeBhxh;
    @Column(name = "ee_bhyt", nullable = false) private double eeBhyt;
    @Column(name = "ee_bhtn", nullable = false) private double eeBhtn;

    // Employer contribution rates
    @Column(name = "er_bhxh_pension", nullable = false)            private double erBhxhPension;
    @Column(name = "er_bhxh_sickness_maternity", nullable = false) private double erBhxhSicknessMaternity;
    @Column(name = "er_bhxh_accident", nullable = false)          private double erBhxhAccident;
    @Column(name = "er_bhyt", nullable = false)                    private double erBhyt;
    @Column(name = "er_bhtn", nullable = false)                    private double erBhtn;

    @Column(name = "probation_exempt", nullable = false)
    private boolean probationExempt;

    @OneToMany(mappedBy = "config", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<InsuranceEligibleContractType> eligibleContractTypes = new ArrayList<>();
}
