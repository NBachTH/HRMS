package org.dummy.facez.domain.payroll.service;

import org.dummy.facez.common.enums.EmployeeStatus;
import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.common.enums.Role;
import org.dummy.facez.domain.department.repository.DepartmentRepository;
import org.dummy.facez.domain.contract.model.Contract;
import org.dummy.facez.domain.contract.repository.ContractRepository;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.dummy.facez.domain.otrequest.model.OTRequest;
import org.dummy.facez.domain.otrequest.repository.OTRequestRepository;
import org.dummy.facez.domain.payroll.model.Payroll;
import org.dummy.facez.domain.payroll.repository.PayrollRepository;
import org.dummy.facez.domain.workday.model.WorkDay;
import org.dummy.facez.domain.workday.repository.WorkDayRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Batch payroll service.
 *
 * Two-method design to correctly apply @Async via Spring's proxy mechanism:
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │  @Async only works when called through the Spring proxy.           │
 *  │  Proxy = the object you get when you @Autowire this bean.          │
 *  │  Self-call (this.runBatch()) bypasses the proxy → runs in-thread.  │
 *  │                                                                     │
 *  │  Solution: split into two public methods.                          │
 *  │   - triggerBatch()  → creates job record, returns jobId (fast).   │
 *  │   - runBatch()      → @Async, actual work (slow, runs in pool).   │
 *  │  Callers (controller, scheduler) call both on the injected bean,  │
 *  │  so both calls go through the proxy. @Async is applied correctly. │
 *  └─────────────────────────────────────────────────────────────────────┘
 */
@Service
public class PayrollBatchService {

    private static final Logger log = LoggerFactory.getLogger(PayrollBatchService.class);

    private final PayrollJobStore           jobStore;
    private final PayrollCalculationEngine  calculationEngine;
    private final EmployeeInfoRepository    employeeInfoRepository;
    private final ContractRepository        contractRepository;
    private final WorkDayRepository         workDayRepository;
    private final OTRequestRepository       otRequestRepository;
    private final PayrollRepository         payrollRepository;
    private final DepartmentRepository      departmentRepository;

    public PayrollBatchService(
            PayrollJobStore jobStore,
            PayrollCalculationEngine calculationEngine,
            EmployeeInfoRepository employeeInfoRepository,
            ContractRepository contractRepository,
            WorkDayRepository workDayRepository,
            OTRequestRepository otRequestRepository,
            PayrollRepository payrollRepository,
            DepartmentRepository departmentRepository) {
        this.jobStore              = jobStore;
        this.calculationEngine     = calculationEngine;
        this.employeeInfoRepository = employeeInfoRepository;
        this.contractRepository    = contractRepository;
        this.workDayRepository     = workDayRepository;
        this.otRequestRepository   = otRequestRepository;
        this.payrollRepository     = payrollRepository;
        this.departmentRepository  = departmentRepository;
    }

    /**
     * Creates a job record and returns its ID immediately.
     * The caller must then invoke {@link #runBatch} on this injected bean
     * (not via {@code this}) to ensure @Async is applied by the proxy.
     */
    public String triggerBatch(int year, int month, int nt) {
        return jobStore.createJob(year, month, nt);
    }

    /**
     * Executes the batch payroll calculation asynchronously on the "payrollExecutor" thread pool.
     *
     * Performance strategy — 3 queries total instead of N×3:
     *  1. Load all active employees              (1 query)
     *  2. Bulk load all contracts for the period (1 query, JOIN FETCH)
     *  3. Bulk load all attendance records        (1 query)
     *  4. Bulk load all approved OT requests      (1 query)
     *  5. Group data in memory by employeeId
     *  6. Calculate each employee with zero additional DB calls
     *  7. saveAll() — single batch INSERT
     *
     * @param jobId  the job record ID created by {@link #triggerBatch}
     * @param year   payroll year
     * @param month  payroll month (1–12)
     * @param nt     standard working days for the period
     */
    @Async("payrollExecutor")
    public void runBatch(String jobId, int year, int month, int nt) {
        PayrollJobRecord job = jobStore.get(jobId)
                .orElseThrow(() -> new IllegalStateException("Batch job not found: " + jobId));

        job.setState(PayrollJobRecord.JobState.RUNNING);
        job.setStartedAt(LocalDateTime.now());
        log.info("Payroll batch job {} starting for {}/{}", jobId, year, month);

        try {
            // ── 1. Active employees ───────────────────────────────────────────
            // The admin account is not a real employee → never compute payroll for it.
            List<EmployeeInfo> employees = employeeInfoRepository
                    .findByStatusAndDeleteFlagFalseAndRoleNot(EmployeeStatus.ACTIVE, Role.SYSTEM_ADMIN);

            job.getTotal().set(employees.size());

            if (employees.isEmpty()) {
                log.info("Payroll batch job {}: no active employees found, completing immediately.", jobId);
                job.setState(PayrollJobRecord.JobState.COMPLETED);
                return;
            }

            List<String> employeeIds = employees.stream()
                    .map(EmployeeInfo::getEmployeeId)
                    .toList();

            // ── 2. Skip employees already processed for this period ───────────
            Set<String> alreadyProcessed = payrollRepository
                    .findEmployeeIdsWithPayrollForPeriod(year, month, employeeIds);

            // ── 3. Bulk data load — one query per data type ───────────────────
            LocalDate from = LocalDate.of(year, month, 1);
            LocalDate to   = YearMonth.of(year, month).atEndOfMonth();

            // JOIN FETCH on employeeInfo in findActiveByEmployeeIds prevents
            // LazyInitializationException when grouping outside the JPA session.
            Map<String, Contract> contractMap = contractRepository
                    .findActiveByEmployeeIds(employeeIds)
                    .stream()
                    .collect(Collectors.toMap(
                            c -> c.getEmployeeInfo().getEmployeeId(),
                            c -> c));

            Map<String, List<WorkDay>> workDayMap = workDayRepository
                    .findByEmployeeInfo_EmployeeIdInAndWorkDateBetween(employeeIds, from, to)
                    .stream()
                    .collect(Collectors.groupingBy(
                            w -> w.getEmployeeInfo().getEmployeeId()));

            Map<String, List<OTRequest>> otMap = otRequestRepository
                    .findByEmployeeIdsAndStatusAndStartTimeBetween(
                            employeeIds, RequestStatus.APPROVED,
                            from.atStartOfDay(), to.atTime(23, 59, 59))
                    .stream()
                    .collect(Collectors.groupingBy(
                            ot -> ot.getEmployeeInfo().getEmployeeId()));

            // ── 3b. KPI maps for unit/company averaging (MANAGER/DIRECTOR) ─────
            double defaultKpi1 = calculationEngine.ratingToKpi1("B");
            Map<String, Double> kpi2ByEmp = new HashMap<>();
            for (EmployeeInfo emp : employees) {
                kpi2ByEmp.put(emp.getEmployeeId(),
                        calculationEngine.computeKpi2(workDayMap.getOrDefault(emp.getEmployeeId(), List.of())));
            }
            // employeeId → departmentId
            Map<String, String> empToDept = new HashMap<>();
            for (Object[] row : employeeInfoRepository.findEmployeeDepartmentPairs(
                    EmployeeStatus.ACTIVE, Role.SYSTEM_ADMIN)) {
                empToDept.put((String) row[0], (String) row[1]);
            }
            // managerEmployeeId → set of departmentIds they manage
            Map<String, Set<String>> managerToDepts = new HashMap<>();
            for (Object[] row : departmentRepository.findDepartmentManagerPairs()) {
                managerToDepts.computeIfAbsent((String) row[1], k -> new java.util.HashSet<>()).add((String) row[0]);
            }

            // ── 4. Per-employee calculation — zero DB calls inside loop ────────
            List<Payroll> payrolls = new ArrayList<>();

            for (EmployeeInfo emp : employees) {
                String empId = emp.getEmployeeId();

                if (alreadyProcessed.contains(empId)) {
                    job.getSkipped().incrementAndGet();
                    continue;
                }

                Contract contract = contractMap.get(empId);
                if (contract == null
                        || contract.getBaseSalary() == null
                        || contract.getBaseSalary() <= 0
                        || contract.getPositionCode() == null
                        || contract.getSalaryStep() == null) {
                    job.getFailedCount().incrementAndGet();
                    job.getErrors().add(empId + ": missing or invalid contract");
                    continue;
                }

                try {
                    List<WorkDay>   workDays   = workDayMap.getOrDefault(empId, List.of());
                    List<OTRequest> otRequests = otMap.getOrDefault(empId, List.of());

                    // KPI override: MANAGER = average of their unit; DIRECTOR = company average.
                    Double kpi1Override = null, kpi2Override = null;
                    if (emp.getRole() == Role.MANAGER) {
                        Set<String> myDepts = managerToDepts.getOrDefault(empId, Set.of());
                        List<String> members = employees.stream()
                                .map(EmployeeInfo::getEmployeeId)
                                .filter(id -> !id.equals(empId) && myDepts.contains(empToDept.get(id)))
                                .toList();
                        if (!members.isEmpty()) {
                            kpi2Override = members.stream().mapToDouble(id -> kpi2ByEmp.getOrDefault(id, 1.0)).average().orElse(1.0);
                            kpi1Override = defaultKpi1;
                        }
                    } else if (emp.getRole() == Role.DIRECTOR) {
                        List<String> members = employees.stream()
                                .map(EmployeeInfo::getEmployeeId)
                                .filter(id -> !id.equals(empId))
                                .toList();
                        if (!members.isEmpty()) {
                            kpi2Override = members.stream().mapToDouble(id -> kpi2ByEmp.getOrDefault(id, 1.0)).average().orElse(1.0);
                            kpi1Override = defaultKpi1;
                        }
                    }

                    Payroll payroll = calculationEngine.buildPayroll(
                            empId, year, month, nt, contract,
                            workDays, otRequests,
                            "B",   // kpi1Rating — batch default; adjust individually via /calculate
                            null,  // kpi2Rating — auto-computed from attendance
                            null,  // japaneseLevel — not provided in batch; update via /calculate
                            0L,    // odcAllowance
                            0L,    // bonus
                            "Auto-generated by batch job " + jobId,
                            kpi1Override, kpi2Override);

                    payrolls.add(payroll);
                    job.getSucceeded().incrementAndGet();

                } catch (Exception e) {
                    job.getFailedCount().incrementAndGet();
                    job.getErrors().add(empId + ": " + e.getMessage());
                    log.warn("Payroll batch {}: calculation failed for employee {}: {}",
                            jobId, empId, e.getMessage());
                }
            }

            // ── 5. Single batch INSERT ────────────────────────────────────────
            if (!payrolls.isEmpty()) {
                payrollRepository.saveAll(payrolls);
            }

            job.setState(PayrollJobRecord.JobState.COMPLETED);
            log.info("Payroll batch job {} completed: {}/{} succeeded, {} skipped, {} failed",
                    jobId,
                    job.getSucceeded().get(), job.getTotal().get(),
                    job.getSkipped().get(), job.getFailedCount().get());

        } catch (Exception e) {
            job.setState(PayrollJobRecord.JobState.FAILED);
            job.setFailureReason(e.getMessage());
            log.error("Payroll batch job {} failed fatally: {}", jobId, e.getMessage(), e);
        } finally {
            job.setCompletedAt(LocalDateTime.now());
        }
    }
}
