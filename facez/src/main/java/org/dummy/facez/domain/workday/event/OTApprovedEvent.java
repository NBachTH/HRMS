package org.dummy.facez.domain.workday.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.LocalDateTime;

/** Published when an OT request is approved (auto-approved on logging). */
@Getter
public class OTApprovedEvent extends ApplicationEvent {
    private final String otRequestId;
    private final String employeeId;
    private final LocalDateTime startTime;
    private final LocalDateTime endTime;

    public OTApprovedEvent(Object source, String otRequestId, String employeeId,
                           LocalDateTime startTime, LocalDateTime endTime) {
        super(source);
        this.otRequestId = otRequestId;
        this.employeeId = employeeId;
        this.startTime = startTime;
        this.endTime = endTime;
    }
}
