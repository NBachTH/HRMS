package org.dummy.facez.common.enums;

/** Where a WorkDay record's information came from. */
public enum WorkDaySource {
    CHECKIN,         // built from device attendance
    LEAVE_REQUEST,   // built from an approved leave
    PUBLIC_HOLIDAY,  // a public holiday
    MANUAL,          // edited by HR (overrides everything)
    SYSTEM,          // generated default (e.g. ABSENT)
    CONFLICT         // multiple sources disagree — needs HR resolution
}
