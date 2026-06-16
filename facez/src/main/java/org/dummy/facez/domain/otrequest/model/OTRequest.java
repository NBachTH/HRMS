package org.dummy.facez.domain.otrequest.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.common.model.AuditableEntity;
import org.dummy.facez.domain.employee.model.EmployeeInfo;

import java.time.LocalDateTime;

@Entity
@Table(name = "ot_request")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OTRequest extends AuditableEntity {

    @Id
    private String otRequestId;

    @ManyToOne
    @JoinColumn(name = "employee_id")
    private EmployeeInfo employeeInfo;

    /** The approved OT plan this session was logged against. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ot_plan_id")
    private OTPlan otPlan;

    /** Actual worked start time (validated against attendance). */
    private LocalDateTime startTime;

    /** Actual worked end time (validated against attendance). */
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    private RequestStatus status;

    /** Pay multiplier for this OT session: weekday 1.5, weekend 2.0, public holiday 3.0. */
    private double coefficient;

    private boolean deleteFlag = false;

    private LocalDateTime deletedAt;
}
