package org.dummy.facez.domain.notification.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.domain.employee.model.EmployeeInfo;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @Column(length = 64)
    private String notificationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeInfo recipient;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false)
    private boolean read;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
