package org.dummy.facez.domain.attendance.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.dummy.facez.domain.attendance.dto.AttendanceRequest;
import org.dummy.facez.domain.attendance.dto.AttendanceResponse;
import org.dummy.facez.domain.attendance.event.CheckinProcessedEvent;
import org.dummy.facez.domain.attendance.model.Attendance;
import org.dummy.facez.domain.attendance.model.CheckinLog;
import org.dummy.facez.domain.attendance.repository.AttendanceRepository;
import org.dummy.facez.domain.attendance.repository.PublicHolidayRepository;
import org.dummy.facez.common.enums.LogTypes;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.payroll.model.SystemConfig;
import org.dummy.facez.domain.payroll.repository.SystemConfigRepository;
import org.dummy.facez.domain.workday.service.WorkDayService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AttendanceService {

    private static final Logger log = LoggerFactory.getLogger(AttendanceService.class);

    private static final LocalTime DEFAULT_WORK_START = LocalTime.of(8, 30);
    private static final int DEFAULT_WORK_HOURS_PER_DAY = 8;

    private final AttendanceRepository attendanceRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final PublicHolidayRepository publicHolidayRepository;
    private final WorkDayService workDayService;

    public AttendanceService(AttendanceRepository attendanceRepository,
                             SystemConfigRepository systemConfigRepository,
                             PublicHolidayRepository publicHolidayRepository,
                             WorkDayService workDayService) {
        this.attendanceRepository = attendanceRepository;
        this.systemConfigRepository = systemConfigRepository;
        this.publicHolidayRepository = publicHolidayRepository;
        this.workDayService = workDayService;
    }

    // ── Spring Event listener — wired from CheckinLogService via ApplicationEventPublisher ──

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onCheckinProcessed(CheckinProcessedEvent event) {
        try {
            processCheckinForAttendance(event.getEmployee(), event.getLogTime(), event.getLogType());
        } catch (Exception e) {
            log.error("Failed to process attendance for employee {} at {}: {}",
                    event.getEmployee().getEmployeeId(), event.getLogTime(), e.getMessage(), e);
        }
    }

    @Transactional
    public void processCheckinForAttendance(EmployeeInfo employee, LocalDateTime logTime, LogTypes logType) {
        LocalDate date = logTime.toLocalDate();
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd   = date.atTime(23, 59, 59);

        if (logType == LogTypes.IN) {
            boolean exists = attendanceRepository
                    .findFirstByEmployeeInfo_EmployeeIdAndCheckInBetweenAndDeleteFlagFalse(
                            employee.getEmployeeId(), dayStart, dayEnd)
                    .isPresent();
            if (!exists) {
                Attendance att = Attendance.builder()
                        .attendanceId(UUID.randomUUID().toString())
                        .employeeInfo(employee)
                        .attendanceDate(date)
                        .deleteFlag(false)
                        .violate(false)
                        .build();
                computeAndApply(att, logTime, null);
                attendanceRepository.save(att);
                workDayService.syncFromAttendance(att);
            }
        } else if (logType == LogTypes.OUT) {
            attendanceRepository
                    .findFirstByEmployeeInfo_EmployeeIdAndCheckInBetweenAndCheckOutIsNullAndDeleteFlagFalse(
                            employee.getEmployeeId(), dayStart, dayEnd)
                    .ifPresent(att -> {
                        computeAndApply(att, att.getCheckIn(), logTime);
                        attendanceRepository.save(att);
                        workDayService.syncFromAttendance(att);
                    });
        }
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    public PageResponse<AttendanceResponse> getAllAttendances(
            String employeeId, LocalDate date, LocalDate from, LocalDate to, Pageable pageable) {

        Page<Attendance> page;
        LocalDateTime start = null;
        LocalDateTime end   = null;

        if (date != null) {
            start = date.atStartOfDay();
            end   = date.plusDays(1).atStartOfDay();
        } else if (from != null || to != null) {
            start = from != null ? from.atStartOfDay() : LocalDate.of(2000, 1, 1).atStartOfDay();
            end   = to   != null ? to.plusDays(1).atStartOfDay() : LocalDate.of(2100, 1, 1).atStartOfDay();
        }

        if (employeeId != null && !employeeId.isBlank() && start != null) {
            page = attendanceRepository.findByEmployeeInfo_EmployeeIdAndCheckInBetweenAndDeleteFlagFalse(
                    employeeId, start, end, pageable);
        } else if (employeeId != null && !employeeId.isBlank()) {
            page = attendanceRepository.findByEmployeeInfo_EmployeeIdAndDeleteFlagFalse(employeeId, pageable);
        } else if (start != null) {
            page = attendanceRepository.findByCheckInBetweenAndDeleteFlagFalse(start, end, pageable);
        } else {
            page = attendanceRepository.findByDeleteFlagFalse(pageable);
        }

        return PageResponse.from(page.map(this::toResponse));
    }

    public AttendanceResponse getAttendanceById(String id) {
        return toResponse(attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance", "id", id)));
    }

    @Transactional
    public AttendanceResponse updateAttendance(String id, AttendanceRequest req) {
        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance", "id", id));

        LocalDateTime checkIn  = req.getCheckIn()  != null ? req.getCheckIn()  : attendance.getCheckIn();
        LocalDateTime checkOut = req.getCheckOut() != null ? req.getCheckOut() : attendance.getCheckOut();

        computeAndApply(attendance, checkIn, checkOut);
        attendance.setUpdatedAt(LocalDateTime.now());
        attendanceRepository.save(attendance);
        workDayService.syncFromAttendance(attendance);
        return toResponse(attendance);
    }

    /**
     * Create or update the attendance for an employee on a date with explicit
     * check-in/out times (used when an attendance-adjustment request is approved).
     * Recomputes derived hours and syncs the WorkDay.
     */
    @Transactional
    public Attendance upsertManualAttendance(String employeeId, LocalDate date,
                                             LocalDateTime checkIn, LocalDateTime checkOut) {
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd   = date.atTime(23, 59, 59);

        Attendance att = attendanceRepository
                .findFirstByEmployeeInfo_EmployeeIdAndCheckInBetweenAndDeleteFlagFalse(
                        employeeId, dayStart, dayEnd)
                .orElse(null);
        if (att == null) {
            EmployeeInfo ref = new EmployeeInfo();
            ref.setEmployeeId(employeeId);
            att = Attendance.builder()
                    .attendanceId(UUID.randomUUID().toString())
                    .employeeInfo(ref)
                    .attendanceDate(date)
                    .deleteFlag(false)
                    .build();
        }
        computeAndApply(att, checkIn, checkOut);
        att.setUpdatedAt(LocalDateTime.now());
        attendanceRepository.save(att);
        workDayService.syncFromAttendance(att);
        return att;
    }

    @Transactional
    public void deleteAttendance(String id) {
        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance", "id", id));
        attendance.setDeleteFlag(true);
        attendance.setDeletedAt(LocalDateTime.now());
        attendanceRepository.save(attendance);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    Attendance buildAttendance(EmployeeInfo emp, LocalDate date, List<CheckinLog> logs) {
        LocalDateTime firstCheckin = logs.stream()
                .filter(l -> l.getLogType() == LogTypes.IN)
                .map(l -> l.getLogTime())
                .min(Comparator.naturalOrder())
                .orElse(null);

        LocalDateTime lastCheckout = logs.stream()
                .filter(l -> l.getLogType() == LogTypes.OUT)
                .map(CheckinLog::getLogTime)
                .max(Comparator.naturalOrder())
                .orElse(null);

        Attendance a = Attendance.builder()
                .attendanceId(UUID.randomUUID().toString())
                .employeeInfo(emp)
                .attendanceDate(date)
                .build();
        computeAndApply(a, firstCheckin, lastCheckout);
        return a;
    }

    private void computeAndApply(Attendance a, LocalDateTime checkIn, LocalDateTime checkOut) {
        LocalTime workStart      = getWorkStart();
        BigDecimal workHoursPerDay = BigDecimal.valueOf(getWorkHoursPerDay());

        a.setCheckIn(checkIn);
        a.setCheckOut(checkOut);

        BigDecimal lateHour = BigDecimal.ZERO;
        if (checkIn != null) {
            LocalTime checkInTime = checkIn.toLocalTime();
            if (checkInTime.isAfter(workStart)) {
                long lateMinutes = Duration.between(workStart, checkInTime).toMinutes();
                lateHour = BigDecimal.valueOf(lateMinutes)
                        .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
            }
        }

        BigDecimal workingHour = BigDecimal.ZERO;
        if (checkIn != null && checkOut != null) {
            long minutes = Duration.between(checkIn, checkOut).toMinutes();
            workingHour = BigDecimal.valueOf(minutes)
                    .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        }

        BigDecimal paidHour  = workingHour.subtract(lateHour).max(BigDecimal.ZERO);
        BigDecimal workingDay = workingHour.divide(workHoursPerDay, 2, RoundingMode.HALF_UP);
        BigDecimal paidDay   = paidHour.divide(workHoursPerDay, 2, RoundingMode.HALF_UP);
        boolean violate      = lateHour.compareTo(BigDecimal.ZERO) > 0 || checkOut == null;

        a.setLateHour(lateHour);
        a.setWorkingHour(workingHour);
        a.setPaidHour(paidHour);
        a.setWorkingDay(workingDay);
        a.setPaidDay(paidDay);
        a.setViolate(violate);
    }

    private LocalTime getWorkStart() {
        Optional<SystemConfig> cfg = systemConfigRepository.findByConfigTypeAndActiveTrue("WORK_SCHEDULE");
        if (cfg.isEmpty()) return DEFAULT_WORK_START;
        try {
            JsonNode node = cfg.get().getConfigData();
            String time = node.path("workStartTime").asText(null);
            if (time != null) return LocalTime.parse(time);
        } catch (Exception ignored) {}
        return DEFAULT_WORK_START;
    }

    private int getWorkHoursPerDay() {
        Optional<SystemConfig> cfg = systemConfigRepository.findByConfigTypeAndActiveTrue("WORK_SCHEDULE");
        if (cfg.isEmpty()) return DEFAULT_WORK_HOURS_PER_DAY;
        try {
            JsonNode node = cfg.get().getConfigData();
            int hours = node.path("workHoursPerDay").asInt(0);
            if (hours > 0) return hours;
        } catch (Exception ignored) {}
        return DEFAULT_WORK_HOURS_PER_DAY;
    }

    public boolean isPublicHoliday(LocalDate date) {
        return publicHolidayRepository.existsByHolidayDate(date);
    }

    private AttendanceResponse toResponse(Attendance a) {
        AttendanceResponse.AttendanceResponseBuilder builder = AttendanceResponse.builder()
                .attendanceId(a.getAttendanceId())
                .date(a.getCheckIn() != null ? a.getCheckIn().toLocalDate() : null)
                .checkIn(a.getCheckIn())
                .checkOut(a.getCheckOut())
                .lateHour(a.getLateHour())
                .workingHour(a.getWorkingHour())
                .paidHour(a.getPaidHour())
                .workingDay(a.getWorkingDay())
                .paidDay(a.getPaidDay())
                .violate(a.isViolate())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt());

        if (a.getEmployeeInfo() != null) {
            builder.employeeId(a.getEmployeeInfo().getEmployeeId())
                    .employeeName(a.getEmployeeInfo().getName());
        }
        return builder.build();
    }
}
