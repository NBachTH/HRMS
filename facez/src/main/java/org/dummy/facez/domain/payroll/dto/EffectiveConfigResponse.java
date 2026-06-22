package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

/**
 * The PUBLISHED payroll-config version that a given payroll period resolves to, per config type.
 * Lets Finance see exactly which salary-grade / allowance / PIT / insurance version a run applies.
 */
@Data
@Builder
public class EffectiveConfigResponse {
    private String configType;       // SALARY_GRADE | ALLOWANCE | PIT | INSURANCE
    private String id;
    private LocalDate effectiveFrom;
    private String legalBasis;
    private boolean found;           // false → no PUBLISHED version effective for the period
}
