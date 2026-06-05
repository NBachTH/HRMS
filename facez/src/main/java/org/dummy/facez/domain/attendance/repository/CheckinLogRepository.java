package org.dummy.facez.domain.attendance.repository;

import org.dummy.facez.domain.attendance.model.CheckinLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface CheckinLogRepository extends JpaRepository<CheckinLog, String> {
    @Query("""
        SELECT c FROM CheckinLog c
        JOIN FETCH c.employeeInfo
        WHERE DATE(c.logTime) = :date
        ORDER BY c.logTime
    """)
    List<CheckinLog> findByCheckinDateWithEmployee(@Param("date")LocalDate checkinDate);
}
