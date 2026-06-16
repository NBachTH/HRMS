package org.dummy.facez.domain.otrequest.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.attendance.model.Attendance;
import org.dummy.facez.domain.attendance.repository.AttendanceRepository;
import org.dummy.facez.domain.otrequest.repository.OTRequestRepository;
import org.dummy.facez.domain.otrequest.repository.OTPlanEmployeeRepository;
import org.dummy.facez.domain.otrequest.repository.OTPlanRepository;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.otrequest.model.OTPlan;
import org.dummy.facez.domain.otrequest.model.OTRequest;
import org.dummy.facez.domain.otrequest.dto.OTRequestCreateDto;
import org.dummy.facez.domain.otrequest.dto.OTRequestResponse;
import org.dummy.facez.domain.payroll.model.SystemConfig;
import org.dummy.facez.domain.payroll.repository.SystemConfigRepository;
import org.dummy.facez.domain.workday.event.OTApprovedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
public class OTRequestService {

    // Labour Code Article 107: max 40 hours/month = 2400 minutes
    private static final long MAX_MONTHLY_OT_MINUTES = 2400L;
    // Max 200 hours/year = 12000 minutes
    private static final long MAX_ANNUAL_OT_MINUTES = 12000L;

    // Allowed slack between the planned end time and the claimed actual end time.
    private static final long END_BUFFER_MINUTES = 30L;
    // Lunch break added when deriving the standard work end time from WORK_SCHEDULE.
    private static final long LUNCH_MINUTES = 60L;
    private static final LocalTime DEFAULT_WORK_START = LocalTime.of(8, 30);
    private static final int DEFAULT_WORK_HOURS = 8;

    /** Statuses that occupy time for OT overlap detection. */
    private static final List<RequestStatus> ACTIVE_FOR_OVERLAP = List.of(
            RequestStatus.TO_APPROVE, RequestStatus.LEADER_APPROVED,
            RequestStatus.MANAGER_APPROVED, RequestStatus.APPROVED);

    private final OTRequestRepository otRequestRepository;
    private final OTPlanRepository otPlanRepository;
    private final OTPlanEmployeeRepository otPlanEmployeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final org.dummy.facez.domain.attendance.repository.PublicHolidayRepository publicHolidayRepository;
    private final ApplicationEventPublisher eventPublisher;

    public OTRequestService(OTRequestRepository otRequestRepository,
                            OTPlanRepository otPlanRepository,
                            OTPlanEmployeeRepository otPlanEmployeeRepository,
                            AttendanceRepository attendanceRepository,
                            SystemConfigRepository systemConfigRepository,
                            org.dummy.facez.domain.attendance.repository.PublicHolidayRepository publicHolidayRepository,
                            ApplicationEventPublisher eventPublisher) {
        this.otRequestRepository = otRequestRepository;
        this.otPlanRepository = otPlanRepository;
        this.otPlanEmployeeRepository = otPlanEmployeeRepository;
        this.attendanceRepository = attendanceRepository;
        this.systemConfigRepository = systemConfigRepository;
        this.publicHolidayRepository = publicHolidayRepository;
        this.eventPublisher = eventPublisher;
    }

    /** weekday 1.5 · weekend 2.0 · public holiday 3.0 */
    private double otCoefficient(LocalDate otDate) {
        if (publicHolidayRepository.existsByHolidayDate(otDate)) return 3.0;
        java.time.DayOfWeek dow = otDate.getDayOfWeek();
        return (dow == java.time.DayOfWeek.SATURDAY || dow == java.time.DayOfWeek.SUNDAY) ? 2.0 : 1.5;
    }

    /**
     * Logs an actual OT session against an approved OT plan. Runs the four-step
     * validation (plan → attendance → legal limits → overlap) and, when everything
     * passes, auto-approves the request — the manager-approved plan plus the device
     * attendance are the objective evidence, so no further approval round is needed.
     */
    @Transactional
    public OTRequestResponse createOTRequest(OTRequestCreateDto req) {
        String employeeId = req.getEmployeeId();
        LocalDateTime start = req.getActualStartTime();
        LocalDateTime end   = req.getActualEndTime();

        if (!end.isAfter(start)) {
            throw new BadRequestException("Actual end time must be after actual start time");
        }
        long requestedMinutes = Duration.between(start, end).toMinutes();
        LocalDate otDate = start.toLocalDate();

        // ── Step 1: OT plan exists, is approved, includes this employee, matches the date ──
        OTPlan plan = otPlanRepository.findById(req.getOtPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("OTPlan", "id", req.getOtPlanId()));
        if (plan.getStatus() != RequestStatus.APPROVED) {
            throw new BadRequestException("OT plan is not approved (status: " + plan.getStatus() + ").");
        }
        if (!otPlanEmployeeRepository.existsByOtPlan_IdAndEmployee_EmployeeId(plan.getId(), employeeId)) {
            throw new BadRequestException("You are not assigned to this OT plan.");
        }
        if (!plan.getOtDate().equals(otDate)) {
            throw new BadRequestException(String.format(
                    "OT date (%s) does not match the plan date (%s).", otDate, plan.getOtDate()));
        }

        // ── Step 2: validate against the real attendance record for that day ──
        List<Attendance> atts = attendanceRepository.findByEmployeeAndDateRange(employeeId, otDate, otDate);
        Attendance att = atts.isEmpty() ? null : atts.get(0);
        if (att == null || att.getCheckIn() == null || att.getCheckOut() == null) {
            throw new BadRequestException(
                    "No completed attendance record (check-in and check-out) found for " + otDate
                    + ". OT cannot be validated.");
        }
        if (start.isBefore(att.getCheckIn())) {
            throw new BadRequestException("OT start is before the recorded check-in (" + att.getCheckIn() + ").");
        }
        if (end.isAfter(att.getCheckOut())) {
            throw new BadRequestException("OT end is after the recorded check-out (" + att.getCheckOut() + ").");
        }
        LocalTime standardEnd = standardWorkEndTime();
        if (start.toLocalTime().isBefore(standardEnd)) {
            throw new BadRequestException("OT must start after standard working hours (" + standardEnd + ").");
        }

        // ── Step 3: legal limits + plan end-time buffer ──
        if (plan.getPlannedEndTime() != null) {
            LocalTime maxEnd = plan.getPlannedEndTime().plusMinutes(END_BUFFER_MINUTES);
            if (end.toLocalTime().isAfter(maxEnd)) {
                throw new BadRequestException(String.format(
                        "OT end exceeds the planned end time (%s) by more than %d minutes.",
                        plan.getPlannedEndTime(), END_BUFFER_MINUTES));
            }
        }
        long monthlyOtMinutes = otRequestRepository.sumApprovedMinutesForMonth(
                employeeId, otDate.getYear(), otDate.getMonthValue());
        if (monthlyOtMinutes + requestedMinutes > MAX_MONTHLY_OT_MINUTES) {
            throw new BadRequestException(String.format(
                    "This request would exceed the 40-hour monthly OT limit. " +
                    "Approved this month: %.1fh. Requested: %.1fh.",
                    monthlyOtMinutes / 60.0, requestedMinutes / 60.0));
        }
        long annualOtMinutes = otRequestRepository.sumApprovedMinutesForYear(employeeId, otDate.getYear());
        if (annualOtMinutes + requestedMinutes > MAX_ANNUAL_OT_MINUTES) {
            throw new BadRequestException(String.format(
                    "This request would exceed the 200-hour annual OT limit. " +
                    "Approved this year: %.1fh.", annualOtMinutes / 60.0));
        }

        // ── Step 4: no overlap with another pending/approved OT request ──
        long overlaps = otRequestRepository.countOverlapping(employeeId, ACTIVE_FOR_OVERLAP, start, end);
        if (overlaps > 0) {
            throw new BadRequestException("This OT session overlaps another OT request for the same period.");
        }

        // All checks pass → auto-approve.
        EmployeeInfo empRef = new EmployeeInfo();
        empRef.setEmployeeId(employeeId);

        OTRequest ot = OTRequest.builder()
                .otRequestId(UUID.randomUUID().toString())
                .employeeInfo(empRef)
                .otPlan(plan)
                .startTime(start)
                .endTime(end)
                .status(RequestStatus.APPROVED)
                .coefficient(otCoefficient(otDate))
                .build();

        otRequestRepository.save(ot);

        // Auto-approved → feed the OT minutes into the WorkDay for that day.
        eventPublisher.publishEvent(new OTApprovedEvent(this, ot.getOtRequestId(), employeeId, start, end));
        return toResponse(ot);
    }

    public PageResponse<OTRequestResponse> getAllOTRequests(String status, Pageable pageable) {
        Page<OTRequest> page = (status != null && !status.isBlank())
                ? otRequestRepository.findByStatus(RequestStatus.valueOf(status), pageable)
                : otRequestRepository.findAll(pageable);
        return PageResponse.from(page.map(this::toResponse));
    }

    public PageResponse<OTRequestResponse> getByEmployee(String employeeId, Pageable pageable) {
        return PageResponse.from(otRequestRepository.findByEmployeeInfo_EmployeeId(employeeId, pageable)
                .map(this::toResponse));
    }

    public OTRequestResponse getOTRequestById(String id) {
        return toResponse(findById(id));
    }

    @Transactional
    public OTRequestResponse approveOTRequest(String id, String approverRole) {
        OTRequest ot = findById(id);
        RequestStatus current = ot.getStatus();

        switch (approverRole) {
            case "LEADER" -> {
                if (current != RequestStatus.TO_APPROVE)
                    throw new BadRequestException(
                            "LEADER can only approve requests in TO_APPROVE status. Current: " + current);
                ot.setStatus(RequestStatus.LEADER_APPROVED);
            }
            case "MANAGER" -> {
                if (current != RequestStatus.LEADER_APPROVED)
                    throw new BadRequestException(
                            "MANAGER can only approve requests in LEADER_APPROVED status. Current: " + current);
                // MANAGER is the terminal approver (HR removed from the flow).
                ot.setStatus(RequestStatus.APPROVED);
            }
            default -> throw new BadRequestException("Role '" + approverRole + "' is not authorized to approve requests.");
        }

        ot.setUpdatedAt(LocalDateTime.now());
        otRequestRepository.save(ot);

        // Feed approved OT minutes into the WorkDay (same as the auto-approve path).
        if (ot.getStatus() == RequestStatus.APPROVED) {
            eventPublisher.publishEvent(new OTApprovedEvent(
                    this, ot.getOtRequestId(), ot.getEmployeeInfo().getEmployeeId(),
                    ot.getStartTime(), ot.getEndTime()));
        }
        return toResponse(ot);
    }

    @Transactional
    public OTRequestResponse rejectOTRequest(String id, String approverRole) {
        OTRequest ot = findById(id);
        RequestStatus current = ot.getStatus();

        boolean canReject = switch (approverRole) {
            case "LEADER"   -> current == RequestStatus.TO_APPROVE;
            case "MANAGER"  -> current == RequestStatus.LEADER_APPROVED;
            default -> false;
        };

        if (!canReject) {
            throw new BadRequestException(
                    "Role '" + approverRole + "' cannot reject a request in '" + current + "' status.");
        }

        ot.setStatus(RequestStatus.REJECTED);
        ot.setUpdatedAt(LocalDateTime.now());
        otRequestRepository.save(ot);
        return toResponse(ot);
    }

    @Transactional
    public void deleteOTRequest(String id) {
        OTRequest ot = findById(id);
        if (ot.getStatus() != RequestStatus.DRAFT) {
            throw new BadRequestException(
                    "Only DRAFT requests can be cancelled. Submitted requests must be rejected by an approver.");
        }
        otRequestRepository.delete(ot);
    }

    private OTRequest findById(String id) {
        return otRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OTRequest", "id", id));
    }

    /** Standard end of the work day, derived from the active WORK_SCHEDULE config. */
    private LocalTime standardWorkEndTime() {
        LocalTime start = DEFAULT_WORK_START;
        int hours = DEFAULT_WORK_HOURS;
        SystemConfig cfg = systemConfigRepository.findByConfigTypeAndActiveTrue("WORK_SCHEDULE").orElse(null);
        if (cfg != null && cfg.getConfigData() != null) {
            JsonNode d = cfg.getConfigData();
            if (d.hasNonNull("workStartTime")) {
                try { start = LocalTime.parse(d.get("workStartTime").asText()); }
                catch (RuntimeException ignored) { /* keep default */ }
            }
            if (d.hasNonNull("workHoursPerDay")) {
                hours = d.get("workHoursPerDay").asInt(hours);
            }
        }
        return start.plusHours(hours).plusMinutes(LUNCH_MINUTES);
    }

    private OTRequestResponse toResponse(OTRequest ot) {
        OTRequestResponse.OTRequestResponseBuilder builder = OTRequestResponse.builder()
                .otRequestId(ot.getOtRequestId())
                .otPlanId(ot.getOtPlan() != null ? ot.getOtPlan().getId() : null)
                .startTime(ot.getStartTime())
                .endTime(ot.getEndTime())
                .status(ot.getStatus() != null ? ot.getStatus().name() : null)
                .coefficient(ot.getCoefficient())
                .createdAt(ot.getCreatedAt())
                .updatedAt(ot.getUpdatedAt());

        if (ot.getEmployeeInfo() != null) {
            builder.employeeId(ot.getEmployeeInfo().getEmployeeId())
                    .employeeName(ot.getEmployeeInfo().getName());
        }
        return builder.build();
    }
}
