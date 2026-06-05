package org.dummy.facez.domain.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnexplainedAbsenceDto {
    private String employeeId;
    private String employeeName;
    private List<LocalDate> missingDates;
}
