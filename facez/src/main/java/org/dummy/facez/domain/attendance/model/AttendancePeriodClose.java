package org.dummy.facez.domain.attendance.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_period_close",
        uniqueConstraints = @UniqueConstraint(columnNames = {"close_year", "close_month"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendancePeriodClose {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false)
    private int closeYear;

    @Column(nullable = false)
    private int closeMonth;

    @Column(length = 100)
    private String closedBy;

    private LocalDateTime closedAt;

    @Column(length = 500)
    private String notes;
}
