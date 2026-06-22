package org.dummy.facez.domain.payroll.service;

import org.dummy.facez.common.enums.EmployeeStatus;
import org.dummy.facez.common.enums.PayrollStatus;
import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.common.enums.Role;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.attendance.repository.AttendancePeriodCloseRepository;
import org.dummy.facez.domain.contract.model.Contract;
import org.dummy.facez.domain.contract.repository.ContractRepository;
import org.dummy.facez.domain.department.model.Department;
import org.dummy.facez.domain.department.repository.DepartmentRepository;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.dummy.facez.domain.employee.service.EmployeeService;
import org.dummy.facez.domain.otrequest.model.OTRequest;
import org.dummy.facez.domain.otrequest.repository.OTRequestRepository;
import org.dummy.facez.domain.payroll.dto.PayrollResponse;
import org.dummy.facez.domain.payroll.dto.PayslipResponse;
import org.dummy.facez.domain.payroll.model.Payroll;
import org.dummy.facez.domain.payroll.repository.PayrollRepository;
import org.dummy.facez.domain.workday.model.WorkDay;
import org.dummy.facez.domain.workday.repository.WorkDayRepository;
import org.dummy.facez.domain.workday.repository.TimesheetRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Orchestrates single-employee payroll calculation.
 * Pure computation is delegated to {@link PayrollCalculationEngine} —
 * this service only handles DB access, validation, and persistence.
 */
@Service
public class PayrollService {

    private final PayrollRepository payrollRepository;
    private final ContractRepository contractRepository;
    private final WorkDayRepository workDayRepository;
    private final OTRequestRepository otRequestRepository;
    private final PayrollCalculationEngine calculationEngine;
    private final AttendancePeriodCloseRepository periodCloseRepository;
    private final EmployeeService employeeService;
    private final EmployeeInfoRepository employeeInfoRepository;
    private final DepartmentRepository departmentRepository;
    private final TimesheetRepository timesheetRepository;
    private final Kpi1Service kpi1Service;

    public PayrollService(PayrollRepository payrollRepository,
                          ContractRepository contractRepository,
                          WorkDayRepository workDayRepository,
                          OTRequestRepository otRequestRepository,
                          PayrollCalculationEngine calculationEngine,
                          AttendancePeriodCloseRepository periodCloseRepository,
                          EmployeeService employeeService,
                          EmployeeInfoRepository employeeInfoRepository,
                          DepartmentRepository departmentRepository,
                          TimesheetRepository timesheetRepository,
                          Kpi1Service kpi1Service) {
        this.payrollRepository    = payrollRepository;
        this.contractRepository   = contractRepository;
        this.workDayRepository    = workDayRepository;
        this.otRequestRepository  = otRequestRepository;
        this.calculationEngine    = calculationEngine;
        this.periodCloseRepository = periodCloseRepository;
        this.employeeService      = employeeService;
        this.employeeInfoRepository = employeeInfoRepository;
        this.departmentRepository = departmentRepository;
        this.timesheetRepository  = timesheetRepository;
        this.kpi1Service          = kpi1Service;
    }

    /**
     * Computes one payroll line for a run (no period/duplicate guard — the run owns its lines).
     * Returns the unsaved entity tagged with the run id; the caller persists it.
     */
    public Payroll calculateLine(String employeeId, int year, int month, String runId) {
        Contract contract = contractRepository.findContractByEmployeeInfo_EmployeeId(employeeId);
        if (contract == null || contract.getBaseSalary() == null || contract.getBaseSalary() <= 0
                || contract.getPositionCode() == null || contract.getSalaryStep() == null) {
            throw new BadRequestException("missing or invalid contract");
        }
        Integer ntTs = timesheetRepository.findByEmployeeInfo_EmployeeIdAndYearAndMonth(employeeId, year, month)
                .map(t -> t.getStandardWorkingDays()).orElse(null);
        int nt = (ntTs != null && ntTs > 0) ? ntTs : PayrollConfigService.DEFAULT_STANDARD_DAYS;

        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to   = YearMonth.of(year, month).atEndOfMonth();
        List<WorkDay> workDays = workDayRepository
                .findByEmployeeInfo_EmployeeIdAndWorkDateBetween(employeeId, from, to);
        List<OTRequest> otRequests = otRequestRepository
                .findByEmployeeInfo_EmployeeIdAndStatusAndStartTimeBetween(
                        employeeId, RequestStatus.APPROVED, from.atStartOfDay(), to.atTime(23, 59, 59));

        String kpi1Rating = kpi1Service.getRating(employeeId, year, month).orElse("B");
        double[] override = computeKpiOverride(employeeId, year, month, from, to);

        Payroll payroll = calculationEngine.buildPayroll(
                employeeId, year, month, nt, contract, workDays, otRequests,
                kpi1Rating, null, null, 0L, 0L, "Payroll run " + month + "/" + year,
                override != null ? override[0] : null,
                override != null ? override[1] : null);
        payroll.setPayrollRunId(runId);
        return payroll;
    }

    @Transactional(readOnly = true)
    public List<PayrollResponse> getLinesForRun(String runId) {
        return payrollRepository.findByPayrollRunId(runId).stream().map(this::toResponse).toList();
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public PayrollResponse getById(String id) {
        return toResponse(findById(id));
    }

    public PageResponse<PayrollResponse> getAll(Pageable pageable) {
        Page<Payroll> page = payrollRepository.findAll(pageable);
        return PageResponse.from(page.map(this::toResponse));
    }

    public PageResponse<PayrollResponse> getByEmployee(String employeeId, Pageable pageable) {
        Page<Payroll> page = payrollRepository.findByEmployeeInfo_EmployeeId(employeeId, pageable);
        return PageResponse.from(page.map(this::toResponse));
    }

    /** Employee self-service list: only finalized payslips (APPROVED/PAID) — never unapproved drafts. */
    public PageResponse<PayrollResponse> getMyPayslips(String employeeId, Pageable pageable) {
        Page<Payroll> page = payrollRepository.findByEmployeeInfo_EmployeeIdAndStatusIn(
                employeeId, List.of(PayrollStatus.APPROVED, PayrollStatus.PAID), pageable);
        return PageResponse.from(page.map(this::toResponse));
    }

    public PageResponse<PayrollResponse> getByPeriod(int year, int month, Pageable pageable) {
        Page<Payroll> page = payrollRepository.findByPayrollYearAndPayrollMonth(year, month, pageable);
        return PageResponse.from(page.map(this::toResponse));
    }

    // ── Phase 7.6 — Employee payslip ─────────────────────────────────────────

    public PayslipResponse getMyPayslip(int year, int month, String username) {
        String employeeId = employeeService.getEmployeeIdByUsername(username);
        Payroll payroll = payrollRepository
                .findByEmployeeInfo_EmployeeIdAndPayrollYearAndPayrollMonthAndStatusIn(
                        employeeId, year, month,
                        List.of(PayrollStatus.APPROVED, PayrollStatus.PAID))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Payslip", "employeeId/period", employeeId + "/" + year + "/" + month));
        return toPayslipResponse(payroll);
    }

    private PayslipResponse toPayslipResponse(Payroll p) {
        PayslipResponse.PayslipResponseBuilder b = PayslipResponse.builder()
                .payrollId(p.getPayrollId())
                .payrollYear(p.getPayrollYear())
                .payrollMonth(p.getPayrollMonth())
                .performanceSalary(p.getPerformanceSalary())
                .positionCoefficient(p.getPositionCoefficient())
                .livingAllowance(p.getLivingAllowance())
                .languageAllowance(p.getLanguageAllowance())
                .odcAllowance(p.getOdcAllowance())
                .kpiAverage(p.getKpiAverage())
                .actualWorkingDays(p.getActualWorkingDays())
                .standardWorkingDays(p.getStandardWorkingDays())
                .otPay(p.getOtPay())
                .otWeekdayHours(p.getOtWeekdayHours())
                .otWeekendHours(p.getOtWeekendHours())
                .otHolidayHours(p.getOtHolidayHours())
                .otNightHours(p.getOtNightHours())
                .bonus(p.getBonus())
                .totalGross(p.getTotalGross())
                .insuranceBase(p.getInsuranceBase())
                .bhxhEmployee(p.getBhxhEmployee())
                .bhytEmployee(p.getBhytEmployee())
                .bhtnEmployee(p.getBhtnEmployee())
                .dependentCount(p.getDependentCount())
                .taxableIncome(p.getTaxableIncome())
                .pit(p.getPit())
                .netSalary(p.getNetSalary())
                .status(p.getStatus() != null ? p.getStatus().name() : null);
        if (p.getEmployeeInfo() != null) {
            b.employeeId(p.getEmployeeInfo().getEmployeeId());
            b.employeeName(p.getEmployeeInfo().getName());
            b.bankAccountNumber(p.getEmployeeInfo().getBankAccountNumber());
            b.bankName(p.getEmployeeInfo().getBankName());
        }
        return b.build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * KPI override for supervisors: MANAGER → average of their unit, DIRECTOR → company average.
     * Returns {HS1, HS2} where HS1 = average of members' KPI1 ratings, HS2 = average of members'
     * attendance-derived KPI2. Returns null for regular employees (use their own values).
     */
    private double[] computeKpiOverride(String employeeId, int year, int month, LocalDate from, LocalDate to) {
        EmployeeInfo emp = employeeInfoRepository.findById(employeeId).orElse(null);
        if (emp == null) return null;

        List<String> members;
        if (emp.getRole() == Role.MANAGER) {
            List<Department> managed = departmentRepository.findByEmployeeInfo_EmployeeIdAndDeleteFlagFalse(employeeId);
            if (managed.isEmpty()) return null;
            Set<String> deptIds = managed.stream().map(Department::getDepartmentId).collect(Collectors.toSet());
            members = employeeInfoRepository.findByStatusAndDeleteFlagFalseAndRoleNot(EmployeeStatus.ACTIVE, Role.SYSTEM_ADMIN).stream()
                    .filter(e -> e.getDepartment() != null && deptIds.contains(e.getDepartment().getDepartmentId())
                            && !e.getEmployeeId().equals(employeeId))
                    .map(EmployeeInfo::getEmployeeId).toList();
        } else if (emp.getRole() == Role.DIRECTOR) {
            members = employeeInfoRepository.findByStatusAndDeleteFlagFalseAndRoleNot(EmployeeStatus.ACTIVE, Role.SYSTEM_ADMIN).stream()
                    .filter(e -> !e.getEmployeeId().equals(employeeId))
                    .map(EmployeeInfo::getEmployeeId).toList();
        } else {
            return null;
        }
        if (members.isEmpty()) return null;

        Map<String, List<WorkDay>> wdMap = workDayRepository
                .findByEmployeeInfo_EmployeeIdInAndWorkDateBetween(members, from, to)
                .stream().collect(Collectors.groupingBy(w -> w.getEmployeeInfo().getEmployeeId()));
        Map<String, String> ratings = kpi1Service.ratingsForPeriod(year, month);

        double kpi1 = members.stream()
                .mapToDouble(id -> calculationEngine.ratingToKpi1(ratings.getOrDefault(id, "B")))
                .average().orElse(1.0);
        double kpi2 = members.stream()
                .mapToDouble(id -> calculationEngine.computeKpi2(wdMap.getOrDefault(id, List.of())))
                .average().orElse(1.0);
        return new double[]{kpi1, kpi2};
    }

    private Payroll findById(String id) {
        return payrollRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll", "id", id));
    }

    private PayrollResponse toResponse(Payroll p) {
        PayrollResponse.PayrollResponseBuilder b = PayrollResponse.builder()
                .payrollId(p.getPayrollId())
                .payrollYear(p.getPayrollYear())
                .payrollMonth(p.getPayrollMonth())
                .performanceSalary(p.getPerformanceSalary())
                .positionCoefficient(p.getPositionCoefficient())
                .livingAllowance(p.getLivingAllowance())
                .languageAllowance(p.getLanguageAllowance())
                .odcAllowance(p.getOdcAllowance())
                .kpi1Score(p.getKpi1Score())
                .kpi2Score(p.getKpi2Score())
                .kpiAverage(p.getKpiAverage())
                .actualWorkingDays(p.getActualWorkingDays())
                .standardWorkingDays(p.getStandardWorkingDays())
                .otPay(p.getOtPay())
                .otWeekdayHours(p.getOtWeekdayHours())
                .otWeekendHours(p.getOtWeekendHours())
                .otHolidayHours(p.getOtHolidayHours())
                .otNightHours(p.getOtNightHours())
                .bonus(p.getBonus())
                .baseGross(p.getBaseGross())
                .totalGross(p.getTotalGross())
                .insuranceBase(p.getInsuranceBase())
                .bhxhEmployee(p.getBhxhEmployee())
                .bhytEmployee(p.getBhytEmployee())
                .bhtnEmployee(p.getBhtnEmployee())
                .dependentCount(p.getDependentCount())
                .taxableIncome(p.getTaxableIncome())
                .pit(p.getPit())
                .netSalary(p.getNetSalary())
                .bhxhEmployer(p.getBhxhEmployer())
                .bhytEmployer(p.getBhytEmployer())
                .bhtnEmployer(p.getBhtnEmployer())
                .workplaceAccidentInsurance(p.getWorkplaceAccidentInsurance())
                .totalEmployerContributions(p.getTotalEmployerContributions())
                .totalEmploymentCost(p.getTotalEmploymentCost())
                .status(p.getStatus() != null ? p.getStatus().name() : null)
                .rejectionReason(p.getRejectionReason())
                .notes(p.getNotes())
                .locked(p.isLocked())
                .payrollRunId(p.getPayrollRunId())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt());

        if (p.getEmployeeInfo() != null) {
            b.employeeId(p.getEmployeeInfo().getEmployeeId());
            b.employeeName(p.getEmployeeInfo().getName());
        }
        return b.build();
    }
}
