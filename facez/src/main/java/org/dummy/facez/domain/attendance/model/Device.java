package org.dummy.facez.domain.attendance.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.dummy.facez.common.enums.LogTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "device")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Device {
    @Id
    private String deviceId;

    private String deviceName;

    private String location;

    @Enumerated(EnumType.STRING)
    private LogTypes logType;

    @Builder.Default
    private boolean active = true;

    private LocalDateTime createdAt;

    private boolean deleteFlag;

    private LocalDateTime deletedAt;
}
