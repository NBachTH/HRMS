package org.dummy.facez.domain.notification.event;

import org.dummy.facez.domain.notification.service.NotificationService;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

@Component
public class NotificationEventListener {

    private final NotificationService notificationService;

    public NotificationEventListener(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onLeaveSubmitted(LeaveRequestSubmittedEvent event) {
        notificationService.send(
                event.getEmployeeId(),
                "Leave Request Submitted",
                "Your " + event.getLeaveType() + " leave request has been submitted and is pending approval.",
                "LEAVE_SUBMITTED");
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPayrollApproved(PayrollApprovedEvent event) {
        notificationService.send(
                event.getEmployeeId(),
                "Payroll Approved",
                "Your payroll for " + event.getPayrollYear() + "/" + String.format("%02d", event.getPayrollMonth()) +
                        " has been approved. Your payslip is now available.",
                "PAYROLL_APPROVED");
    }

    @Async
    @EventListener
    public void onContractExpiring(ContractExpiringEvent event) {
        notificationService.send(
                event.getEmployeeId(),
                "Contract Expiring Soon",
                "Your employment contract expires on " + event.getContractEndDate() +
                        ". Please contact HR to discuss renewal.",
                "CONTRACT_EXPIRING");
    }
}
