package org.dummy.facez.domain.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.model.AuditableEntity;
import org.dummy.facez.domain.employee.model.EmployeeInfo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_attendance_employee_date",
                        columnNames = {"employee_id", "attendance_date"}
                )
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attendance extends AuditableEntity {
    @Id
    private String attendanceId;

    @ManyToOne
    @JoinColumn(name = "employee_id", referencedColumnName = "employee_id")
    private EmployeeInfo employeeInfo;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    private LocalDateTime checkIn;

    private LocalDateTime checkOut;

    private BigDecimal lateHour;

    private BigDecimal workingHour;

    private BigDecimal paidHour;

    private BigDecimal workingDay;

    private BigDecimal paidDay;

    private boolean violate;

    private boolean deleteFlag = false;

    private LocalDateTime deletedAt;

}
