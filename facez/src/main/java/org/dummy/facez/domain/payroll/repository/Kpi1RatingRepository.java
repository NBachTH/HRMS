package org.dummy.facez.domain.payroll.repository;

import org.dummy.facez.domain.payroll.model.Kpi1Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface Kpi1RatingRepository extends JpaRepository<Kpi1Rating, String> {

    Optional<Kpi1Rating> findByEmployeeInfo_EmployeeIdAndYearAndMonth(String employeeId, int year, int month);

    List<Kpi1Rating> findByYearAndMonth(int year, int month);

    /** Employee ids that already have a KPI1 rating for the period (for completeness checks). */
    @Query("select k.employeeInfo.employeeId from Kpi1Rating k where k.year = :year and k.month = :month")
    List<String> findRatedEmployeeIds(@Param("year") int year, @Param("month") int month);
}
