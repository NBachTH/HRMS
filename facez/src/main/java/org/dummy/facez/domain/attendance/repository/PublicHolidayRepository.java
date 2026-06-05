package org.dummy.facez.domain.attendance.repository;

import org.dummy.facez.domain.attendance.model.PublicHoliday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

public interface PublicHolidayRepository extends JpaRepository<PublicHoliday, String> {
    List<PublicHoliday> findByHolidayYear(int year);
    boolean existsByHolidayDate(LocalDate date);

    @Query("SELECT p.holidayDate FROM PublicHoliday p WHERE p.holidayDate BETWEEN :from AND :to")
    Set<LocalDate> findHolidayDatesBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
