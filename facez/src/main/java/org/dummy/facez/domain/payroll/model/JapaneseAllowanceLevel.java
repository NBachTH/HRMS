package org.dummy.facez.domain.payroll.model;

import jakarta.persistence.*;
import lombok.*;

/** Japanese language (JLPT) allowance amount for one level (e.g. N1, N2). */
@Entity
@Table(name = "japanese_allowance_level")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JapaneseAllowanceLevel {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "config_id", nullable = false)
    private AllowanceConfig config;

    @Column(name = "jlpt_level", nullable = false, length = 10)
    private String jlptLevel;

    @Column(nullable = false)
    private long amount;
}
