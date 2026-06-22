package org.dummy.facez.domain.payroll.service;

import org.dummy.facez.common.enums.ConfigStatus;
import org.dummy.facez.domain.payroll.dto.EffectiveConfigResponse;
import org.dummy.facez.domain.payroll.model.*;
import org.dummy.facez.domain.payroll.repository.AllowanceConfigRepository;
import org.dummy.facez.domain.payroll.repository.InsuranceConfigRepository;
import org.dummy.facez.domain.payroll.repository.PitConfigRepository;
import org.dummy.facez.domain.payroll.repository.SalaryGradeConfigRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Reads payroll configuration from the typed, effective-dated config tables.
 * <p>
 * For a payroll period, each lookup resolves the latest {@code PUBLISHED} version whose
 * {@code effectiveFrom <= period} — so re-computing an old month uses the rules that were in
 * force then, not today's. Resolved versions are cached per (type, period); {@link #invalidate()}
 * clears the cache after a publish.
 */
@Service
public class PayrollConfigService {

    /** Standard working days per month (company default). */
    public static final int DEFAULT_STANDARD_DAYS = 26;

    /** Insurance ceiling fallback if config is missing (Decree 293/2025/NĐ-CP). */
    public static final long INSURANCE_CEILING = 46_800_000L;

    private final SalaryGradeConfigRepository salaryGradeRepo;
    private final AllowanceConfigRepository   allowanceRepo;
    private final PitConfigRepository         pitRepo;
    private final InsuranceConfigRepository   insuranceRepo;

    private final Map<LocalDate, SalaryGradeConfig> salaryCache   = new ConcurrentHashMap<>();
    private final Map<LocalDate, AllowanceConfig>   allowanceCache = new ConcurrentHashMap<>();
    private final Map<LocalDate, PitConfig>         pitCache      = new ConcurrentHashMap<>();
    private final Map<LocalDate, InsuranceConfig>   insuranceCache = new ConcurrentHashMap<>();

    public PayrollConfigService(SalaryGradeConfigRepository salaryGradeRepo,
                                AllowanceConfigRepository allowanceRepo,
                                PitConfigRepository pitRepo,
                                InsuranceConfigRepository insuranceRepo) {
        this.salaryGradeRepo = salaryGradeRepo;
        this.allowanceRepo   = allowanceRepo;
        this.pitRepo         = pitRepo;
        this.insuranceRepo   = insuranceRepo;
    }

    /** Drop all resolved-config caches. Call after a config version is published. */
    public void invalidate() {
        salaryCache.clear();
        allowanceCache.clear();
        pitCache.clear();
        insuranceCache.clear();
    }

    // ── Salary grade ──────────────────────────────────────────────────────────

    /**
     * Returns Li — the position coefficient amount in VND for the given period.
     *
     * @param positionCode grade code (e.g. NV1, TL1, BOD)
     * @param salaryStep   1-based step number (1–10)
     */
    public long getPositionCoefficient(String positionCode, int salaryStep, LocalDate period) {
        SalaryGradeConfig cfg = salaryGrade(period);
        SalaryGrade grade = cfg.getGrades().stream()
                .filter(g -> g.getGradeCode().equalsIgnoreCase(positionCode))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown position code: " + positionCode));
        SalaryGradeStep step = grade.getSteps().stream()
                .filter(s -> s.getStepNo() == salaryStep)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Salary step " + salaryStep + " out of range for " + positionCode));
        // amounts are stored in thousand VND
        return step.getAmountThousandVnd() * 1_000L;
    }

    // ── Living allowance (HT2) ────────────────────────────────────────────────

    /** Full-month living allowance (HT2) for the given level key, or 0 if undefined. */
    public long getLivingAllowance(String levelKey, LocalDate period) {
        return allowance(period).getLevels().stream()
                .filter(l -> l.getLevelKey().equalsIgnoreCase(levelKey))
                .findFirst()
                .map(l -> l.getMeal() + l.getPhone() + l.getTransport() + l.getHousing())
                .orElse(0L);
    }

    // ── Japanese allowance (HT1) ──────────────────────────────────────────────

    /** HT1 Japanese language allowance (not prorated); 0 for null/empty/unknown. */
    public long getJapaneseAllowance(String jlptLevel, LocalDate period) {
        if (jlptLevel == null || jlptLevel.isBlank()) return 0L;
        return allowance(period).getJapaneseLevels().stream()
                .filter(j -> j.getJlptLevel().equalsIgnoreCase(jlptLevel))
                .findFirst()
                .map(JapaneseAllowanceLevel::getAmount)
                .orElse(0L);
    }

    // ── PIT ───────────────────────────────────────────────────────────────────

    /** Personal relief amount for the given period (VND/month). */
    public long getPersonalRelief(LocalDate period) {
        return pit(period).getPersonalRelief();
    }

    /** Per-dependent relief amount for the given period (VND/month). */
    public long getDependentRelief(LocalDate period) {
        return pit(period).getDependentRelief();
    }

    /**
     * Calculates PIT using progressive brackets in force for the period.
     * Quick-deduction formula: income × rate − quick_deduction.
     */
    public long calculatePit(long taxableIncome, LocalDate period) {
        if (taxableIncome <= 0) return 0L;
        PitConfig cfg = pit(period);
        PitBracket bracket = cfg.getBrackets().stream()
                .filter(b -> taxableIncome >= b.getIncomeFrom())
                .max(Comparator.comparingLong(PitBracket::getIncomeFrom))
                .orElse(null);
        if (bracket == null) return 0L;
        return Math.max(0L, (long) (taxableIncome * bracket.getRate()) - bracket.getQuickDeduction());
    }

    // ── Insurance ─────────────────────────────────────────────────────────────

    /** Whether the given contract type is subject to insurance deductions in the period. */
    public boolean isInsuranceEligible(String contractType, LocalDate period) {
        return insurance(period).getEligibleContractTypes().stream()
                .anyMatch(t -> t.getContractType().equalsIgnoreCase(contractType));
    }

    public double getBhxhRate(LocalDate period) { return insurance(period).getEeBhxh(); }
    public double getBhytRate(LocalDate period) { return insurance(period).getEeBhyt(); }
    public double getBhtnRate(LocalDate period) { return insurance(period).getEeBhtn(); }

    /** Employer BHXH rate = pension + sickness/maternity (accident is separate). */
    public double getEmployerBhxhRate(LocalDate period) {
        InsuranceConfig c = insurance(period);
        return c.getErBhxhPension() + c.getErBhxhSicknessMaternity();
    }
    public double getEmployerBhytRate(LocalDate period)     { return insurance(period).getErBhyt(); }
    public double getEmployerBhtnRate(LocalDate period)     { return insurance(period).getErBhtn(); }
    public double getEmployerAccidentRate(LocalDate period) { return insurance(period).getErBhxhAccident(); }

    public long getInsuranceCeiling(LocalDate period) {
        Long ceiling = insurance(period).getInsuranceCeiling();
        return ceiling != null ? ceiling : INSURANCE_CEILING;
    }

    /** Statutory minimum wage (VND/month). BHXH cap = 20 × this value. */
    public long getStatutoryMinimumWage(LocalDate period) {
        Long min = insurance(period).getStatutoryMinWage();
        return min != null ? min : 2_340_000L;
    }

    // ── Effective-config summary (transparency for Finance) ─────────────────────

    /**
     * The PUBLISHED version each config type resolves to for the given period — same selection
     * the engine uses at calc time. {@code found=false} means no PUBLISHED version is effective.
     */
    public List<EffectiveConfigResponse> effectiveConfigs(int year, int month) {
        LocalDate p = LocalDate.of(year, month, 1);
        List<EffectiveConfigResponse> out = new ArrayList<>();

        SalaryGradeConfig sg = salaryGradeRepo
                .findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(ConfigStatus.PUBLISHED, p)
                .orElse(null);
        out.add(EffectiveConfigResponse.builder().configType("SALARY_GRADE")
                .id(sg != null ? sg.getId() : null)
                .effectiveFrom(sg != null ? sg.getEffectiveFrom() : null)
                .legalBasis(sg != null ? sg.getLegalBasis() : null)
                .found(sg != null).build());

        AllowanceConfig al = allowanceRepo
                .findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(ConfigStatus.PUBLISHED, p)
                .orElse(null);
        out.add(EffectiveConfigResponse.builder().configType("ALLOWANCE")
                .id(al != null ? al.getId() : null)
                .effectiveFrom(al != null ? al.getEffectiveFrom() : null)
                .legalBasis(al != null ? al.getLegalBasis() : null)
                .found(al != null).build());

        PitConfig pit = pitRepo
                .findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(ConfigStatus.PUBLISHED, p)
                .orElse(null);
        out.add(EffectiveConfigResponse.builder().configType("PIT")
                .id(pit != null ? pit.getId() : null)
                .effectiveFrom(pit != null ? pit.getEffectiveFrom() : null)
                .legalBasis(pit != null ? pit.getLegalBasis() : null)
                .found(pit != null).build());

        InsuranceConfig ins = insuranceRepo
                .findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(ConfigStatus.PUBLISHED, p)
                .orElse(null);
        out.add(EffectiveConfigResponse.builder().configType("INSURANCE")
                .id(ins != null ? ins.getId() : null)
                .effectiveFrom(ins != null ? ins.getEffectiveFrom() : null)
                .legalBasis(ins != null ? ins.getLegalBasis() : null)
                .found(ins != null).build());

        return out;
    }

    // ── Internal resolution + cache ─────────────────────────────────────────────

    private SalaryGradeConfig salaryGrade(LocalDate period) {
        return salaryCache.computeIfAbsent(period, p -> salaryGradeRepo
                .findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(ConfigStatus.PUBLISHED, p)
                .orElseThrow(() -> missing("SALARY_GRADE", p)));
    }

    private AllowanceConfig allowance(LocalDate period) {
        return allowanceCache.computeIfAbsent(period, p -> allowanceRepo
                .findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(ConfigStatus.PUBLISHED, p)
                .orElseThrow(() -> missing("ALLOWANCE", p)));
    }

    private PitConfig pit(LocalDate period) {
        return pitCache.computeIfAbsent(period, p -> pitRepo
                .findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(ConfigStatus.PUBLISHED, p)
                .orElseThrow(() -> missing("PIT", p)));
    }

    private InsuranceConfig insurance(LocalDate period) {
        return insuranceCache.computeIfAbsent(period, p -> insuranceRepo
                .findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(ConfigStatus.PUBLISHED, p)
                .orElseThrow(() -> missing("INSURANCE", p)));
    }

    private IllegalStateException missing(String type, LocalDate period) {
        return new IllegalStateException(
                "No PUBLISHED " + type + " payroll config effective on or before " + period);
    }
}
