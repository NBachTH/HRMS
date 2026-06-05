package org.dummy.facez.domain.notification.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class PayrollApprovedEvent extends ApplicationEvent {
    private final String employeeId;
    private final int payrollYear;
    private final int payrollMonth;

    public PayrollApprovedEvent(Object source, String employeeId, int payrollYear, int payrollMonth) {
        super(source);
        this.employeeId   = employeeId;
        this.payrollYear  = payrollYear;
        this.payrollMonth = payrollMonth;
    }
}
