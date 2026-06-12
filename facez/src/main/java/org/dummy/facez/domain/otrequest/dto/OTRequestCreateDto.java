package org.dummy.facez.domain.otrequest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * An employee logs an actual OT session against an approved OT plan.
 * The times are the real worked window and are validated against attendance.
 */
@Data
public class OTRequestCreateDto {

    /** Set server-side from the JWT principal — not required from the client. */
    private String employeeId;

    @NotBlank(message = "OT plan ID is required")
    private String otPlanId;

    @NotNull(message = "Actual start time is required")
    private LocalDateTime actualStartTime;

    @NotNull(message = "Actual end time is required")
    private LocalDateTime actualEndTime;
}
