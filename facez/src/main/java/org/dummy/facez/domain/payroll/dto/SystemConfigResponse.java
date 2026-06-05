package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
public class SystemConfigResponse {

    private String id;
    private String configType;
    private String version;
    private LocalDate effectiveDate;
    private String legalBasis;
    private Map<String, Object> configData;
    private boolean active;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
