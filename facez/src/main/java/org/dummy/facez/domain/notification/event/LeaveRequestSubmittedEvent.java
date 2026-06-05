package org.dummy.facez.domain.notification.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class LeaveRequestSubmittedEvent extends ApplicationEvent {
    private final String employeeId;
    private final String employeeName;
    private final String leaveRequestId;
    private final String leaveType;

    public LeaveRequestSubmittedEvent(Object source, String employeeId, String employeeName,
                                       String leaveRequestId, String leaveType) {
        super(source);
        this.employeeId     = employeeId;
        this.employeeName   = employeeName;
        this.leaveRequestId = leaveRequestId;
        this.leaveType      = leaveType;
    }
}
