package org.dummy.facez.domain.leave.repository;

import org.dummy.facez.common.enums.LeaveType;
import org.dummy.facez.domain.leave.model.LeaveBalance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, String> {
    Optional<LeaveBalance> findByEmployeeInfo_EmployeeIdAndLeaveYearAndLeaveType(
            String employeeId, int leaveYear, LeaveType leaveType);
    List<LeaveBalance> findByEmployeeInfo_EmployeeIdAndLeaveYear(String employeeId, int leaveYear);
}
