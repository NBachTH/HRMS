package org.dummy.facez.domain.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.common.model.AuditableEntity;
import org.dummy.facez.domain.employee.model.EmployeeInfo;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Employee request to add/correct attendance for a day they forgot to (or could not)
 * check in. On approval the requested times are written into Attendance + WorkDay.
 */
@Entity
@Table(name = "attendance_adjustment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceAdjustment extends AuditableEntity {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeInfo employeeInfo;

    @Column(nullable = false)
    private LocalDate workDate;

    private LocalDateTime requestedCheckIn;
    private LocalDateTime requestedCheckOut;

    @Column(length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RequestStatus status;

    @Column(length = 500)
    private String rejectionReason;

    private boolean deleteFlag;
    private LocalDateTime deletedAt;
}
