package org.dummy.facez.domain.payroll.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Create payload for a salary grade config draft. */
@Data
public class SalaryGradeConfigRequest {

    @NotNull
    private LocalDate effectiveFrom;

    private String legalBasis;
    private String unit;
    private Integer minimumWageRegionI;

    @NotNull
    private List<GradeItem> grades = new ArrayList<>();

    @Data
    public static class GradeItem {
        private String gradeCode;
        private String title;
        private String track;
        /** 1-based, ordered step amounts in thousand VND (up to 10). */
        private List<Long> steps = new ArrayList<>();
    }
}
