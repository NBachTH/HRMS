package org.dummy.facez.domain.otrequest.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Data
@Builder
public class OTPlanResponse {
    private String id;
    private LocalDate otDate;
    private LocalTime plannedStartTime;
    private LocalTime plannedEndTime;
    private String departmentId;
    private String reason;
    private String status;
    private String rejectionReason;
    private List<PlanEmployee> employees;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    public static class PlanEmployee {
        private String employeeId;
        private String employeeName;
    }
}
