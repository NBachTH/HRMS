package org.dummy.facez.domain.attendance.service;

import lombok.RequiredArgsConstructor;
import org.dummy.facez.domain.attendance.model.Attendance;
import org.dummy.facez.domain.attendance.model.CheckinLog;
import org.dummy.facez.domain.attendance.repository.AttendanceRepository;
import org.dummy.facez.domain.attendance.repository.CheckinLogRepository;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceSchedule {
    private final CheckinLogRepository checkinLogRepo;
    private final AttendanceRepository attendanceRepo;
    private final AttendanceService attendanceService;

    @Scheduled(cron = "0 0 0 * * *") // 0h mỗi ngày
    @Transactional
    public void processAttendanceForYesterday() {
        LocalDate yesterday = LocalDate.now().minusDays(1);

        // Group checkin logs theo từng employee
        List<CheckinLog> logs = checkinLogRepo.findByCheckinDateWithEmployee(yesterday);

        Map<EmployeeInfo, List<CheckinLog>> grouped = logs.stream()
                .collect(Collectors.groupingBy(CheckinLog::getEmployeeInfo));

        grouped.forEach((employee, employeeLogs) -> {
            Attendance attendance = attendanceService.buildAttendance(employee, yesterday, employeeLogs);
            attendanceRepo.save(attendance);
        });
    }
}
