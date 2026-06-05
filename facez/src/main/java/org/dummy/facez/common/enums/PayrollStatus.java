package org.dummy.facez.common.enums;

public enum PayrollStatus {
    DRAFT,              // Finance has calculated; awaiting Finance review
    PENDING_APPROVAL,   // Finance has submitted to Director for authorisation
    APPROVED,           // Director has authorised; ready for payment
    PAID,               // Payment executed
    REJECTED            // Director rejected; Finance must recalculate
}
