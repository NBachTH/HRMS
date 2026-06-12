package org.dummy.facez.domain.attendance.service;

import org.dummy.facez.domain.attendance.dto.BatchCheckinResponse;
import org.dummy.facez.domain.attendance.dto.BatchCheckinResponse.BatchCheckinItem;
import org.dummy.facez.domain.attendance.dto.CheckinLogRequest;
import org.dummy.facez.domain.attendance.dto.CheckinLogResponse;
import org.dummy.facez.domain.attendance.event.CheckinProcessedEvent;
import org.dummy.facez.domain.attendance.model.CheckinLog;
import org.dummy.facez.domain.attendance.repository.CheckinLogRepository;
import org.dummy.facez.domain.attendance.repository.DeviceRepository;
import org.dummy.facez.domain.attendance.model.Device;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class CheckinLogService {

    private final CheckinLogRepository checkinLogRepository;
    private final DeviceRepository deviceRepository;
    private final EmployeeInfoRepository employeeInfoRepository;
    private final ApplicationEventPublisher eventPublisher;

    public CheckinLogService(CheckinLogRepository checkinLogRepository,
                             DeviceRepository deviceRepository,
                             EmployeeInfoRepository employeeInfoRepository,
                             ApplicationEventPublisher eventPublisher) {
        this.checkinLogRepository = checkinLogRepository;
        this.deviceRepository = deviceRepository;
        this.employeeInfoRepository = employeeInfoRepository;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Real-time: save a single check-in/out event and publish event for attendance processing.
     */
    @Transactional
    public CheckinLogResponse processRealTime(CheckinLogRequest req) {
        Device device = deviceRepository.findById(req.getDeviceId())
                .orElseThrow(() -> new ResourceNotFoundException("Device", "id", req.getDeviceId()));

        EmployeeInfo employee = employeeInfoRepository.findById(req.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", req.getEmployeeId()));

        CheckinLog log = CheckinLog.builder()
                .logId(UUID.randomUUID().toString())
                .device(device)
                .employeeInfo(employee)
                .logTime(req.getLogTime())
                .logType(req.getLogType())
                .deleteFlag(false)
                .build();

        checkinLogRepository.save(log);

        // Publish event — AttendanceService listens via @TransactionalEventListener(AFTER_COMMIT)
        eventPublisher.publishEvent(
                new CheckinProcessedEvent(this, employee, log.getLogTime(), log.getLogType()));

        return toResponse(log);
    }

    /**
     * Batch: process a list of check-in/out events independently — one failure does not block the rest.
     */
    public BatchCheckinResponse processBatch(List<CheckinLogRequest> requests) {
        List<BatchCheckinItem> results = new ArrayList<>();
        int success = 0;
        int failed  = 0;

        for (int i = 0; i < requests.size(); i++) {
            CheckinLogRequest req = requests.get(i);
            try {
                CheckinLogResponse data = processRealTime(req);
                results.add(BatchCheckinItem.builder()
                        .index(i).success(true).data(data).build());
                success++;
            } catch (Exception e) {
                results.add(BatchCheckinItem.builder()
                        .index(i).success(false).errorMessage(e.getMessage()).build());
                failed++;
            }
        }

        return BatchCheckinResponse.builder()
                .total(requests.size())
                .success(success)
                .failed(failed)
                .results(results)
                .build();
    }

    public List<CheckinLogResponse> findByCheckinDateWithEmployee(LocalDate date) {
        List<CheckinLog> logs = checkinLogRepository.findByCheckinDateWithEmployee(date);
        List<CheckinLogResponse> responses = new ArrayList<>();
        for (CheckinLog log : logs) {
            responses.add(toResponse(log));
        }
        return responses;
    }

    /** Self-service: only the given employee's raw logs for a single day. */
    public List<CheckinLogResponse> findByEmployeeAndDate(String employeeId, LocalDate date) {
        List<CheckinLog> logs = checkinLogRepository.findByEmployeeAndCheckinDate(employeeId, date);
        List<CheckinLogResponse> responses = new ArrayList<>();
        for (CheckinLog log : logs) {
            responses.add(toResponse(log));
        }
        return responses;
    }

    private CheckinLogResponse toResponse(CheckinLog log) {
        CheckinLogResponse.CheckinLogResponseBuilder builder = CheckinLogResponse.builder()
                .logId(log.getLogId())
                .logTime(log.getLogTime())
                .logType(log.getLogType())
                .deleteFlag(log.isDeleteFlag())
                .deletedAt(log.getDeletedAt())
                .createdAt(LocalDateTime.now());

        if (log.getEmployeeInfo() != null) {
            builder.employeeId(log.getEmployeeInfo().getEmployeeId())
                    .employeeName(log.getEmployeeInfo().getName());
        }
        if (log.getDevice() != null) {
            builder.deviceId(log.getDevice().getDeviceId())
                    .deviceName(log.getDevice().getDeviceName());
        }
        return builder.build();
    }
}
