package org.dummy.facez.domain.otrequest.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.common.model.AuditableEntity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * An overtime plan created by a LEADER for a single date: a list of employees
 * expected to work overtime plus the planned time window. Must be approved by a
 * MANAGER before any employee can log an OT request against it.
 */
@Entity
@Table(name = "ot_plan")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OTPlan extends AuditableEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false)
    private LocalDate otDate;

    private LocalTime plannedStartTime;

    private LocalTime plannedEndTime;

    @Column(length = 255)
    private String departmentId;

    @Column(length = 500)
    private String reason;

    /** TO_APPROVE (created by leader) → APPROVED / REJECTED (by manager). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RequestStatus status;

    @Column(length = 500)
    private String rejectionReason;

    @OneToMany(mappedBy = "otPlan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<OTPlanEmployee> employees = new ArrayList<>();

    private boolean deleteFlag;

    private LocalDateTime deletedAt;
}
