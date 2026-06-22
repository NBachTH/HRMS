package org.dummy.facez.domain.payroll.service;

import org.dummy.facez.common.enums.EmployeeStatus;
import org.dummy.facez.common.enums.PayrollStatus;
import org.dummy.facez.common.enums.Role;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.domain.attendance.repository.AttendancePeriodCloseRepository;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.dummy.facez.domain.payroll.dto.PayrollResponse;
import org.dummy.facez.domain.payroll.dto.PayrollRunResponse;
import org.dummy.facez.domain.payroll.model.Payroll;
import org.dummy.facez.domain.payroll.model.PayrollRun;
import org.dummy.facez.domain.payroll.repository.PayrollRepository;
import org.dummy.facez.domain.payroll.repository.PayrollRunRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Period-level payroll workflow: create a run (computes all DRAFT lines), recalc one line or the
 * whole period (keeping manually-edited "exception" lines), then submit / approve in bulk.
 */
@Service
public class PayrollRunService {

    private static final Logger log = LoggerFactory.getLogger(PayrollRunService.class);

    private final PayrollRunRepository payrollRunRepository;
    private final PayrollRepository payrollRepository;
    private final PayrollService payrollService;
    private final EmployeeInfoRepository employeeInfoRepository;
    private final AttendancePeriodCloseRepository periodCloseRepository;
    private final Kpi1Service kpi1Service;

    public PayrollRunService(PayrollRunRepository payrollRunRepository,
                             PayrollRepository payrollRepository,
                             PayrollService payrollService,
                             EmployeeInfoRepository employeeInfoRepository,
                             AttendancePeriodCloseRepository periodCloseRepository,
                             Kpi1Service kpi1Service) {
        this.payrollRunRepository = payrollRunRepository;
        this.payrollRepository = payrollRepository;
        this.payrollService = payrollService;
        this.employeeInfoRepository = employeeInfoRepository;
        this.periodCloseRepository = periodCloseRepository;
        this.kpi1Service = kpi1Service;
    }

    // ── Create / recalc ─────────────────────────────────────────────────────────

    @Transactional
    public PayrollRunResponse createRun(int year, int month) {
        if (!periodCloseRepository.existsByCloseYearAndCloseMonth(year, month)) {
            throw new BadRequestException("Attendance period " + month + "/" + year + " must be closed first.");
        }
        if (payrollRunRepository.findByYearAndMonth(year, month).isPresent()) {
            throw new BadRequestException("A payroll run already exists for " + month + "/" + year + ".");
        }

        // HS1 must be entered for every active employee BEFORE calculating — otherwise lines
        // would be computed with a default HS1 (wrong) and only caught at submit time.
        List<EmployeeInfo> employees = employeeInfoRepository
                .findByStatusAndDeleteFlagFalseAndRoleNot(EmployeeStatus.ACTIVE, Role.SYSTEM_ADMIN);
        Set<String> rated = Set.copyOf(kpi1Service.ratedEmployeeIds(year, month));
        List<String> missingHs1 = employees.stream()
                .map(EmployeeInfo::getEmployeeId)
                .filter(id -> !rated.contains(id))
                .toList();
        if (!missingHs1.isEmpty()) {
            throw new BadRequestException("Chưa thể tạo kỳ lương: còn " + missingHs1.size() +
                    " nhân viên chưa được chấm HS1 cho kỳ " + month + "/" + year +
                    ". Vui lòng hoàn tất chấm HS1 trước khi tính lương.");
        }

        // Fresh start: remove any stray payroll lines for the period.
        payrollRepository.deleteByPayrollYearAndPayrollMonth(year, month);

        PayrollRun run = PayrollRun.builder()
                .id(UUID.randomUUID().toString())
                .year(year).month(month)
                .status(PayrollStatus.DRAFT)
                .build();
        payrollRunRepository.save(run);

        int count = 0;
        for (EmployeeInfo emp : employees) {
            try {
                Payroll line = payrollService.calculateLine(emp.getEmployeeId(), year, month, run.getId());
                payrollRepository.save(line);
                count++;
            } catch (Exception e) {
                log.warn("Payroll run {}/{}: skipped {} — {}", month, year, emp.getEmployeeId(), e.getMessage());
            }
        }
        recomputeTotals(run);
        run.setEmployeeCount(count);
        payrollRunRepository.save(run);
        return toResponse(run);
    }

    /** Recalculate a single employee's line and lock it as a manual exception. */
    @Transactional
    public PayrollRunResponse recalcLine(String runId, String employeeId) {
        PayrollRun run = findDraft(runId);
        payrollRepository.findByEmployeeInfo_EmployeeIdAndPayrollYearAndPayrollMonth(
                employeeId, run.getYear(), run.getMonth()).ifPresent(payrollRepository::delete);
        // Force the DELETE to hit the DB before the INSERT below, otherwise Hibernate orders
        // inserts before deletes and the new row collides with the old one on (employee,year,month).
        payrollRepository.flush();
        Payroll line = payrollService.calculateLine(employeeId, run.getYear(), run.getMonth(), runId);
        line.setLocked(true);
        payrollRepository.save(line);
        recomputeTotals(run);
        payrollRunRepository.save(run);
        return toResponse(run);
    }

    /** Recalculate every non-locked line in the run (keeps manual exceptions). */
    @Transactional
    public PayrollRunResponse recalcRun(String runId) {
        PayrollRun run = findDraft(runId);
        List<Payroll> lines = payrollRepository.findByPayrollRunId(runId);
        // Delete all non-locked lines first and flush, so the recreated rows don't collide with
        // the old ones on the (employee, year, month) unique key during Hibernate's flush.
        List<String> toRecalc = lines.stream()
                .filter(l -> !l.isLocked())
                .map(l -> l.getEmployeeInfo().getEmployeeId())
                .toList();
        lines.stream().filter(l -> !l.isLocked()).forEach(payrollRepository::delete);
        payrollRepository.flush();
        for (String empId : toRecalc) {
            try {
                payrollRepository.save(payrollService.calculateLine(empId, run.getYear(), run.getMonth(), runId));
            } catch (Exception e) {
                log.warn("Recalc run {}: skipped {} — {}", runId, empId, e.getMessage());
            }
        }
        recomputeTotals(run);
        payrollRunRepository.save(run);
        return toResponse(run);
    }

    /** Exclude a single line from the run (per-line exception) without blocking the batch. */
    @Transactional
    public PayrollRunResponse excludeLine(String runId, String employeeId, String reason) {
        PayrollRun run = findById(runId);
        Payroll line = payrollRepository.findByEmployeeInfo_EmployeeIdAndPayrollYearAndPayrollMonth(
                        employeeId, run.getYear(), run.getMonth())
                .orElseThrow(() -> new ResourceNotFoundException("Payroll line", "employeeId", employeeId));
        line.setStatus(PayrollStatus.REJECTED);
        line.setRejectionReason(reason);
        payrollRepository.save(line);
        recomputeTotals(run);
        payrollRunRepository.save(run);
        return toResponse(run);
    }

    /** Delete a DRAFT run and all its lines (lets Finance redo the period from scratch). */
    @Transactional
    public void deleteRun(String runId) {
        PayrollRun run = findById(runId);
        if (run.getStatus() != PayrollStatus.DRAFT) {
            throw new BadRequestException("Chỉ xóa được kỳ lương ở trạng thái DRAFT (hiện: " + run.getStatus() + ").");
        }
        payrollRepository.deleteByPayrollYearAndPayrollMonth(run.getYear(), run.getMonth());
        payrollRunRepository.delete(run);
    }

    // ── Workflow ────────────────────────────────────────────────────────────────

    @Transactional
    public PayrollRunResponse submit(String runId, String username) {
        PayrollRun run = findDraft(runId);

        // Block submission if any employee in the run is missing a KPI1 rating.
        Set<String> rated = Set.copyOf(kpi1Service.ratedEmployeeIds(run.getYear(), run.getMonth()));
        List<Payroll> lines = payrollRepository.findByPayrollRunId(runId);
        List<String> missing = lines.stream()
                .filter(p -> p.getStatus() != PayrollStatus.REJECTED)
                .map(p -> p.getEmployeeInfo().getEmployeeId())
                .filter(id -> !rated.contains(id))
                .distinct().toList();
        if (!missing.isEmpty()) {
            throw new BadRequestException("Cannot submit: " + missing.size() +
                    " employee(s) are missing a KPI1 (HS1) rating for this period.");
        }

        run.setStatus(PayrollStatus.PENDING_APPROVAL);
        run.setSubmittedBy(username);
        lines.stream().filter(p -> p.getStatus() == PayrollStatus.DRAFT)
                .forEach(p -> p.setStatus(PayrollStatus.PENDING_APPROVAL));
        payrollRepository.saveAll(lines);
        payrollRunRepository.save(run);
        return toResponse(run);
    }

    @Transactional
    public PayrollRunResponse approve(String runId, String username) {
        PayrollRun run = findById(runId);
        if (run.getStatus() != PayrollStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Only PENDING_APPROVAL runs can be approved. Current: " + run.getStatus());
        }
        run.setStatus(PayrollStatus.APPROVED);
        run.setApprovedBy(username);
        run.setRejectionReason(null);
        List<Payroll> lines = payrollRepository.findByPayrollRunId(runId);
        lines.stream().filter(p -> p.getStatus() != PayrollStatus.REJECTED)
                .forEach(p -> p.setStatus(PayrollStatus.APPROVED));
        payrollRepository.saveAll(lines);
        payrollRunRepository.save(run);
        return toResponse(run);
    }

    @Transactional
    public PayrollRunResponse reject(String runId, String reason) {
        PayrollRun run = findById(runId);
        if (run.getStatus() != PayrollStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Only PENDING_APPROVAL runs can be rejected. Current: " + run.getStatus());
        }
        run.setStatus(PayrollStatus.DRAFT);
        run.setRejectionReason(reason);
        List<Payroll> lines = payrollRepository.findByPayrollRunId(runId);
        lines.stream().filter(p -> p.getStatus() == PayrollStatus.PENDING_APPROVAL)
                .forEach(p -> p.setStatus(PayrollStatus.DRAFT));
        payrollRepository.saveAll(lines);
        payrollRunRepository.save(run);
        return toResponse(run);
    }

    @Transactional
    public PayrollRunResponse markPaid(String runId) {
        PayrollRun run = findById(runId);
        if (run.getStatus() != PayrollStatus.APPROVED) {
            throw new BadRequestException("Only APPROVED runs can be marked paid. Current: " + run.getStatus());
        }
        run.setStatus(PayrollStatus.PAID);
        List<Payroll> lines = payrollRepository.findByPayrollRunId(runId);
        lines.stream().filter(p -> p.getStatus() == PayrollStatus.APPROVED)
                .forEach(p -> p.setStatus(PayrollStatus.PAID));
        payrollRepository.saveAll(lines);
        payrollRunRepository.save(run);
        return toResponse(run);
    }

    // ── Read ────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PayrollRunResponse> getRuns() {
        return payrollRunRepository.findAllByOrderByYearDescMonthDesc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<PayrollResponse> getRunLines(String runId) {
        findById(runId);
        return payrollService.getLinesForRun(runId);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private void recomputeTotals(PayrollRun run) {
        List<Payroll> lines = payrollRepository.findByPayrollRunId(run.getId());
        long gross = lines.stream().filter(p -> p.getStatus() != PayrollStatus.REJECTED)
                .mapToLong(Payroll::getTotalGross).sum();
        long net = lines.stream().filter(p -> p.getStatus() != PayrollStatus.REJECTED)
                .mapToLong(Payroll::getNetSalary).sum();
        run.setTotalGross(gross);
        run.setTotalNet(net);
        run.setEmployeeCount((int) lines.stream().filter(p -> p.getStatus() != PayrollStatus.REJECTED).count());
    }

    private PayrollRun findById(String runId) {
        return payrollRunRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("PayrollRun", "id", runId));
    }

    private PayrollRun findDraft(String runId) {
        PayrollRun run = findById(runId);
        if (run.getStatus() != PayrollStatus.DRAFT) {
            throw new BadRequestException("Run is not editable (status: " + run.getStatus() + ").");
        }
        return run;
    }

    private PayrollRunResponse toResponse(PayrollRun r) {
        return PayrollRunResponse.builder()
                .id(r.getId()).year(r.getYear()).month(r.getMonth())
                .status(r.getStatus() != null ? r.getStatus().name() : null)
                .employeeCount(r.getEmployeeCount())
                .totalGross(r.getTotalGross()).totalNet(r.getTotalNet())
                .submittedBy(r.getSubmittedBy()).approvedBy(r.getApprovedBy())
                .rejectionReason(r.getRejectionReason())
                .build();
    }
}
