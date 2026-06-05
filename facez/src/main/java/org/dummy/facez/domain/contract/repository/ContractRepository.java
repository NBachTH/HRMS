package org.dummy.facez.domain.contract.repository;

import org.dummy.facez.domain.contract.model.Contract;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ContractRepository extends JpaRepository<Contract, String> {

    /** Legacy single-contract lookup — now returns first current contract */
    Optional<Contract> findFirstByEmployeeInfo_EmployeeIdAndCurrentTrue(String employeeId);

    /** Backward-compat method used by PayrollService */
    default Contract findContractByEmployeeInfo_EmployeeId(String employeeId) {
        return findFirstByEmployeeInfo_EmployeeIdAndCurrentTrue(employeeId).orElse(null);
    }

    Page<Contract> findByDeleteFlagFalse(Pageable pageable);

    List<Contract> findByEmployeeInfo_EmployeeIdAndDeleteFlagFalseOrderByEffectiveFromDesc(String employeeId);

    /** Contracts expiring within a given window */
    List<Contract> findByCurrentTrueAndEndDateBetween(LocalDate from, LocalDate to);

    /** Bulk load active contracts for multiple employees (for batch payroll) */
    @Query("SELECT c FROM Contract c JOIN FETCH c.employeeInfo " +
           "WHERE c.employeeInfo.employeeId IN :employeeIds AND c.current = true AND c.deleteFlag = false")
    List<Contract> findActiveByEmployeeIds(@Param("employeeIds") List<String> employeeIds);

    /** Contract effective for a given date (for payroll period matching) */
    Optional<Contract> findFirstByEmployeeInfo_EmployeeIdAndEffectiveFromLessThanEqualAndCurrentTrue(
            String employeeId, LocalDate date);
}
