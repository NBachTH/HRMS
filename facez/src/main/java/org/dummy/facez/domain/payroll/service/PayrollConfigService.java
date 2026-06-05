package org.dummy.facez.domain.payroll.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.dummy.facez.domain.payroll.model.SystemConfig;
import org.dummy.facez.domain.payroll.repository.SystemConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

/**
 * Loads and caches active payroll configuration from the {@code system_config} table.
 * <p>
 * Call {@link #reload()} to refresh the in-memory cache after an admin updates a config.
 */
@Service
public class PayrollConfigService {

    private static final Logger log = LoggerFactory.getLogger(PayrollConfigService.class);

    /** Standard working days per month (company default). */
    public static final int DEFAULT_STANDARD_DAYS = 26;

    /** Insurance ceiling fallback if DB config is missing (Decree 293/2025/NĐ-CP). */
    public static final long INSURANCE_CEILING = 46_800_000L;

    private static final String CONFIG_BASE = "config/payroll/";

    private final ObjectMapper mapper = new ObjectMapper();

    private final SystemConfigRepository configRepo;

    private JsonNode salaryGrades;
    private JsonNode allowanceConfig;
    private JsonNode pitConfig;
    private JsonNode insuranceConfig;

    public PayrollConfigService(SystemConfigRepository configRepo) {
        this.configRepo = configRepo;
    }

    @PostConstruct
    public void reload() {
        try {
            salaryGrades    = loadActive("SALARY_GRADE");
            allowanceConfig = loadActive("ALLOWANCE");
            pitConfig       = loadActive("PIT");
            insuranceConfig = loadActive("INSURANCE");
        }
        catch (IllegalStateException e) {
            salaryGrades    = load("salary-grades.json");
            allowanceConfig = load("allowance-config.json");
            pitConfig       = load("pit-config.json");
            insuranceConfig = load("insurance-config.json");
        }
        catch (Exception e) {
            log.error(e.getMessage());
        }
        log.info("Payroll configs loaded from DB.");
    }

    // ── Salary grade ──────────────────────────────────────────────────────────

    /**
     * Returns Li — the position coefficient amount in VND.
     *
     * @param positionCode grade code (e.g. NV1, TL1, BOD)
     * @param salaryStep   1-based step number (1–10)
     */
    public long getPositionCoefficient(String positionCode, int salaryStep) {
        JsonNode grade = salaryGrades.path("grades").path(positionCode);
        if (grade.isMissingNode()) {
            throw new IllegalArgumentException("Unknown position code: " + positionCode);
        }
        JsonNode steps = grade.path("steps");
        int index = salaryStep - 1;
        if (index < 0 || index >= steps.size()) {
            throw new IllegalArgumentException(
                    "Salary step " + salaryStep + " out of range for " + positionCode);
        }
        // JSON values are in thousand VND
        return steps.get(index).asLong() * 1_000L;
    }

    // ── Living allowance (HT2) ────────────────────────────────────────────────

    /**
     * Returns the full-month living allowance (HT2) for the given level key.
     *
     * @param levelKey one of: DIRECTOR, DEPUTY_DIRECTOR, DEPT_HEAD, SENIOR_STAFF_NV1, NV2
     */
    public long getLivingAllowance(String levelKey) {
        JsonNode level = allowanceConfig.path("living_allowance").path("levels").path(levelKey);
        if (level.isMissingNode()) return 0L;
        return level.path("meal").asLong()
             + level.path("phone").asLong()
             + level.path("transport").asLong()
             + level.path("housing").asLong();
    }

    // ── Japanese allowance (HT1) ──────────────────────────────────────────────

    /**
     * Returns HT1 Japanese language allowance (not prorated).
     *
     * @param jlptLevel N1 or N2; returns 0 for null/empty/unknown
     */
    public long getJapaneseAllowance(String jlptLevel) {
        if (jlptLevel == null || jlptLevel.isBlank()) return 0L;
        return allowanceConfig.path("japanese_allowance")
                              .path("levels")
                              .path(jlptLevel.toUpperCase())
                              .asLong(0L);
    }

    // ── PIT ───────────────────────────────────────────────────────────────────

    /** Personal relief amount for the given tax year (VND/month). */
    public long getPersonalRelief(int taxYear) {
        return pitConfig.path("configs")
                        .path(String.valueOf(taxYear))
                        .path("personal_relief")
                        .asLong(15_500_000L);
    }

    /** Per-dependent relief amount for the given tax year (VND/month). */
    public long getDependentRelief(int taxYear) {
        return pitConfig.path("configs")
                        .path(String.valueOf(taxYear))
                        .path("dependent_relief")
                        .asLong(6_200_000L);
    }

    /**
     * Calculates PIT using progressive brackets for the given tax year.
     * Uses the quick-deduction formula: income × rate − quick_deduction.
     */
    public long calculatePit(long taxableIncome, int taxYear) {
        if (taxableIncome <= 0) return 0L;

        JsonNode brackets = pitConfig.path("configs")
                                     .path(String.valueOf(taxYear))
                                     .path("brackets");

        for (int i = brackets.size() - 1; i >= 0; i--) {
            JsonNode b = brackets.get(i);
            long from = b.path("from").asLong(0L);
            if (taxableIncome >= from) {
                double rate = b.path("rate").asDouble();
                long quickDeduction = b.path("quick_deduction").asLong(0L);
                return Math.max(0L, (long)(taxableIncome * rate) - quickDeduction);
            }
        }
        return 0L;
    }

    // ── Insurance ─────────────────────────────────────────────────────────────

    /** Whether the given contract type is subject to insurance deductions. */
    public boolean isInsuranceEligible(String contractType) {
        JsonNode eligible = insuranceConfig.path("eligible_contract_types");
        for (JsonNode node : eligible) {
            if (node.asText().equalsIgnoreCase(contractType)) return true;
        }
        return false;
    }

    public double getBhxhRate()         { return insuranceConfig.path("employee_rates").path("bhxh").asDouble(0.08); }
    public double getBhytRate()         { return insuranceConfig.path("employee_rates").path("bhyt").asDouble(0.015); }
    public double getBhtnRate()         { return insuranceConfig.path("employee_rates").path("bhtn").asDouble(0.01); }
    public long   getInsuranceCeiling() { return insuranceConfig.path("insurance_ceiling").asLong(INSURANCE_CEILING); }

    /** Statutory minimum wage (VND/month). BHXH cap = 20 × this value. Default: 2,340,000 VND (2026). */
    public long getStatutoryMinimumWage() {
        return insuranceConfig.path("statutory_min_wage").asLong(2_340_000L);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private JsonNode loadActive(String configType) {
        SystemConfig config = configRepo.findByConfigTypeAndActiveTrue(configType)
                .orElseThrow(() -> new IllegalStateException(
                        "No active payroll config found in DB for type: " + configType));
        return config.getConfigData();
    }


    private JsonNode load(String filename) {
        try (InputStream is = new ClassPathResource(CONFIG_BASE + filename).getInputStream()) {
            return mapper.readTree(is);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to load payroll config: " + filename, e);
        }
    }
}
