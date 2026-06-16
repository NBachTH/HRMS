package org.dummy.facez.domain.payroll.model;

import jakarta.persistence.*;
import lombok.*;

/** One progressive PIT bracket. {@code incomeTo == null} means the top open-ended bracket. */
@Entity
@Table(name = "pit_bracket")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PitBracket {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "config_id", nullable = false)
    private PitConfig config;

    @Column(nullable = false)
    private int seq;

    @Column(name = "income_from", nullable = false)
    private long incomeFrom;

    @Column(name = "income_to")
    private Long incomeTo;

    @Column(nullable = false)
    private double rate;

    @Column(name = "quick_deduction", nullable = false)
    private long quickDeduction;
}
