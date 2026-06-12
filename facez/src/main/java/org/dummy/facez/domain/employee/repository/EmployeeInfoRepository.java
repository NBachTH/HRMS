package org.dummy.facez.domain.employee.repository;

import org.dummy.facez.common.enums.EmployeeStatus;
import org.dummy.facez.common.enums.Role;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EmployeeInfoRepository extends JpaRepository<EmployeeInfo, String> {

    /** Returns all non-deleted employees with the given status (used by batch payroll). */
    List<EmployeeInfo> findByStatusAndDeleteFlagFalse(EmployeeStatus status);

    /** Real employees only — excludes the special admin account (used by payroll, workday, timesheet, period-close). */
    List<EmployeeInfo> findByStatusAndDeleteFlagFalseAndRoleNot(EmployeeStatus status, Role role);

    /** [employeeId, departmentId] pairs for active non-admin employees (avoids lazy loading in batch). */
    @Query("select e.employeeId, e.department.departmentId from EmployeeInfo e " +
           "where e.status = :status and e.deleteFlag = false and e.role <> :excludeRole")
    List<Object[]> findEmployeeDepartmentPairs(@Param("status") EmployeeStatus status,
                                               @Param("excludeRole") Role excludeRole);
}
