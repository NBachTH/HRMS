package org.dummy.facez.domain.workday.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class WorkDayResponse {
    private String id;
    private String employeeId;
    private String employeeName;
    private LocalDate workDate;
    private String type;
    private String source;
    private String leaveType;
    private LocalDateTime checkIn;
    private LocalDateTime checkOut;
    private BigDecimal lateHour;
    private BigDecimal workingHour;
    private int otMinutes;
    private BigDecimal paidDay;
    private BigDecimal workingDay;
    private boolean violation;
    private boolean locked;
}
