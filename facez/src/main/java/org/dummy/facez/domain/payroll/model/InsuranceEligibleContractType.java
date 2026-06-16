package org.dummy.facez.domain.payroll.model;

import jakarta.persistence.*;
import lombok.*;

/** A contract type that is subject to insurance under a given {@link InsuranceConfig}. */
@Entity
@Table(name = "insurance_eligible_contract_type")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InsuranceEligibleContractType {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "config_id", nullable = false)
    private InsuranceConfig config;

    @Column(name = "contract_type", nullable = false, length = 30)
    private String contractType;
}
