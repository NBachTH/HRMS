package org.dummy.facez.domain.workday.repository;

import org.dummy.facez.common.enums.WorkDaySource;
import org.dummy.facez.domain.workday.model.WorkDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface WorkDayRepository extends JpaRepository<WorkDay, String> {

    Optional<WorkDay> findByEmployeeInfo_EmployeeIdAndWorkDate(String employeeId, LocalDate workDate);

    List<WorkDay> findByEmployeeInfo_EmployeeIdAndWorkDateBetween(String employeeId, LocalDate from, LocalDate to);

    /** Bulk load for batch payroll. */
    List<WorkDay> findByEmployeeInfo_EmployeeIdInAndWorkDateBetween(
            Collection<String> employeeIds, LocalDate from, LocalDate to);

    List<WorkDay> findByWorkDateBetweenAndSource(LocalDate from, LocalDate to, WorkDaySource source);

    long countByWorkDateBetweenAndSource(LocalDate from, LocalDate to, WorkDaySource source);

    /** Employee IDs that already have a WorkDay on the given date. */
    @Query("SELECT w.employeeInfo.employeeId FROM WorkDay w WHERE w.workDate = :date")
    List<String> findEmployeeIdsByDate(@Param("date") LocalDate date);
}
