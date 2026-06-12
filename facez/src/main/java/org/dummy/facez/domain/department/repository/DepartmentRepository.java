package org.dummy.facez.domain.department.repository;

import org.dummy.facez.domain.department.model.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface DepartmentRepository extends JpaRepository<Department, String> {

    /** Departments managed by the given employee (Department.manager_id). */
    List<Department> findByEmployeeInfo_EmployeeIdAndDeleteFlagFalse(String managerEmployeeId);

    /** [departmentId, managerEmployeeId] pairs (avoids lazy loading in batch). */
    @Query("select d.departmentId, d.employeeInfo.employeeId from Department d " +
           "where d.deleteFlag = false and d.employeeInfo is not null")
    List<Object[]> findDepartmentManagerPairs();
}
