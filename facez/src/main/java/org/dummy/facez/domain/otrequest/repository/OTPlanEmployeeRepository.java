package org.dummy.facez.domain.otrequest.repository;

import org.dummy.facez.domain.otrequest.model.OTPlanEmployee;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OTPlanEmployeeRepository extends JpaRepository<OTPlanEmployee, String> {

    boolean existsByOtPlan_IdAndEmployee_EmployeeId(String otPlanId, String employeeId);
}
