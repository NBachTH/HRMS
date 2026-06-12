package org.dummy.facez.common.enums;

/** Classification of a single employee work day. */
public enum WorkDayType {
    PRESENT,        // came to work (has attendance)
    LEAVE,          // covered by an approved leave request
    HOLIDAY,        // public holiday (paid, not worked)
    ABSENT,         // a working day with nothing recorded
    HOLIDAY_WORK    // worked on a weekend / public holiday
}
