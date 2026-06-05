package org.dummy.facez.domain.attendance.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class PublicHolidayResponse {
    private String id;
    private int holidayYear;
    private LocalDate holidayDate;
    private String name;
    private boolean compensatoryDay;
}
