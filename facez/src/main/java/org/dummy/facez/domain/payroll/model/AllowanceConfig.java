package org.dummy.facez.domain.payroll.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.enums.ConfigStatus;
import org.dummy.facez.common.model.AuditableEntity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Effective-dated allowance config (living allowance per level + Japanese language allowance). */
@Entity
@Table(name = "allowance_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AllowanceConfig extends AuditableEntity {

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

    @Column(name = "living_prorated", nullable = false)
    private boolean livingProrated;

    @Column(name = "japanese_prorated", nullable = false)
    private boolean japaneseProrated;

    @Column(name = "japanese_min_contract_months")
    private Integer japaneseMinContractMonths;

    @OneToMany(mappedBy = "config", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<AllowanceLevel> levels = new ArrayList<>();

    @OneToMany(mappedBy = "config", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<JapaneseAllowanceLevel> japaneseLevels = new ArrayList<>();

    @OneToMany(mappedBy = "config", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<AllowanceRuleValue> ruleValues = new ArrayList<>();
}
