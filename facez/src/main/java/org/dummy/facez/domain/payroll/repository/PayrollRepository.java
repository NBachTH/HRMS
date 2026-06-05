package org.dummy.facez.domain.payroll.repository;

import org.dummy.facez.common.enums.PayrollStatus;
import org.dummy.facez.domain.payroll.model.Payroll;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface PayrollRepository extends JpaRepository<Payroll, String> {

    Page<Payroll> findByEmployeeInfo_EmployeeId(String employeeId, Pageable pageable);

    Page<Payroll> findByPayrollYearAndPayrollMonth(int year, int month, Pageable pageable);

    Page<Payroll> findByStatus(PayrollStatus status, Pageable pageable);

    Optional<Payroll> findByEmployeeInfo_EmployeeIdAndPayrollYearAndPayrollMonth(
            String employeeId, int year, int month);

    /** Phase 7.6: Find payslip by employee, period, and status (APPROVED or PAID) */
    Optional<Payroll> findByEmployeeInfo_EmployeeIdAndPayrollYearAndPayrollMonthAndStatusIn(
            String employeeId, int year, int month, List<PayrollStatus> statuses);

    /** Phase 7.2: All payrolls for a period with department filter */
    @Query("SELECT p FROM Payroll p JOIN FETCH p.employeeInfo e " +
           "WHERE p.payrollYear = :year AND p.payrollMonth = :month " +
           "AND (:deptId IS NULL OR e.department.departmentId = :deptId)")
    List<Payroll> findByPeriodAndDepartment(@Param("year") int year,
                                            @Param("month") int month,
                                            @Param("deptId") String deptId);

    @Query("SELECT p.employeeInfo.employeeId FROM Payroll p " +
           "WHERE p.payrollYear = :year AND p.payrollMonth = :month " +
           "AND p.employeeInfo.employeeId IN :employeeIds")
    Set<String> findEmployeeIdsWithPayrollForPeriod(
            @Param("year") int year,
            @Param("month") int month,
            @Param("employeeIds") List<String> employeeIds);
}
