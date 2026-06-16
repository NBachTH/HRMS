package org.dummy.facez.domain.payroll.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/** A single grade (e.g. BOD, TL1, NV1) within a {@link SalaryGradeConfig}. */
@Entity
@Table(name = "salary_grade")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryGrade {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "config_id", nullable = false)
    private SalaryGradeConfig config;

    @Column(name = "grade_code", nullable = false, length = 30)
    private String gradeCode;

    @Column(length = 255)
    private String title;

    @Column(length = 30)
    private String track;

    @OneToMany(mappedBy = "grade", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<SalaryGradeStep> steps = new ArrayList<>();
}
