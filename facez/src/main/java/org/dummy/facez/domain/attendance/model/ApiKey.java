package org.dummy.facez.domain.attendance.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "api_key")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiKey {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "key_hash", nullable = false, length = 100)
    private String keyHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(nullable = false)
    private boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime lastUsedAt;
}
