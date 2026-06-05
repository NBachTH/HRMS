package org.dummy.facez.domain.leave.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.enums.LeaveType;
import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.common.model.AuditableEntity;
import org.dummy.facez.domain.employee.model.EmployeeInfo;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table( name = "leave_request")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveRequest extends AuditableEntity {

    @Id
    private String leaveRequestId;

    @ManyToOne
    @JoinColumn(name= "employee_id")
    private EmployeeInfo employeeInfo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private LeaveType leaveType;

    private String reason;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    private RequestStatus status;

    private BigDecimal durationHours;

    private boolean balanceDeducted = false;

    private boolean deleteFlag = false;

    private LocalDateTime deletedAt;
}
