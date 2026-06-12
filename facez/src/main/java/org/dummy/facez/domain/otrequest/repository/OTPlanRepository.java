package org.dummy.facez.domain.otrequest.repository;

import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.domain.otrequest.model.OTPlan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OTPlanRepository extends JpaRepository<OTPlan, String> {

    Page<OTPlan> findByDeleteFlagFalse(Pageable pageable);

    Page<OTPlan> findByStatusAndDeleteFlagFalse(RequestStatus status, Pageable pageable);

    /** Approved plans the given employee is assigned to (for the OT-request picker). */
    @Query("""
        SELECT DISTINCT p FROM OTPlan p JOIN p.employees e
        WHERE e.employee.employeeId = :employeeId
          AND p.status = org.dummy.facez.common.enums.RequestStatus.APPROVED
          AND p.deleteFlag = false
        ORDER BY p.otDate DESC
    """)
    List<OTPlan> findApprovedPlansForEmployee(@Param("employeeId") String employeeId);
}
