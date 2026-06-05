package org.dummy.facez.domain.leave.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class LeaveResponse {
    private String leaveRequestId;
    private String employeeId;
    private String employeeName;
    private String leaveType;
    private String reason;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private BigDecimal durationHours;
    private boolean balanceDeducted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
