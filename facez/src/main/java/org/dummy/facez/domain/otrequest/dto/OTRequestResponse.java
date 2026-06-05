package org.dummy.facez.domain.otrequest.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class OTRequestResponse {
    private String otRequestId;
    private String employeeId;
    private String employeeName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
