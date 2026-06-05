package org.dummy.facez.domain.leave.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class LeaveBalanceResponse {
    private String id;
    private String employeeId;
    private int leaveYear;
    private String leaveType;
    private BigDecimal entitlementDays;
    private BigDecimal carriedOverDays;
    private BigDecimal pendingDays;
    private BigDecimal usedDays;
    private BigDecimal remainingDays;
    private BigDecimal carryOverCap;
}
