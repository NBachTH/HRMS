package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class SalaryGradeConfigResponse {

    private String id;
    private LocalDate effectiveFrom;
    private String status;
    private String legalBasis;
    private String unit;
    private Integer minimumWageRegionI;
    private List<GradeItem> grades;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    public static class GradeItem {
        private String gradeCode;
        private String title;
        private String track;
        private List<Long> steps;
    }
}
