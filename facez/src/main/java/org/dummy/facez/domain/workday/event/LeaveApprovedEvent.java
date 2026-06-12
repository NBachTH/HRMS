package org.dummy.facez.domain.workday.event;

import lombok.Getter;
import org.dummy.facez.common.enums.LeaveType;
import org.springframework.context.ApplicationEvent;

import java.time.LocalDateTime;

/** Published when a leave request reaches final (HR) approval. */
@Getter
public class LeaveApprovedEvent extends ApplicationEvent {
    private final String leaveRequestId;
    private final String employeeId;
    private final LeaveType leaveType;
    private final LocalDateTime startTime;
    private final LocalDateTime endTime;

    public LeaveApprovedEvent(Object source, String leaveRequestId, String employeeId,
                              LeaveType leaveType, LocalDateTime startTime, LocalDateTime endTime) {
        super(source);
        this.leaveRequestId = leaveRequestId;
        this.employeeId = employeeId;
        this.leaveType = leaveType;
        this.startTime = startTime;
        this.endTime = endTime;
    }
}
