package org.dummy.facez.domain.payroll.service;

import org.dummy.facez.common.enums.PayrollStatus;
import org.dummy.facez.common.enums.WorkDayType;
import org.dummy.facez.domain.attendance.repository.PublicHolidayRepository;
import org.dummy.facez.domain.contract.model.Contract;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.otrequest.model.OTRequest;
import org.dummy.facez.domain.payroll.model.Payroll;
import org.dummy.facez.domain.workday.model.WorkDay;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Pure computation component — no DB writes, no transactions.
 * Accepts pre-loaded domain objects and returns a DRAFT {@link Payroll} entity.
 */
@Component
public class PayrollCalculationEngine {

    private final PayrollConfigService configService;
    private final PublicHolidayRepository publicHolidayRepository;

    public PayrollCalculationEngine(PayrollConfigService configService,
                                    PublicHolidayRepository publicHolidayRepository) {
        this.configService = configService;
        this.publicHolidayRepository = publicHolidayRepository;
    }

    public Payroll buildPayroll(
            String employeeId,
            int year, int month, int nt,
            Contract contract,
            List<WorkDay> workDays,
            List<OTRequest> otRequests,
            String kpi1Rating,
            String kpi2Rating,
            String japaneseLevel,
            long odcAllowance,
            long bonus,
            String notes,
            Double kpi1Override,
            Double kpi2Override) {

        // Config in force for this payroll period (effective-dated lookup).
        LocalDate period = LocalDate.of(year, month, 1);

        // Step 1 — NCtt: actual paid working days (presence + paid leave + holidays), from WorkDay
        int nctt = computeActualWorkingDays(workDays);

        // Step 2 — Li: position coefficient
        long li = configService.getPositionCoefficient(contract.getPositionCode(), contract.getSalaryStep(), period);

        // Step 3 — KPItb. For MANAGER/DIRECTOR the orchestrator passes a unit/company average override.
        double kpi1   = kpi1Override != null ? kpi1Override : resolveKpi1(kpi1Rating);
        double kpi2   = kpi2Override != null ? kpi2Override : resolveKpi2(kpi2Rating, workDays);
        double kpiAvg = (kpi1 + kpi2) / 2.0;

        // Step 4 — HTi allowances
        long lhq     = contract.getBaseSalary();
        String levelKey = positionCodeToLevelKey(contract.getPositionCode());
        long ht2Full    = configService.getLivingAllowance(levelKey, period);
        long ht2Prorated = nt > 0 ? Math.round(ht2Full * (double) nctt / nt) : 0L;
        long ht1        = configService.getJapaneseAllowance(japaneseLevel, period);
        long hti        = ht2Prorated + ht1 + odcAllowance;

        // Step 5 — Base gross: [(Lhq × KPItb) + Li + HTi] × (NCtt / Nt)
        long baseGross = nt > 0
                ? Math.round(((lhq * kpiAvg) + li + hti) * (double) nctt / nt)
                : 0L;

        // Step 6 — OT pay
        long otPay      = computeOtPay(otRequests, lhq, nt);
        long totalGross = baseGross + otPay + bonus;

        // Step 7 — Insurance deductions (employee portion with BHXH cap)
        long insuranceBase = 0L;
        long bhxh = 0L, bhyt = 0L, bhtn = 0L;
        long bhxhEmp = 0L, bhytEmp = 0L, bhtnEmp = 0L, accidentIns = 0L;

        if (configService.isInsuranceEligible(contract.getContractType(), period)) {
            long lcb = contract.getInsuranceBase() != null ? contract.getInsuranceBase() : lhq;
            // Phase 7.1: BHXH cap at 20 × statutory minimum wage
            long statutoryMinWage = configService.getStatutoryMinimumWage(period);
            insuranceBase = Math.min(lcb, 20L * statutoryMinWage);

            bhxh = Math.round(insuranceBase * configService.getBhxhRate(period));
            bhyt = Math.round(insuranceBase * configService.getBhytRate(period));
            bhtn = Math.round(insuranceBase * configService.getBhtnRate(period));

            // Employer contributions (rates from the effective insurance config)
            bhxhEmp     = Math.round(insuranceBase * configService.getEmployerBhxhRate(period));
            bhytEmp     = Math.round(insuranceBase * configService.getEmployerBhytRate(period));
            bhtnEmp     = Math.round(insuranceBase * configService.getEmployerBhtnRate(period));
            accidentIns = Math.round(insuranceBase * configService.getEmployerAccidentRate(period));
        }

        long totalEmployerContributions = bhxhEmp + bhytEmp + bhtnEmp + accidentIns;
        long totalEmploymentCost        = totalGross + totalEmployerContributions;

        // Step 8 — Taxable income & PIT
        int  dependentCount  = contract.getDependentCount() != null ? contract.getDependentCount() : 0;
        long personalRelief  = configService.getPersonalRelief(period);
        long dependentRelief = configService.getDependentRelief(period) * dependentCount;
        long taxableIncome   = Math.max(0L, totalGross - bhxh - bhyt - bhtn - personalRelief - dependentRelief);
        long pit             = configService.calculatePit(taxableIncome, period);

        // Step 9 — Net salary
        long netSalary = totalGross - bhxh - bhyt - bhtn - pit;

        // Step 10 — Assemble entity (not persisted)
        EmployeeInfo empRef = new EmployeeInfo();
        empRef.setEmployeeId(employeeId);

        return Payroll.builder()
                .payrollId(UUID.randomUUID().toString())
                .employeeInfo(empRef)
                .payrollYear(year)
                .payrollMonth(month)
                .performanceSalary(lhq)
                .positionCoefficient(li)
                .livingAllowance(ht2Prorated)
                .languageAllowance(ht1)
                .odcAllowance(odcAllowance)
                .kpi1Score(kpi1)
                .kpi2Score(kpi2)
                .kpiAverage(kpiAvg)
                .actualWorkingDays(nctt)
                .standardWorkingDays(nt)
                .otPay(otPay)
                .bonus(bonus)
                .baseGross(baseGross)
                .totalGross(totalGross)
                .insuranceBase(insuranceBase)
                .bhxhEmployee(bhxh)
                .bhytEmployee(bhyt)
                .bhtnEmployee(bhtn)
                .bhxhEmployer(bhxhEmp)
                .bhytEmployer(bhytEmp)
                .bhtnEmployer(bhtnEmp)
                .workplaceAccidentInsurance(accidentIns)
                .totalEmployerContributions(totalEmployerContributions)
                .totalEmploymentCost(totalEmploymentCost)
                .dependentCount(dependentCount)
                .taxableIncome(taxableIncome)
                .pit(pit)
                .netSalary(netSalary)
                .status(PayrollStatus.DRAFT)
                .notes(notes)
                // createdAt / updatedAt are set by JPA auditing (AuditableEntity) on persist.
                .build();
    }

    // ── Private helpers ────────────────────────────────────────────────────

    /** Sum of paid days across the month's WorkDays (present + paid leave + holidays). */
    private int computeActualWorkingDays(List<WorkDay> workDays) {
        BigDecimal sum = workDays.stream()
                .map(w -> w.getPaidDay() != null ? w.getPaidDay() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.setScale(0, RoundingMode.HALF_UP).intValue();
    }

    /**
     * Phase 6.2: Proportional night supplement.
     * Calculates OT pay by splitting each request into day and night minutes.
     * Night period: 22:00–06:00. Night adds +0.3 on top of the base rate.
     */
    private long computeOtPay(List<OTRequest> approvedOt, long lhq, int nt) {
        double hourlyWage = nt > 0 ? (double) lhq / (nt * 8) : 0.0;
        long totalOtPay = 0L;

        for (OTRequest ot : approvedOt) {
            if (ot.getStartTime() == null || ot.getEndTime() == null) continue;

            double totalMinutes = Duration.between(ot.getStartTime(), ot.getEndTime()).toMinutes();
            if (totalMinutes <= 0) continue;

            DayOfWeek dow = ot.getStartTime().getDayOfWeek();
            boolean isPublicHoliday = publicHolidayRepository.existsByHolidayDate(ot.getStartTime().toLocalDate());
            boolean isWeekend = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY);

            double baseRate;
            if (isPublicHoliday) baseRate = 3.0;
            else if (isWeekend)  baseRate = 2.0;
            else                 baseRate = 1.5;

            double nightMinutes = calculateNightOverlapMinutes(ot.getStartTime(), ot.getEndTime());
            double dayMinutes   = totalMinutes - nightMinutes;

            double pay = (hourlyWage / 60.0) * (dayMinutes * baseRate + nightMinutes * (baseRate + 0.3));
            totalOtPay += Math.round(pay);
        }
        return totalOtPay;
    }

    /**
     * Returns minutes within [start, end) that fall in the statutory night period (22:00–06:00).
     * Minute-by-minute for correctness; optimise for production if needed.
     */
    private double calculateNightOverlapMinutes(LocalDateTime start, LocalDateTime end) {
        long totalMinutes = Duration.between(start, end).toMinutes();
        long nightMinutes = 0;
        for (long i = 0; i < totalMinutes; i++) {
            LocalDateTime cur = start.plusMinutes(i);
            int hour = cur.getHour();
            if (hour >= 22 || hour < 6) nightMinutes++;
        }
        return nightMinutes;
    }

    /** Public helpers so the orchestrator can compute unit/company KPI averages. */
    public double computeKpi2(List<WorkDay> workDays) { return resolveKpi2(null, workDays); }
    public double ratingToKpi1(String rating) { return resolveKpi1(rating); }

    private double resolveKpi1(String rating) {
        if (rating == null) return 1.00;
        return switch (rating.toUpperCase()) {
            case "A" -> 1.04;
            case "C" -> 0.98;
            default  -> 1.00;
        };
    }

    /**
     * KPI2 (attendance, 01/2020/QC-VTI):
     *   A = 1.04 — no attendance violation and no leave in the month
     *   B = 1.02 — no violation but took leave at least once
     *   C = 1.00 — has at least one attendance violation (late/early, &lt;8h, unnotified absence)
     * An explicit rating overrides the auto-derivation.
     */
    private double resolveKpi2(String rating, List<WorkDay> workDays) {
        if (rating != null && !rating.isBlank()) {
            return switch (rating.toUpperCase()) {
                case "A" -> 1.04;
                case "B" -> 1.02;
                default  -> 1.00;
            };
        }
        boolean hasViolation = workDays.stream().anyMatch(WorkDay::isViolation);
        if (hasViolation) return 1.00;
        boolean hasLeave = workDays.stream().anyMatch(w -> w.getType() == WorkDayType.LEAVE);
        return hasLeave ? 1.02 : 1.04;
    }

    private String positionCodeToLevelKey(String positionCode) {
        return switch (positionCode.toUpperCase()) {
            case "BOD"        -> "DIRECTOR";
            case "BOD2"       -> "DEPUTY_DIRECTOR";
            case "DL"         -> "DEPT_HEAD";
            case "TL1", "TL2" -> "SENIOR_STAFF_NV1";
            default           -> "NV2";
        };
    }
}
