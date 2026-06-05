package org.dummy.facez.domain.payroll.model;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.model.AuditableEntity;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Stores versioned system configuration records as JSON payloads.
 * <p>
 * One record per config type per version. Only one record per type
 * should have {@code active = true} at any time — enforced at the
 * service layer.
 *
 * <p>Config types:
 * <ul>
 *   <li>{@code SALARY_GRADE}    — position codes and 10-step salary ladders</li>
 *   <li>{@code ALLOWANCE}       — living and language allowance amounts per level</li>
 *   <li>{@code PIT}             — personal income tax brackets and reliefs per year</li>
 *   <li>{@code INSURANCE}       — BHXH/BHYT/BHTN rates and insurance salary ceiling</li>
 * </ul>
 */
@Entity
@Table(
    name = "system_config",
    indexes = {
        @Index(name = "idx_syscfg_type_active", columnList = "config_type, active"),
        @Index(name = "idx_syscfg_type_version", columnList = "config_type, version")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemConfig  extends AuditableEntity {

    @Id
    @Column(length = 64)
    private String id;

    /**
     * Discriminator — one of: SALARY_GRADE, ALLOWANCE, PIT, INSURANCE.
     */
    @Column(name = "config_type", nullable = false, length = 30)
    private String configType;

    /**
     * Human-readable version label, e.g. "2026" or "v4.0".
     */
    @Column(nullable = false, length = 30)
    private String version;

    /**
     * Date from which this config takes effect.
     */
    private LocalDate effectiveDate;

    /**
     * Legal or regulatory basis citation, for audit purposes.
     * e.g. "Law 109/2025/QH15 + Resolution 110/2025/UBTVQH15"
     */
    @Column(length = 300)
    private String legalBasis;

    /**
     * The full configuration payload stored as JSON.
     * Structure mirrors the existing classpath JSON files
     * (salary-grades.json, allowance-config.json, etc.)
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private JsonNode configData;

    /**
     * Whether this is the config currently used in payroll calculations.
     * Only one record per {@code configType} should be active at a time.
     */
    @Column(nullable = false)
    private boolean active;

    /** Who created or last updated this config entry. */
    @Column(length = 100)
    private String updatedBy;
}
