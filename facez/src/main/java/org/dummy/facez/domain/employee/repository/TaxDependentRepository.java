package org.dummy.facez.domain.employee.repository;

import org.dummy.facez.domain.employee.model.TaxDependent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaxDependentRepository extends JpaRepository<TaxDependent, String> {
    List<TaxDependent> findByEmployeeInfo_EmployeeId(String employeeId);
    List<TaxDependent> findByEmployeeInfo_EmployeeIdAndActiveTrue(String employeeId);
    long countByEmployeeInfo_EmployeeIdAndActiveTrue(String employeeId);
}
