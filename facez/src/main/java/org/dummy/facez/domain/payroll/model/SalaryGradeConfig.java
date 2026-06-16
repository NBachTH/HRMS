package org.dummy.facez.domain.payroll.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.enums.ConfigStatus;
import org.dummy.facez.common.model.AuditableEntity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Effective-dated salary grade table (position codes × 10-step ladders). */
@Entity
@Table(name = "salary_grade_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryGradeConfig extends AuditableEntity {

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

    @Column(nullable = false, length = 30)
    private String unit;

    @Column(name = "minimum_wage_region_i")
    private Integer minimumWageRegionI;

    @OneToMany(mappedBy = "config", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<SalaryGrade> grades = new ArrayList<>();
}
