package org.dummy.facez.domain.attendance.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class AttendanceResponse {
    private String attendanceId;
    private String employeeId;
    private String employeeName;
    private LocalDate date;
    private LocalDateTime checkIn;
    private LocalDateTime checkOut;
    private BigDecimal lateHour;
    private BigDecimal workingHour;
    private BigDecimal paidHour;
    private BigDecimal workingDay;
    private BigDecimal paidDay;
    private boolean violate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
