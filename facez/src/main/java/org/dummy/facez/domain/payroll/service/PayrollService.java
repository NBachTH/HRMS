package org.dummy.facez.domain.payroll.service;

import org.dummy.facez.common.enums.PayrollStatus;
import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.attendance.model.Attendance;
import org.dummy.facez.domain.attendance.repository.AttendancePeriodCloseRepository;
import org.dummy.facez.domain.attendance.repository.AttendanceRepository;
import org.dummy.facez.domain.contract.model.Contract;
import org.dummy.facez.domain.contract.repository.ContractRepository;
import org.dummy.facez.domain.employee.service.EmployeeService;
import org.dummy.facez.domain.otrequest.model.OTRequest;
import org.dummy.facez.domain.otrequest.repository.OTRequestRepository;
import org.dummy.facez.domain.notification.event.PayrollApprovedEvent;
import org.dummy.facez.domain.payroll.dto.PayrollCalculateRequest;
import org.dummy.facez.domain.payroll.dto.PayrollResponse;
import org.dummy.facez.domain.payroll.dto.PayslipResponse;
import org.dummy.facez.domain.payroll.model.Payroll;
import org.dummy.facez.domain.payroll.repository.PayrollRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/**
 * Orchestrates single-employee payroll calculation.
 * Pure computation is delegated to {@link PayrollCalculationEngine} —
 * this service only handles DB access, validation, and persistence.
 */
@Service
public class PayrollService {

    private final PayrollRepository payrollRepository;
    private final ContractRepository contractRepository;
    private final AttendanceRepository attendanceRepository;
    private final OTRequestRepository otRequestRepository;
    private final PayrollCalculationEngine calculationEngine;
    private final AttendancePeriodCloseRepository periodCloseRepository;
    private final EmployeeService employeeService;
    private final ApplicationEventPublisher eventPublisher;

    public PayrollService(PayrollRepository payrollRepository,
                          ContractRepository contractRepository,
                          AttendanceRepository attendanceRepository,
                          OTRequestRepository otRequestRepository,
                          PayrollCalculationEngine calculationEngine,
                          AttendancePeriodCloseRepository periodCloseRepository,
                          EmployeeService employeeService,
                          ApplicationEventPublisher eventPublisher) {
        this.payrollRepository    = payrollRepository;
        this.contractRepository   = contractRepository;
        this.attendanceRepository = attendanceRepository;
        this.otRequestRepository  = otRequestRepository;
        this.calculationEngine    = calculationEngine;
        this.periodCloseRepository = periodCloseRepository;
        this.employeeService      = employeeService;
        this.eventPublisher       = eventPublisher;
    }

    // ── Calculate & save as DRAFT ─────────────────────────────────────────────

    @Transactional
    public PayrollResponse calculate(PayrollCalculateRequest req) {
        // Phase 1.4 guard: attendance period must be closed before payroll can be calculated
        if (!periodCloseRepository.existsByCloseYearAndCloseMonth(req.getPayrollYear(), req.getPayrollMonth())) {
            throw new BadRequestException(
                    "Attendance period " + req.getPayrollYear() + "/" + req.getPayrollMonth() +
                    " has not been closed yet. Close the attendance period before calculating payroll.");
        }

        // Guard: only one DRAFT/APPROVED record per employee per period
        payrollRepository.findByEmployeeInfo_EmployeeIdAndPayrollYearAndPayrollMonth(
                req.getEmployeeId(), req.getPayrollYear(), req.getPayrollMonth())
                .ifPresent(existing -> {
                    throw new BadRequestException(
                            "Payroll record already exists for employee " + req.getEmployeeId() +
                            " in " + req.getPayrollYear() + "/" + req.getPayrollMonth() +
                            " (status: " + existing.getStatus() + "). Delete the existing DRAFT first.");
                });

        Contract contract = contractRepository.findContractByEmployeeInfo_EmployeeId(req.getEmployeeId());
        if (contract == null) {
            throw new ResourceNotFoundException("Contract", "employeeId", req.getEmployeeId());
        }
        if (contract.getBaseSalary() == null || contract.getBaseSalary() <= 0) {
            throw new BadRequestException("Contract is missing baseSalary for employee: " + req.getEmployeeId());
        }
        if (contract.getPositionCode() == null || contract.getSalaryStep() == null) {
            throw new BadRequestException("Contract is missing positionCode or salaryStep for employee: " + req.getEmployeeId());
        }

        int year  = req.getPayrollYear();
        int month = req.getPayrollMonth();
        int nt    = req.getStandardWorkingDays() != null
                    ? req.getStandardWorkingDays()
                    : PayrollConfigService.DEFAULT_STANDARD_DAYS;

        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to   = YearMonth.of(year, month).atEndOfMonth();

        // Load attendance once — passed to both NCtt and KPI2 auto-compute in the engine
        List<Attendance> attendanceRecords = attendanceRepository
                .findByEmployeeAndDateRange(req.getEmployeeId(), from, to);
        List<OTRequest> otRequests = otRequestRepository
                .findByEmployeeInfo_EmployeeIdAndStatusAndStartTimeBetween(
                        req.getEmployeeId(), RequestStatus.APPROVED,
                        from.atStartOfDay(), to.atTime(23, 59, 59));

        Payroll payroll = calculationEngine.buildPayroll(
                req.getEmployeeId(), year, month, nt, contract,
                attendanceRecords, otRequests,
                req.getKpi1Rating(), req.getKpi2Rating(),
                req.getJapaneseLevel(), req.getOdcAllowance(),
                req.getBonus(), req.getNotes());

        payrollRepository.save(payroll);
        return toResponse(payroll);
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

    public PageResponse<PayrollResponse> getByPeriod(int year, int month, Pageable pageable) {
        Page<Payroll> page = payrollRepository.findByPayrollYearAndPayrollMonth(year, month, pageable);
        return PageResponse.from(page.map(this::toResponse));
    }

    // ── Approve ───────────────────────────────────────────────────────────────

    /**
     * FINANCE_ADMIN: submits a calculated payroll for Director authorisation.
     * Transition: DRAFT → PENDING_APPROVAL
     */
    @Transactional
    public PayrollResponse submitForApproval(String id) {
        Payroll payroll = findById(id);
        if (payroll.getStatus() != PayrollStatus.DRAFT) {
            throw new BadRequestException("Only DRAFT payrolls can be submitted. Current status: " + payroll.getStatus());
        }
        payroll.setStatus(PayrollStatus.PENDING_APPROVAL);
        payrollRepository.save(payroll);
        return toResponse(payroll);
    }

    /**
     * DIRECTOR: authorises disbursement.
     * Transition: PENDING_APPROVAL → APPROVED
     */
    @Transactional
    public PayrollResponse approve(String id) {
        Payroll payroll = findById(id);
        if (payroll.getStatus() != PayrollStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Only PENDING_APPROVAL payrolls can be approved. Current status: " + payroll.getStatus());
        }
        payroll.setStatus(PayrollStatus.APPROVED);
        payroll.setRejectionReason(null);
        payrollRepository.save(payroll);

        if (payroll.getEmployeeInfo() != null) {
            eventPublisher.publishEvent(new PayrollApprovedEvent(
                    this,
                    payroll.getEmployeeInfo().getEmployeeId(),
                    payroll.getPayrollYear(),
                    payroll.getPayrollMonth()));
        }
        return toResponse(payroll);
    }

    /**
     * DIRECTOR: sends back to Finance for correction.
     * Transition: PENDING_APPROVAL → REJECTED
     */
    @Transactional
    public PayrollResponse reject(String id, String reason) {
        Payroll payroll = findById(id);
        if (payroll.getStatus() != PayrollStatus.PENDING_APPROVAL) {
            throw new BadRequestException(
                    "Only PENDING_APPROVAL payrolls can be rejected. Current status: " + payroll.getStatus());
        }
        payroll.setStatus(PayrollStatus.REJECTED);
        payroll.setRejectionReason(reason);
        payrollRepository.save(payroll);
        return toResponse(payroll);
    }

    // ── Mark as paid ──────────────────────────────────────────────────────────

    @Transactional
    public PayrollResponse markPaid(String id) {
        Payroll payroll = findById(id);
        if (payroll.getStatus() != PayrollStatus.APPROVED) {
            throw new BadRequestException("Only APPROVED payrolls can be marked as paid. Current status: " + payroll.getStatus());
        }
        payroll.setStatus(PayrollStatus.PAID);
        payrollRepository.save(payroll);
        return toResponse(payroll);
    }

    // ── Delete (DRAFT only) ───────────────────────────────────────────────────

    @Transactional
    public void delete(String id) {
        Payroll payroll = findById(id);
        if (payroll.getStatus() != PayrollStatus.DRAFT) {
            throw new BadRequestException("Only DRAFT payrolls can be deleted. Current status: " + payroll.getStatus());
        }
        payrollRepository.delete(payroll);
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
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt());

        if (p.getEmployeeInfo() != null) {
            b.employeeId(p.getEmployeeInfo().getEmployeeId());
            b.employeeName(p.getEmployeeInfo().getName());
        }
        return b.build();
    }
}
