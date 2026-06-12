package org.dummy.facez.domain.workday.repository;

import org.dummy.facez.domain.workday.model.Timesheet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TimesheetRepository extends JpaRepository<Timesheet, String> {

    Optional<Timesheet> findByEmployeeInfo_EmployeeIdAndYearAndMonth(String employeeId, int year, int month);

    List<Timesheet> findByEmployeeInfo_EmployeeIdOrderByYearDescMonthDesc(String employeeId);

    List<Timesheet> findByYearAndMonth(int year, int month);

    void deleteByYearAndMonth(int year, int month);
}
