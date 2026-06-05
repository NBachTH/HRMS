package org.dummy.facez.domain.notification.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.LocalDate;

@Getter
public class ContractExpiringEvent extends ApplicationEvent {
    private final String employeeId;
    private final String employeeName;
    private final LocalDate contractEndDate;

    public ContractExpiringEvent(Object source, String employeeId, String employeeName, LocalDate contractEndDate) {
        super(source);
        this.employeeId      = employeeId;
        this.employeeName    = employeeName;
        this.contractEndDate = contractEndDate;
    }
}
