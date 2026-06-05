package org.dummy.facez.domain.payroll.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDate;

@Data
public class SystemConfigRequest {

    @NotBlank
    @Pattern(regexp = "SALARY_GRADE|ALLOWANCE|PIT|INSURANCE",
             message = "configType must be one of: SALARY_GRADE, ALLOWANCE, PIT, INSURANCE")
    private String configType;

    @NotBlank
    private String version;

    private LocalDate effectiveDate;

    private String legalBasis;

    @NotNull
    private JsonNode configData;
}
