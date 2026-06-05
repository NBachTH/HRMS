package org.dummy.facez.domain.payroll.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PayrollRejectRequest {
    @NotBlank(message = "Rejection reason is required")
    private String reason;
}
