package org.dummy.facez.domain.leave.repository;

import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.domain.leave.model.LeaveRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, String> {

    Page<LeaveRequest> findByEmployeeInfo_EmployeeId(String employeeId, Pageable pageable);

    Page<LeaveRequest> findByStatus(RequestStatus status, Pageable pageable);

    List<LeaveRequest> findByEmployeeInfo_EmployeeIdAndStatus(String employeeId, RequestStatus status);

    /**
     * Counts the employee's other leave requests (in the given statuses) whose time range
     * overlaps [start, end). Half-open overlap rule: l.start < end AND l.end > start.
     */
    @Query("""
        SELECT COUNT(l) FROM LeaveRequest l
        WHERE l.employeeInfo.employeeId = :employeeId
          AND l.leaveRequestId <> :excludeId
          AND l.status IN :statuses
          AND l.startTime < :end
          AND l.endTime   > :start
    """)
    long countOverlapping(@Param("employeeId") String employeeId,
                          @Param("excludeId") String excludeId,
                          @Param("statuses") Collection<RequestStatus> statuses,
                          @Param("start") LocalDateTime start,
                          @Param("end") LocalDateTime end);
}
