package org.dummy.facez.domain.attendance.repository;

import org.dummy.facez.domain.attendance.model.AttendancePeriodClose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AttendancePeriodCloseRepository extends JpaRepository<AttendancePeriodClose, String> {
    Optional<AttendancePeriodClose> findByCloseYearAndCloseMonth(int year, int month);
    boolean existsByCloseYearAndCloseMonth(int year, int month);
}
