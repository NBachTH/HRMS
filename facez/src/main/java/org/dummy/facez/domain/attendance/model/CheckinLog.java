package org.dummy.facez.domain.attendance.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.dummy.facez.common.enums.LogTypes;
import org.dummy.facez.domain.employee.model.EmployeeInfo;

import java.time.LocalDateTime;

@Entity
@Table(name = "check_in_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckinLog {
    @Id
    private String logId;

    @ManyToOne
    @JoinColumn(name = "device_id")
    private Device device;

    @ManyToOne
    @JoinColumn(name = "employee_id")
    private EmployeeInfo employeeInfo;

    private LocalDateTime logTime;

    @Enumerated(EnumType.STRING)
    private LogTypes logType;

    private boolean deleteFlag;

    private LocalDateTime deletedAt;

}
