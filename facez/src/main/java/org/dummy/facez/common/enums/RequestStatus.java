package org.dummy.facez.common.enums;

public enum RequestStatus {
    /** Created but not yet submitted for approval */
    DRAFT,
    /** Submitted — awaiting Level-1 approval (LEADER/PM) */
    TO_APPROVE,
    /** Level-1 approved by LEADER — awaiting Level-2 (MANAGER) */
    LEADER_APPROVED,
    /** Level-2 approved by MANAGER — awaiting final HR_ADMIN confirmation */
    MANAGER_APPROVED,
    /** Final approval confirmed by HR_ADMIN */
    APPROVED,
    /** Rejected at any level */
    REJECTED
}
