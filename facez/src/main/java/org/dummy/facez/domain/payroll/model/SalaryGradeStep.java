package org.dummy.facez.domain.payroll.model;

import jakarta.persistence.*;
import lombok.*;

/** One step amount (1-based, 1..10) of a {@link SalaryGrade}. Amount is in thousand VND. */
@Entity
@Table(name = "salary_grade_step")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryGradeStep {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grade_id", nullable = false)
    private SalaryGrade grade;

    @Column(name = "step_no", nullable = false)
    private int stepNo;

    @Column(name = "amount_thousand_vnd", nullable = false)
    private long amountThousandVnd;
}
