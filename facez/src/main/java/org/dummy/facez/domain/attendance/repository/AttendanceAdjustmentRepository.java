package org.dummy.facez.domain.attendance.repository;

import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.domain.attendance.model.AttendanceAdjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;

public interface AttendanceAdjustmentRepository extends JpaRepository<AttendanceAdjustment, String> {

    Page<AttendanceAdjustment> findByEmployeeInfo_EmployeeId(String employeeId, Pageable pageable);

    Page<AttendanceAdjustment> findByStatus(RequestStatus status, Pageable pageable);

    /** Duplicate guard — a pending request already exists for the same employee + day. */
    boolean existsByEmployeeInfo_EmployeeIdAndWorkDateAndStatus(
            String employeeId, LocalDate workDate, RequestStatus status);

    /** Team-scoped listing for a leader/manager (employees in their department). */
    Page<AttendanceAdjustment> findByEmployeeInfo_Department_DepartmentId(
            String departmentId, Pageable pageable);

    Page<AttendanceAdjustment> findByEmployeeInfo_Department_DepartmentIdAndStatus(
            String departmentId, RequestStatus status, Pageable pageable);
}
