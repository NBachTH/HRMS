package org.dummy.facez.domain.leave.repository;

import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.domain.leave.model.LeaveRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, String> {

    Page<LeaveRequest> findByEmployeeInfo_EmployeeId(String employeeId, Pageable pageable);

    Page<LeaveRequest> findByStatus(RequestStatus status, Pageable pageable);

    List<LeaveRequest> findByEmployeeInfo_EmployeeIdAndStatus(String employeeId, RequestStatus status);
}
