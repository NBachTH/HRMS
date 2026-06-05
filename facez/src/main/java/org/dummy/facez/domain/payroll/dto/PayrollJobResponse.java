package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;
import org.dummy.facez.domain.payroll.service.PayrollJobRecord;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Snapshot of a batch payroll job's state, returned by GET /api/payrolls/jobs/{jobId}.
 * Built from {@link PayrollJobRecord} at the moment of the request.
 */
@Data
@Builder
public class PayrollJobResponse {

    private String        jobId;
    private String        state;            // PENDING | RUNNING | COMPLETED | FAILED
    private int           year;
    private int           month;
    private int           standardWorkingDays;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private int           total;            // total active employees found
    private int           succeeded;        // successfully calculated
    private int           skipped;          // already had a payroll record for the period
    private int           failed;           // calculation errors (per-employee)
    private List<String>  errors;           // "<employeeId>: <reason>" per failed employee
    private String        failureReason;    // set only when state = FAILED (fatal error)

    public static PayrollJobResponse from(PayrollJobRecord record) {
        return PayrollJobResponse.builder()
                .jobId(record.getJobId())
                .state(record.getState().name())
                .year(record.getYear())
                .month(record.getMonth())
                .standardWorkingDays(record.getStandardWorkingDays())
                .startedAt(record.getStartedAt())
                .completedAt(record.getCompletedAt())
                .total(record.getTotal().get())
                .succeeded(record.getSucceeded().get())
                .skipped(record.getSkipped().get())
                .failed(record.getFailedCount().get())
                .errors(List.copyOf(record.getErrors()))
                .failureReason(record.getFailureReason())
                .build();
    }
}
