package org.dummy.facez.domain.otrequest.repository;

import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.domain.otrequest.model.OTRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface OTRequestRepository extends JpaRepository<OTRequest, String> {

    Page<OTRequest> findByEmployeeInfo_EmployeeId(String employeeId, Pageable pageable);

    Page<OTRequest> findByStatus(RequestStatus status, Pageable pageable);

    List<OTRequest> findByEmployeeInfo_EmployeeIdAndStatusAndStartTimeBetween(
            String employeeId, RequestStatus status, LocalDateTime from, LocalDateTime to);

    /** Phase 6.1: Total approved OT minutes for an employee in a given month */
    @Query(value = """
            SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 60), 0)
            FROM ot_request
            WHERE employee_id = :employeeId
              AND status = 'APPROVED'
              AND delete_flag = false
              AND EXTRACT(YEAR  FROM start_time) = :year
              AND EXTRACT(MONTH FROM start_time) = :month
            """, nativeQuery = true)
    long sumApprovedMinutesForMonth(@Param("employeeId") String employeeId,
                                    @Param("year") int year,
                                    @Param("month") int month);

    /** Phase 6.1: Total approved OT minutes for an employee in a given year */
    @Query(value = """
            SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 60), 0)
            FROM ot_request
            WHERE employee_id = :employeeId
              AND status = 'APPROVED'
              AND delete_flag = false
              AND EXTRACT(YEAR FROM start_time) = :year
            """, nativeQuery = true)
    long sumApprovedMinutesForYear(@Param("employeeId") String employeeId,
                                   @Param("year") int year);

    /** Bulk load approved OT requests for multiple employees within a time range (for batch payroll) */
    @Query("SELECT o FROM OTRequest o WHERE o.employeeInfo.employeeId IN :employeeIds " +
           "AND o.status = :status AND o.startTime BETWEEN :from AND :to")
    List<OTRequest> findByEmployeeIdsAndStatusAndStartTimeBetween(
            @Param("employeeIds") List<String> employeeIds,
            @Param("status") RequestStatus status,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
