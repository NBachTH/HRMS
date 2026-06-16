package org.dummy.facez.domain.payroll.service;

import org.dummy.facez.common.enums.ConfigStatus;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.domain.payroll.dto.*;
import org.dummy.facez.domain.payroll.model.*;
import org.dummy.facez.domain.payroll.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Maker-checker management of the typed, effective-dated payroll config tables.
 * FINANCE_ADMIN creates DRAFTs; DIRECTOR/SYSTEM_ADMIN publish (enforced in the controller).
 * Publishing makes a version eligible for the engine and invalidates the reader cache.
 */
@Service
public class PayrollConfigAdminService {

    // AllowanceRuleValue.kind discriminators
    private static final String LIVING_ELIGIBLE      = "LIVING_ELIGIBLE";
    private static final String JP_ELIGIBLE          = "JP_ELIGIBLE";
    private static final String JP_EXCLUDED_POSITION = "JP_EXCLUDED_POSITION";
    private static final String JP_EXCLUDED_LEVEL    = "JP_EXCLUDED_LEVEL";

    private final SalaryGradeConfigRepository salaryRepo;
    private final PitConfigRepository         pitRepo;
    private final InsuranceConfigRepository   insuranceRepo;
    private final AllowanceConfigRepository   allowanceRepo;
    private final PayrollConfigService        reader;

    public PayrollConfigAdminService(SalaryGradeConfigRepository salaryRepo,
                                     PitConfigRepository pitRepo,
                                     InsuranceConfigRepository insuranceRepo,
                                     AllowanceConfigRepository allowanceRepo,
                                     PayrollConfigService reader) {
        this.salaryRepo    = salaryRepo;
        this.pitRepo       = pitRepo;
        this.insuranceRepo = insuranceRepo;
        this.allowanceRepo = allowanceRepo;
        this.reader        = reader;
    }

    private static String uid() { return UUID.randomUUID().toString(); }

    // ════════════════════════════ SALARY GRADE ════════════════════════════════

    public List<SalaryGradeConfigResponse> listSalaryGrade() {
        return salaryRepo.findAllByOrderByEffectiveFromDesc().stream()
                .map(this::toSalaryResponse).collect(Collectors.toList());
    }

    public SalaryGradeConfigResponse getSalaryGrade(String id) {
        return toSalaryResponse(salaryRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SalaryGradeConfig", "id", id)));
    }

    @Transactional
    public SalaryGradeConfigResponse createSalaryGrade(SalaryGradeConfigRequest req) {
        SalaryGradeConfig cfg = SalaryGradeConfig.builder()
                .id(uid())
                .effectiveFrom(req.getEffectiveFrom())
                .status(ConfigStatus.DRAFT)
                .legalBasis(req.getLegalBasis())
                .unit(req.getUnit() != null ? req.getUnit() : "thousand_vnd")
                .minimumWageRegionI(req.getMinimumWageRegionI())
                .build();
        for (SalaryGradeConfigRequest.GradeItem gi : req.getGrades()) {
            SalaryGrade grade = SalaryGrade.builder()
                    .id(uid()).config(cfg)
                    .gradeCode(gi.getGradeCode()).title(gi.getTitle()).track(gi.getTrack())
                    .build();
            List<Long> steps = gi.getSteps();
            for (int i = 0; i < steps.size(); i++) {
                grade.getSteps().add(SalaryGradeStep.builder()
                        .id(uid()).grade(grade).stepNo(i + 1).amountThousandVnd(steps.get(i))
                        .build());
            }
            cfg.getGrades().add(grade);
        }
        return toSalaryResponse(salaryRepo.save(cfg));
    }

    @Transactional
    public SalaryGradeConfigResponse publishSalaryGrade(String id) {
        SalaryGradeConfig cfg = salaryRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SalaryGradeConfig", "id", id));
        publishGuard(cfg.getStatus(), salaryRepo.findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
                ConfigStatus.PUBLISHED, cfg.getEffectiveFrom()).filter(c -> c.getEffectiveFrom().equals(cfg.getEffectiveFrom())).isPresent());
        cfg.setStatus(ConfigStatus.PUBLISHED);
        salaryRepo.save(cfg);
        reader.invalidate();
        return toSalaryResponse(cfg);
    }

    @Transactional
    public void deleteSalaryGrade(String id) {
        SalaryGradeConfig cfg = salaryRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SalaryGradeConfig", "id", id));
        deleteGuard(cfg.getStatus());
        salaryRepo.delete(cfg);
    }

    private SalaryGradeConfigResponse toSalaryResponse(SalaryGradeConfig c) {
        return SalaryGradeConfigResponse.builder()
                .id(c.getId()).effectiveFrom(c.getEffectiveFrom()).status(c.getStatus().name())
                .legalBasis(c.getLegalBasis()).unit(c.getUnit()).minimumWageRegionI(c.getMinimumWageRegionI())
                .grades(c.getGrades().stream().map(g -> SalaryGradeConfigResponse.GradeItem.builder()
                        .gradeCode(g.getGradeCode()).title(g.getTitle()).track(g.getTrack())
                        .steps(g.getSteps().stream()
                                .sorted((a, b) -> Integer.compare(a.getStepNo(), b.getStepNo()))
                                .map(SalaryGradeStep::getAmountThousandVnd).collect(Collectors.toList()))
                        .build()).collect(Collectors.toList()))
                .createdBy(c.getCreatedBy()).updatedBy(c.getUpdatedBy())
                .createdAt(c.getCreatedAt()).updatedAt(c.getUpdatedAt())
                .build();
    }

    // ════════════════════════════════ PIT ═════════════════════════════════════

    public List<PitConfigResponse> listPit() {
        return pitRepo.findAllByOrderByEffectiveFromDesc().stream()
                .map(this::toPitResponse).collect(Collectors.toList());
    }

    public PitConfigResponse getPit(String id) {
        return toPitResponse(pitRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PitConfig", "id", id)));
    }

    @Transactional
    public PitConfigResponse createPit(PitConfigRequest req) {
        PitConfig cfg = PitConfig.builder()
                .id(uid()).effectiveFrom(req.getEffectiveFrom()).status(ConfigStatus.DRAFT)
                .legalBasis(req.getLegalBasis()).resolution(req.getResolution())
                .personalRelief(req.getPersonalRelief()).dependentRelief(req.getDependentRelief())
                .build();
        List<PitConfigRequest.BracketItem> items = req.getBrackets();
        IntStream.range(0, items.size()).forEach(i -> {
            PitConfigRequest.BracketItem b = items.get(i);
            cfg.getBrackets().add(PitBracket.builder()
                    .id(uid()).config(cfg).seq(i + 1)
                    .incomeFrom(b.getIncomeFrom()).incomeTo(b.getIncomeTo())
                    .rate(b.getRate()).quickDeduction(b.getQuickDeduction() != null ? b.getQuickDeduction() : 0L)
                    .build());
        });
        return toPitResponse(pitRepo.save(cfg));
    }

    @Transactional
    public PitConfigResponse publishPit(String id) {
        PitConfig cfg = pitRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PitConfig", "id", id));
        publishGuard(cfg.getStatus(), pitRepo.findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
                ConfigStatus.PUBLISHED, cfg.getEffectiveFrom()).filter(c -> c.getEffectiveFrom().equals(cfg.getEffectiveFrom())).isPresent());
        cfg.setStatus(ConfigStatus.PUBLISHED);
        pitRepo.save(cfg);
        reader.invalidate();
        return toPitResponse(cfg);
    }

    @Transactional
    public void deletePit(String id) {
        PitConfig cfg = pitRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PitConfig", "id", id));
        deleteGuard(cfg.getStatus());
        pitRepo.delete(cfg);
    }

    private PitConfigResponse toPitResponse(PitConfig c) {
        return PitConfigResponse.builder()
                .id(c.getId()).effectiveFrom(c.getEffectiveFrom()).status(c.getStatus().name())
                .legalBasis(c.getLegalBasis()).resolution(c.getResolution())
                .personalRelief(c.getPersonalRelief()).dependentRelief(c.getDependentRelief())
                .brackets(c.getBrackets().stream()
                        .sorted((a, b) -> Integer.compare(a.getSeq(), b.getSeq()))
                        .map(b -> PitConfigResponse.BracketItem.builder()
                                .seq(b.getSeq()).incomeFrom(b.getIncomeFrom()).incomeTo(b.getIncomeTo())
                                .rate(b.getRate()).quickDeduction(b.getQuickDeduction()).build())
                        .collect(Collectors.toList()))
                .createdBy(c.getCreatedBy()).updatedBy(c.getUpdatedBy())
                .createdAt(c.getCreatedAt()).updatedAt(c.getUpdatedAt())
                .build();
    }

    // ════════════════════════════ INSURANCE ═══════════════════════════════════

    public List<InsuranceConfigResponse> listInsurance() {
        return insuranceRepo.findAllByOrderByEffectiveFromDesc().stream()
                .map(this::toInsuranceResponse).collect(Collectors.toList());
    }

    public InsuranceConfigResponse getInsurance(String id) {
        return toInsuranceResponse(insuranceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("InsuranceConfig", "id", id)));
    }

    @Transactional
    public InsuranceConfigResponse createInsurance(InsuranceConfigRequest req) {
        InsuranceConfig cfg = InsuranceConfig.builder()
                .id(uid()).effectiveFrom(req.getEffectiveFrom()).status(ConfigStatus.DRAFT)
                .legalBasis(req.getLegalBasis())
                .governmentBaseSalary(req.getGovernmentBaseSalary())
                .insuranceCeiling(req.getInsuranceCeiling())
                .statutoryMinWage(req.getStatutoryMinWage())
                .eeBhxh(req.getEeBhxh()).eeBhyt(req.getEeBhyt()).eeBhtn(req.getEeBhtn())
                .erBhxhPension(req.getErBhxhPension()).erBhxhSicknessMaternity(req.getErBhxhSicknessMaternity())
                .erBhxhAccident(req.getErBhxhAccident()).erBhyt(req.getErBhyt()).erBhtn(req.getErBhtn())
                .probationExempt(req.isProbationExempt())
                .build();
        for (String ct : req.getEligibleContractTypes()) {
            cfg.getEligibleContractTypes().add(InsuranceEligibleContractType.builder()
                    .id(uid()).config(cfg).contractType(ct).build());
        }
        return toInsuranceResponse(insuranceRepo.save(cfg));
    }

    @Transactional
    public InsuranceConfigResponse publishInsurance(String id) {
        InsuranceConfig cfg = insuranceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("InsuranceConfig", "id", id));
        publishGuard(cfg.getStatus(), insuranceRepo.findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
                ConfigStatus.PUBLISHED, cfg.getEffectiveFrom()).filter(c -> c.getEffectiveFrom().equals(cfg.getEffectiveFrom())).isPresent());
        cfg.setStatus(ConfigStatus.PUBLISHED);
        insuranceRepo.save(cfg);
        reader.invalidate();
        return toInsuranceResponse(cfg);
    }

    @Transactional
    public void deleteInsurance(String id) {
        InsuranceConfig cfg = insuranceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("InsuranceConfig", "id", id));
        deleteGuard(cfg.getStatus());
        insuranceRepo.delete(cfg);
    }

    private InsuranceConfigResponse toInsuranceResponse(InsuranceConfig c) {
        return InsuranceConfigResponse.builder()
                .id(c.getId()).effectiveFrom(c.getEffectiveFrom()).status(c.getStatus().name())
                .legalBasis(c.getLegalBasis())
                .governmentBaseSalary(c.getGovernmentBaseSalary())
                .insuranceCeiling(c.getInsuranceCeiling())
                .statutoryMinWage(c.getStatutoryMinWage())
                .eeBhxh(c.getEeBhxh()).eeBhyt(c.getEeBhyt()).eeBhtn(c.getEeBhtn())
                .erBhxhPension(c.getErBhxhPension()).erBhxhSicknessMaternity(c.getErBhxhSicknessMaternity())
                .erBhxhAccident(c.getErBhxhAccident()).erBhyt(c.getErBhyt()).erBhtn(c.getErBhtn())
                .probationExempt(c.isProbationExempt())
                .eligibleContractTypes(c.getEligibleContractTypes().stream()
                        .map(InsuranceEligibleContractType::getContractType).collect(Collectors.toList()))
                .createdBy(c.getCreatedBy()).updatedBy(c.getUpdatedBy())
                .createdAt(c.getCreatedAt()).updatedAt(c.getUpdatedAt())
                .build();
    }

    // ════════════════════════════ ALLOWANCE ═══════════════════════════════════

    public List<AllowanceConfigResponse> listAllowance() {
        return allowanceRepo.findAllByOrderByEffectiveFromDesc().stream()
                .map(this::toAllowanceResponse).collect(Collectors.toList());
    }

    public AllowanceConfigResponse getAllowance(String id) {
        return toAllowanceResponse(allowanceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AllowanceConfig", "id", id)));
    }

    @Transactional
    public AllowanceConfigResponse createAllowance(AllowanceConfigRequest req) {
        AllowanceConfig cfg = AllowanceConfig.builder()
                .id(uid()).effectiveFrom(req.getEffectiveFrom()).status(ConfigStatus.DRAFT)
                .legalBasis(req.getLegalBasis())
                .livingProrated(req.isLivingProrated()).japaneseProrated(req.isJapaneseProrated())
                .japaneseMinContractMonths(req.getJapaneseMinContractMonths())
                .build();
        for (AllowanceConfigRequest.LivingLevel l : req.getLevels()) {
            cfg.getLevels().add(AllowanceLevel.builder()
                    .id(uid()).config(cfg).levelKey(l.getLevelKey())
                    .meal(l.getMeal()).phone(l.getPhone()).transport(l.getTransport()).housing(l.getHousing())
                    .build());
        }
        for (AllowanceConfigRequest.JapaneseLevel j : req.getJapaneseLevels()) {
            cfg.getJapaneseLevels().add(JapaneseAllowanceLevel.builder()
                    .id(uid()).config(cfg).jlptLevel(j.getJlptLevel()).amount(j.getAmount()).build());
        }
        addRules(cfg, LIVING_ELIGIBLE, req.getLivingEligibleContracts());
        addRules(cfg, JP_ELIGIBLE, req.getJapaneseEligibleContracts());
        addRules(cfg, JP_EXCLUDED_POSITION, req.getJapaneseExcludedPositions());
        addRules(cfg, JP_EXCLUDED_LEVEL, req.getJapaneseExcludedLevels());
        return toAllowanceResponse(allowanceRepo.save(cfg));
    }

    @Transactional
    public AllowanceConfigResponse publishAllowance(String id) {
        AllowanceConfig cfg = allowanceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AllowanceConfig", "id", id));
        publishGuard(cfg.getStatus(), allowanceRepo.findFirstByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
                ConfigStatus.PUBLISHED, cfg.getEffectiveFrom()).filter(c -> c.getEffectiveFrom().equals(cfg.getEffectiveFrom())).isPresent());
        cfg.setStatus(ConfigStatus.PUBLISHED);
        allowanceRepo.save(cfg);
        reader.invalidate();
        return toAllowanceResponse(cfg);
    }

    @Transactional
    public void deleteAllowance(String id) {
        AllowanceConfig cfg = allowanceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AllowanceConfig", "id", id));
        deleteGuard(cfg.getStatus());
        allowanceRepo.delete(cfg);
    }

    private void addRules(AllowanceConfig cfg, String kind, List<String> values) {
        if (values == null) return;
        for (String v : values) {
            cfg.getRuleValues().add(AllowanceRuleValue.builder()
                    .id(uid()).config(cfg).kind(kind).value(v).build());
        }
    }

    private List<String> rules(AllowanceConfig cfg, String kind) {
        return cfg.getRuleValues().stream()
                .filter(r -> r.getKind().equals(kind))
                .map(AllowanceRuleValue::getValue).collect(Collectors.toList());
    }

    private AllowanceConfigResponse toAllowanceResponse(AllowanceConfig c) {
        return AllowanceConfigResponse.builder()
                .id(c.getId()).effectiveFrom(c.getEffectiveFrom()).status(c.getStatus().name())
                .legalBasis(c.getLegalBasis())
                .livingProrated(c.isLivingProrated()).japaneseProrated(c.isJapaneseProrated())
                .japaneseMinContractMonths(c.getJapaneseMinContractMonths())
                .levels(c.getLevels().stream().map(l -> AllowanceConfigResponse.LivingLevel.builder()
                        .levelKey(l.getLevelKey()).meal(l.getMeal()).phone(l.getPhone())
                        .transport(l.getTransport()).housing(l.getHousing()).build())
                        .collect(Collectors.toList()))
                .japaneseLevels(c.getJapaneseLevels().stream().map(j -> AllowanceConfigResponse.JapaneseLevel.builder()
                        .jlptLevel(j.getJlptLevel()).amount(j.getAmount()).build())
                        .collect(Collectors.toList()))
                .livingEligibleContracts(rules(c, LIVING_ELIGIBLE))
                .japaneseEligibleContracts(rules(c, JP_ELIGIBLE))
                .japaneseExcludedPositions(rules(c, JP_EXCLUDED_POSITION))
                .japaneseExcludedLevels(rules(c, JP_EXCLUDED_LEVEL))
                .createdBy(c.getCreatedBy()).updatedBy(c.getUpdatedBy())
                .createdAt(c.getCreatedAt()).updatedAt(c.getUpdatedAt())
                .build();
    }

    // ════════════════════════════ Guards ══════════════════════════════════════

    private void publishGuard(ConfigStatus current, boolean clashingPublishedExists) {
        if (current == ConfigStatus.PUBLISHED) {
            throw new BadRequestException("This config version is already published.");
        }
        if (clashingPublishedExists) {
            throw new BadRequestException(
                    "Another PUBLISHED version already has this effective date. Archive it first or change the date.");
        }
    }

    private void deleteGuard(ConfigStatus current) {
        if (current != ConfigStatus.DRAFT) {
            throw new BadRequestException("Only DRAFT config versions can be deleted.");
        }
    }
}
