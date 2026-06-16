package org.dummy.facez.common.enums;

/**
 * Lifecycle of an effective-dated payroll config version (maker-checker).
 * <ul>
 *   <li>{@code DRAFT}     — created/edited by FINANCE_ADMIN; not used by payroll.</li>
 *   <li>{@code PUBLISHED} — activated by DIRECTOR/SYSTEM_ADMIN; eligible for engine lookup.</li>
 *   <li>{@code ARCHIVED}  — retired version, kept for history; ignored by the engine.</li>
 * </ul>
 */
public enum ConfigStatus {
    DRAFT,
    PUBLISHED,
    ARCHIVED
}
