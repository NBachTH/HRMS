package org.dummy.facez.domain.employee.repository;

import org.dummy.facez.common.enums.EmployeeStatus;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeInfoRepository extends JpaRepository<EmployeeInfo, String> {

    /** Returns all non-deleted employees with the given status (used by batch payroll). */
    List<EmployeeInfo> findByStatusAndDeleteFlagFalse(EmployeeStatus status);
}
