package org.dummy.facez.domain.payroll.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.enums.ConfigStatus;
import org.dummy.facez.common.model.AuditableEntity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Effective-dated personal income tax config (reliefs + progressive brackets). */
@Entity
@Table(name = "pit_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PitConfig extends AuditableEntity {

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

    @Column(length = 300)
    private String resolution;

    @Column(name = "personal_relief", nullable = false)
    private long personalRelief;

    @Column(name = "dependent_relief", nullable = false)
    private long dependentRelief;

    @OneToMany(mappedBy = "config", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<PitBracket> brackets = new ArrayList<>();
}
