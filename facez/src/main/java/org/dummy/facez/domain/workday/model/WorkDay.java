package org.dummy.facez.domain.workday.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.enums.LeaveType;
import org.dummy.facez.common.enums.WorkDaySource;
import org.dummy.facez.common.enums.WorkDayType;
import org.dummy.facez.common.model.AuditableEntity;
import org.dummy.facez.domain.employee.model.EmployeeInfo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Single source of truth for an employee's status on one calendar day, aggregated
 * from attendance, approved leave, public holidays and OT. One row per (employee, date).
 */
@Entity
@Table(name = "work_day",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_workday_employee_date", columnNames = {"employee_id", "work_date"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkDay extends AuditableEntity {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeInfo employeeInfo;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WorkDayType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WorkDaySource source;

    /** Leave type when type = LEAVE (drives the timesheet breakdown). */
    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private LeaveType leaveType;

    private LocalDateTime checkIn;
    private LocalDateTime checkOut;

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal lateHour = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal workingHour = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private int otMinutes = 0;

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal paidDay = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal workingDay = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private boolean violation = false;

    /** True after HR closes the period; immutable thereafter. */
    @Column(nullable = false)
    @Builder.Default
    private boolean locked = false;

    @Column(length = 64)
    private String attendanceId;

    @Column(length = 64)
    private String leaveRequestId;
}
