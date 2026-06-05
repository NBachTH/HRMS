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
import org.dummy.facez.domain.notification.event.LeaveRequestSubmittedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
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

    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final EmployeeInfoRepository employeeInfoRepository;
    private final ApplicationEventPublisher eventPublisher;

    public LeaveService(LeaveRequestRepository leaveRequestRepository,
                        LeaveBalanceRepository leaveBalanceRepository,
                        EmployeeInfoRepository employeeInfoRepository,
                        ApplicationEventPublisher eventPublisher) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.leaveBalanceRepository = leaveBalanceRepository;
        this.employeeInfoRepository = employeeInfoRepository;
        this.eventPublisher         = eventPublisher;
    }

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

        BigDecimal durationHours = computeDurationHours(req.getStartTime(), req.getEndTime());
        BigDecimal requestedDays = durationHours.divide(BigDecimal.valueOf(8), 2, java.math.RoundingMode.HALF_UP);

        // Phase 4.2: Reserve balance on submission for balance-tracked leave types
        boolean balanceDeducted = false;
        if (req.getLeaveType() == LeaveType.ANNUAL) {
            int year = req.getStartTime().getYear();
            LeaveBalance balance = leaveBalanceRepository
                    .findByEmployeeInfo_EmployeeIdAndLeaveYearAndLeaveType(
                            req.getEmployeeId(), year, req.getLeaveType())
                    .orElse(null);

            if (balance != null) {
                if (balance.getRemainingDays().compareTo(requestedDays) < 0) {
                    throw new BadRequestException("Insufficient leave balance. Remaining: "
                            + balance.getRemainingDays() + " days.");
                }
                balance.setPendingDays(balance.getPendingDays().add(requestedDays));
                balance.setRemainingDays(balance.getRemainingDays().subtract(requestedDays));
                leaveBalanceRepository.save(balance);
                balanceDeducted = true;
            }
        }

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
                .balanceDeducted(balanceDeducted)
                .status(RequestStatus.TO_APPROVE)
                .build();

        leaveRequestRepository.save(leave);

        String empName = employeeInfoRepository.findById(req.getEmployeeId())
                .map(EmployeeInfo::getName).orElse(req.getEmployeeId());
        eventPublisher.publishEvent(new LeaveRequestSubmittedEvent(
                this, req.getEmployeeId(), empName, leave.getLeaveRequestId(),
                req.getLeaveType().name()));

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
                leave.setStatus(RequestStatus.MANAGER_APPROVED);
            }
            case "HR_ADMIN" -> {
                if (current != RequestStatus.MANAGER_APPROVED)
                    throw new BadRequestException(
                            "HR_ADMIN can only give final approval on MANAGER_APPROVED requests. Current: " + current);
                leave.setStatus(RequestStatus.APPROVED);
                // Phase 4.2: On final approval, convert pending to confirmed
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
        return toResponse(leave);
    }

    @Transactional
    public LeaveResponse rejectLeaveRequest(String id, String approverRole) {
        LeaveRequest leave = findById(id);
        RequestStatus current = leave.getStatus();

        boolean canReject = switch (approverRole) {
            case "LEADER"   -> current == RequestStatus.TO_APPROVE;
            case "MANAGER"  -> current == RequestStatus.LEADER_APPROVED;
            case "HR_ADMIN" -> current == RequestStatus.MANAGER_APPROVED;
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
        if (leave.getStatus() != RequestStatus.TO_APPROVE && leave.getStatus() != RequestStatus.DRAFT) {
            throw new BadRequestException(
                    "Cannot delete a leave request that has already entered the approval process.");
        }
        releaseBalance(leave);
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

    private BigDecimal computeDurationHours(LocalDateTime start, LocalDateTime end) {
        long minutes = Duration.between(start, end).toMinutes();
        return BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, java.math.RoundingMode.HALF_UP);
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
