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

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    private RequestStatus status;

    private boolean deleteFlag = false;

    private LocalDateTime deletedAt;
}
