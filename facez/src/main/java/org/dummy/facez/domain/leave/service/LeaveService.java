package org.dummy.facez.domain.leave.service;

import org.dummy.facez.common.enums.LeaveType;
import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.dummy.facez.domain.leave.dto.LeaveBalanceResponse;
import org.dummy.facez.domain.leave.dto.LeaveCreateRequest;
import org.dummy.facez.domain.leave.dto.LeaveResponse;
import org.dummy.facez.domain.leave.model.LeaveBalance;
import org.dummy.facez.domain.leave.model.LeaveRequest;
import org.dummy.facez.domain.leave.repository.LeaveBalanceRepository;
import org.dummy.facez.domain.leave.repository.LeaveRequestRepository;
import org.dummy.facez.domain.attendance.repository.PublicHolidayRepository;
import org.dummy.facez.domain.notification.event.LeaveRequestSubmittedEvent;
import org.dummy.facez.domain.workday.event.LeaveApprovedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class LeaveService {

    // These leave types cannot be submitted manually — they are system-generated
    private static final Set<LeaveType> EMPLOYEE_SUBMITTABLE = Set.of(
            LeaveType.ANNUAL, LeaveType.SICK, LeaveType.MATERNITY, LeaveType.PATERNITY,
            LeaveType.BEREAVEMENT, LeaveType.MARRIAGE, LeaveType.UNPAID
    );

    /**
     * Minimum allowed (startDate − today) in calendar days, per leave type.
     * Positive  → advance notice required (start must be at least N days in the future).
     * Negative  → backdating allowed up to N days (sudden events: sick / bereavement).
     * Tune these numbers to match company policy.
     */
    private static final Map<LeaveType, Integer> MIN_START_OFFSET_DAYS = new EnumMap<>(LeaveType.class);
    static {
        MIN_START_OFFSET_DAYS.put(LeaveType.ANNUAL,       1);
        MIN_START_OFFSET_DAYS.put(LeaveType.COMPENSATORY, 1);
        MIN_START_OFFSET_DAYS.put(LeaveType.MARRIAGE,     1);
        MIN_START_OFFSET_DAYS.put(LeaveType.UNPAID,       1);
        MIN_START_OFFSET_DAYS.put(LeaveType.PATERNITY,    1);
        MIN_START_OFFSET_DAYS.put(LeaveType.MATERNITY,    7);
        MIN_START_OFFSET_DAYS.put(LeaveType.SICK,        -3);
        MIN_START_OFFSET_DAYS.put(LeaveType.BEREAVEMENT, -3);
    }

    /** Statuses that occupy days for overlap detection (submitted but not rejected). */
    private static final List<RequestStatus> ACTIVE_FOR_OVERLAP = List.of(
            RequestStatus.TO_APPROVE, RequestStatus.LEADER_APPROVED,
            RequestStatus.MANAGER_APPROVED, RequestStatus.APPROVED);

    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final EmployeeInfoRepository employeeInfoRepository;
    private final PublicHolidayRepository publicHolidayRepository;
    private final ApplicationEventPublisher eventPublisher;

    public LeaveService(LeaveRequestRepository leaveRequestRepository,
                        LeaveBalanceRepository leaveBalanceRepository,
                        EmployeeInfoRepository employeeInfoRepository,
                        PublicHolidayRepository publicHolidayRepository,
                        ApplicationEventPublisher eventPublisher) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.leaveBalanceRepository = leaveBalanceRepository;
        this.employeeInfoRepository = employeeInfoRepository;
        this.publicHolidayRepository = publicHolidayRepository;
        this.eventPublisher         = eventPublisher;
    }

    /** Save a new request as a DRAFT. No balance is reserved and no approver is notified yet. */
    @Transactional
    public LeaveResponse createLeaveRequest(LeaveCreateRequest req) {
        if (req.getEndTime().isBefore(req.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }

        // Phase 4.4: Guard against system-only leave types
        if (!EMPLOYEE_SUBMITTABLE.contains(req.getLeaveType())) {
            throw new BadRequestException(
                    "Leave type " + req.getLeaveType() + " cannot be submitted manually.");
        }

        // #3: count actual working days (exclude weekends + public holidays), not calendar days
        BigDecimal workingDays = computeWorkingDays(
                req.getStartTime().toLocalDate(), req.getEndTime().toLocalDate(), req.isHalfDay());
        if (workingDays.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException(
                    "The selected range contains no working days (weekends and public holidays are excluded).");
        }
        BigDecimal durationHours = workingDays.multiply(BigDecimal.valueOf(8));

        EmployeeInfo empRef = new EmployeeInfo();
        empRef.setEmployeeId(req.getEmployeeId());

        LeaveRequest leave = LeaveRequest.builder()
                .leaveRequestId(UUID.randomUUID().toString())
                .employeeInfo(empRef)
                .leaveType(req.getLeaveType())
                .reason(req.getReason())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .durationHours(durationHours)
                .balanceDeducted(false)
                .status(RequestStatus.DRAFT)
                .build();

        leaveRequestRepository.save(leave);
        return toResponse(leave);
    }

    /**
     * Submit a DRAFT request into the approval workflow (DRAFT → TO_APPROVE).
     * Stage 1 of the two-stage deduction (reserve balance) happens here, and the
     * approver is notified only now.
     */
    @Transactional
    public LeaveResponse submitLeaveRequest(String id) {
        LeaveRequest leave = findById(id);
        if (leave.getStatus() != RequestStatus.DRAFT) {
            throw new BadRequestException(
                    "Only DRAFT requests can be submitted. Current: " + leave.getStatus());
        }

        String employeeId = leave.getEmployeeInfo().getEmployeeId();

        // #2 / #4: advance-notice & past-date policy per leave type
        LocalDate startDate = leave.getStartTime().toLocalDate();
        int offset = MIN_START_OFFSET_DAYS.getOrDefault(leave.getLeaveType(), 0);
        LocalDate earliestAllowed = LocalDate.now().plusDays(offset);
        if (startDate.isBefore(earliestAllowed)) {
            if (offset > 0) {
                throw new BadRequestException(String.format(
                        "%s requires submitting at least %d day(s) before the start date.",
                        leave.getLeaveType(), offset));
            }
            throw new BadRequestException(String.format(
                    "%s cannot start more than %d day(s) in the past.",
                    leave.getLeaveType(), -offset));
        }

        // #1: reject overlap with another pending/approved leave for the same period
        long overlaps = leaveRequestRepository.countOverlapping(
                employeeId, leave.getLeaveRequestId(), ACTIVE_FOR_OVERLAP,
                leave.getStartTime(), leave.getEndTime());
        if (overlaps > 0) {
            throw new BadRequestException(
                    "This leave overlaps another pending or approved request for the same period.");
        }

        // Phase 4.2: Reserve balance on submission for balance-tracked leave types
        if (leave.getLeaveType() == LeaveType.ANNUAL && !leave.isBalanceDeducted()) {
            BigDecimal requestedDays = leave.getDurationHours()
                    .divide(BigDecimal.valueOf(8), 2, java.math.RoundingMode.HALF_UP);
            int year = leave.getStartTime().getYear();
            LeaveBalance balance = leaveBalanceRepository
                    .findByEmployeeInfo_EmployeeIdAndLeaveYearAndLeaveType(
                            leave.getEmployeeInfo().getEmployeeId(), year, leave.getLeaveType())
                    .orElse(null);

            if (balance != null) {
                if (balance.getRemainingDays().compareTo(requestedDays) < 0) {
                    throw new BadRequestException("Insufficient leave balance. Remaining: "
                            + balance.getRemainingDays() + " days.");
                }
                balance.setPendingDays(balance.getPendingDays().add(requestedDays));
                balance.setRemainingDays(balance.getRemainingDays().subtract(requestedDays));
                leaveBalanceRepository.save(balance);
                leave.setBalanceDeducted(true);
            }
        }

        leave.setStatus(RequestStatus.TO_APPROVE);
        leave.setUpdatedAt(LocalDateTime.now());
        leaveRequestRepository.save(leave);

        String empName = employeeInfoRepository.findById(employeeId)
                .map(EmployeeInfo::getName).orElse(employeeId);
        eventPublisher.publishEvent(new LeaveRequestSubmittedEvent(
                this, employeeId, empName, leave.getLeaveRequestId(),
                leave.getLeaveType().name()));

        return toResponse(leave);
    }

    public PageResponse<LeaveResponse> getAllLeaveRequests(String status, Pageable pageable) {
        Page<LeaveRequest> page = (status != null && !status.isBlank())
                ? leaveRequestRepository.findByStatus(RequestStatus.valueOf(status), pageable)
                : leaveRequestRepository.findAll(pageable);
        return PageResponse.from(page.map(this::toResponse));
    }

    public PageResponse<LeaveResponse> getByEmployee(String employeeId, Pageable pageable) {
        return PageResponse.from(leaveRequestRepository.findByEmployeeInfo_EmployeeId(employeeId, pageable)
                .map(this::toResponse));
    }

    public LeaveResponse getLeaveRequestById(String id) {
        return toResponse(findById(id));
    }

    @Transactional
    public LeaveResponse approveLeaveRequest(String id, String approverRole) {
        LeaveRequest leave = findById(id);
        RequestStatus current = leave.getStatus();

        switch (approverRole) {
            case "LEADER" -> {
                if (current != RequestStatus.TO_APPROVE)
                    throw new BadRequestException(
                            "LEADER can only approve requests in TO_APPROVE status. Current: " + current);
                leave.setStatus(RequestStatus.LEADER_APPROVED);
            }
            case "MANAGER" -> {
                if (current != RequestStatus.LEADER_APPROVED)
                    throw new BadRequestException(
                            "MANAGER can only approve requests in LEADER_APPROVED status. Current: " + current);
                // MANAGER is the terminal approver (HR removed from the flow).
                leave.setStatus(RequestStatus.APPROVED);
                // On final approval, convert reserved (pending) annual-leave balance to used.
                if (leave.isBalanceDeducted() && leave.getLeaveType() == LeaveType.ANNUAL) {
                    BigDecimal days = leave.getDurationHours()
                            .divide(BigDecimal.valueOf(8), 2, java.math.RoundingMode.HALF_UP);
                    int year = leave.getStartTime().getYear();
                    leaveBalanceRepository
                            .findByEmployeeInfo_EmployeeIdAndLeaveYearAndLeaveType(
                                    leave.getEmployeeInfo().getEmployeeId(), year, leave.getLeaveType())
                            .ifPresent(balance -> {
                                balance.setPendingDays(balance.getPendingDays().subtract(days));
                                balance.setUsedDays(balance.getUsedDays().add(days));
                                leaveBalanceRepository.save(balance);
                            });
                }
            }
            default -> throw new BadRequestException("Role '" + approverRole + "' is not authorized to approve requests.");
        }

        leave.setUpdatedAt(LocalDateTime.now());
        leaveRequestRepository.save(leave);

        // On final approval, materialise the leave into WorkDay records.
        if (leave.getStatus() == RequestStatus.APPROVED) {
            eventPublisher.publishEvent(new LeaveApprovedEvent(
                    this, leave.getLeaveRequestId(), leave.getEmployeeInfo().getEmployeeId(),
                    leave.getLeaveType(), leave.getStartTime(), leave.getEndTime()));
        }
        return toResponse(leave);
    }

    @Transactional
    public LeaveResponse rejectLeaveRequest(String id, String approverRole) {
        LeaveRequest leave = findById(id);
        RequestStatus current = leave.getStatus();

        boolean canReject = switch (approverRole) {
            case "LEADER"   -> current == RequestStatus.TO_APPROVE;
            case "MANAGER"  -> current == RequestStatus.LEADER_APPROVED;
            default -> false;
        };

        if (!canReject) {
            throw new BadRequestException(
                    "Role '" + approverRole + "' cannot reject a request in '" + current + "' status.");
        }

        leave.setStatus(RequestStatus.REJECTED);
        leave.setUpdatedAt(LocalDateTime.now());
        leaveRequestRepository.save(leave);

        // Phase 4.2: On rejection, release the reserved balance
        releaseBalance(leave);
        return toResponse(leave);
    }

    @Transactional
    public void deleteLeaveRequest(String id) {
        LeaveRequest leave = findById(id);
        if (leave.getStatus() != RequestStatus.DRAFT) {
            throw new BadRequestException(
                    "Only DRAFT requests can be cancelled. Submitted requests must be rejected by an approver.");
        }
        releaseBalance(leave); // no-op for DRAFT (balance is only reserved on submit) — kept defensively
        leaveRequestRepository.delete(leave);
    }

    // ── Leave Balance management ──────────────────────────────────────────────

    public List<LeaveBalanceResponse> getMyBalance(String employeeId, int year) {
        return leaveBalanceRepository.findByEmployeeInfo_EmployeeIdAndLeaveYear(employeeId, year)
                .stream().map(this::toBalanceResponse).collect(Collectors.toList());
    }

    @Transactional
    public void initialiseAnnualBalances(int year, BigDecimal entitlementDays) {
        // Creates ANNUAL leave balance records for all active employees
        // Called by HR at the start of each year
        // (Simplified: assumes EmployeeInfoRepository is injected in a real impl)
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void releaseBalance(LeaveRequest leave) {
        if (leave.isBalanceDeducted() && leave.getLeaveType() == LeaveType.ANNUAL
                && leave.getDurationHours() != null) {
            BigDecimal days = leave.getDurationHours()
                    .divide(BigDecimal.valueOf(8), 2, java.math.RoundingMode.HALF_UP);
            int year = leave.getStartTime().getYear();
            leaveBalanceRepository
                    .findByEmployeeInfo_EmployeeIdAndLeaveYearAndLeaveType(
                            leave.getEmployeeInfo().getEmployeeId(), year, leave.getLeaveType())
                    .ifPresent(balance -> {
                        balance.setPendingDays(balance.getPendingDays().subtract(days));
                        balance.setRemainingDays(balance.getRemainingDays().add(days));
                        leaveBalanceRepository.save(balance);
                    });
        }
    }

    /**
     * Number of actual working days in [start, end] inclusive, excluding weekends
     * (Sat/Sun) and configured public holidays. Half-day leave counts as 0.5.
     */
    private BigDecimal computeWorkingDays(LocalDate start, LocalDate end, boolean halfDay) {
        if (halfDay) {
            return BigDecimal.valueOf(0.5);
        }
        Set<LocalDate> holidays = publicHolidayRepository.findHolidayDatesBetween(start, end);
        long count = 0;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            DayOfWeek dow = d.getDayOfWeek();
            if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) continue;
            if (holidays.contains(d)) continue;
            count++;
        }
        return BigDecimal.valueOf(count);
    }

    private LeaveRequest findById(String id) {
        return leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", "id", id));
    }

    private LeaveResponse toResponse(LeaveRequest l) {
        LeaveResponse.LeaveResponseBuilder builder = LeaveResponse.builder()
                .leaveRequestId(l.getLeaveRequestId())
                .leaveType(l.getLeaveType() != null ? l.getLeaveType().name() : null)
                .reason(l.getReason())
                .startTime(l.getStartTime())
                .endTime(l.getEndTime())
                .status(l.getStatus() != null ? l.getStatus().name() : null)
                .durationHours(l.getDurationHours())
                .balanceDeducted(l.isBalanceDeducted())
                .createdAt(l.getCreatedAt())
                .updatedAt(l.getUpdatedAt());

        if (l.getEmployeeInfo() != null) {
            builder.employeeId(l.getEmployeeInfo().getEmployeeId())
                    .employeeName(l.getEmployeeInfo().getName());
        }
        return builder.build();
    }

    private LeaveBalanceResponse toBalanceResponse(LeaveBalance b) {
        return LeaveBalanceResponse.builder()
                .id(b.getId())
                .employeeId(b.getEmployeeInfo().getEmployeeId())
                .leaveYear(b.getLeaveYear())
                .leaveType(b.getLeaveType().name())
                .entitlementDays(b.getEntitlementDays())
                .carriedOverDays(b.getCarriedOverDays())
                .pendingDays(b.getPendingDays())
                .usedDays(b.getUsedDays())
                .remainingDays(b.getRemainingDays())
                .carryOverCap(b.getCarryOverCap())
                .build();
    }
}
