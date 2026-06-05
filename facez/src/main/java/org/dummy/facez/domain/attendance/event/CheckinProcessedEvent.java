package org.dummy.facez.domain.attendance.event;

import lombok.Getter;
import org.dummy.facez.common.enums.LogTypes;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.springframework.context.ApplicationEvent;

import java.time.LocalDateTime;

@Getter
public class CheckinProcessedEvent extends ApplicationEvent {

    private final EmployeeInfo employee;
    private final LocalDateTime logTime;
    private final LogTypes logType;

    public CheckinProcessedEvent(Object source, EmployeeInfo employee,
                                  LocalDateTime logTime, LogTypes logType) {
        super(source);
        this.employee = employee;
        this.logTime  = logTime;
        this.logType  = logType;
    }
}
