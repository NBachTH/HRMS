package org.dummy.facez.domain.payroll.model;

import jakarta.persistence.*;
import lombok.*;

/** Living-allowance amounts for one level key under an {@link AllowanceConfig}. */
@Entity
@Table(name = "allowance_level")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AllowanceLevel {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "config_id", nullable = false)
    private AllowanceConfig config;

    @Column(name = "level_key", nullable = false, length = 40)
    private String levelKey;

    @Column(nullable = false) private long meal;
    @Column(nullable = false) private long phone;
    @Column(nullable = false) private long transport;
    @Column(nullable = false) private long housing;
}
