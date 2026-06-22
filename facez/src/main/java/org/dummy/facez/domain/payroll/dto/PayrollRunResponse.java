package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PayrollRunResponse {
    private String id;
    private int year;
    private int month;
    private String status;
    private int employeeCount;
    private long totalGross;
    private long totalNet;
    private String submittedBy;
    private String approvedBy;
    private String rejectionReason;
}
