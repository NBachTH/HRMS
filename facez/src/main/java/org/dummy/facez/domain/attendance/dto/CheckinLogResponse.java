package org.dummy.facez.domain.attendance.dto;

import lombok.Builder;
import lombok.Data;
import org.dummy.facez.common.enums.LogTypes;

import java.time.LocalDateTime;

@Data
@Builder
public class CheckinLogResponse {
    private String logId;
    private String employeeId;
    private String employeeName;
    private String deviceId;
    private String deviceName;
    private LocalDateTime logTime;
    private LogTypes logType;
    private boolean deleteFlag;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
}
