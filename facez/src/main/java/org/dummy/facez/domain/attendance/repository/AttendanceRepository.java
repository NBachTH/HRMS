package org.dummy.facez.domain.attendance.repository;

import org.dummy.facez.domain.attendance.model.Attendance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, String> {

    Page<Attendance> findByDeleteFlagFalse(Pageable pageable);

    Page<Attendance> findByEmployeeInfo_EmployeeIdAndDeleteFlagFalse(String employeeId, Pageable pageable);

    Page<Attendance> findByCheckInBetweenAndDeleteFlagFalse(LocalDateTime from, LocalDateTime to, Pageable pageable);

    Page<Attendance> findByEmployeeInfo_EmployeeIdAndCheckInBetweenAndDeleteFlagFalse(
            String employeeId, LocalDateTime from, LocalDateTime to, Pageable pageable);

    /** Find any check-in on a given day (for IN log deduplication) */
    Optional<Attendance> findFirstByEmployeeInfo_EmployeeIdAndCheckInBetweenAndDeleteFlagFalse(
            String employeeId, LocalDateTime from, LocalDateTime to);

    /** Find an open attendance (checked in but not yet checked out) on a given day */
    Optional<Attendance> findFirstByEmployeeInfo_EmployeeIdAndCheckInBetweenAndCheckOutIsNullAndDeleteFlagFalse(
            String employeeId, LocalDateTime from, LocalDateTime to);

    /** All attendance records for an employee within a date range (for payroll NCtt calculation) */
    @Query("SELECT a FROM Attendance a WHERE a.employeeInfo.employeeId = :employeeId " +
           "AND a.attendanceDate >= :from AND a.attendanceDate <= :to AND a.deleteFlag = false")
    List<Attendance> findByEmployeeAndDateRange(
            @Param("employeeId") String employeeId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /** Bulk load attendance for multiple employees within a date range (for batch payroll) */
    @Query("SELECT a FROM Attendance a WHERE a.employeeInfo.employeeId IN :employeeIds " +
           "AND a.attendanceDate >= :from AND a.attendanceDate <= :to AND a.deleteFlag = false")
    List<Attendance> findByEmployeeIdsAndDateRange(
            @Param("employeeIds") List<String> employeeIds,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
