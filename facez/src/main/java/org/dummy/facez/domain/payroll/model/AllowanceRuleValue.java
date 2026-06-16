package org.dummy.facez.domain.payroll.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * A value within an allowance rule list. {@code kind} is one of:
 * LIVING_ELIGIBLE, JP_ELIGIBLE, JP_EXCLUDED_POSITION, JP_EXCLUDED_LEVEL.
 */
@Entity
@Table(name = "allowance_rule_value")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AllowanceRuleValue {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "config_id", nullable = false)
    private AllowanceConfig config;

    @Column(nullable = false, length = 40)
    private String kind;

    @Column(nullable = false, length = 60)
    private String value;
}
