package org.dummy.facez.domain.notification.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private String notificationId;
    private String title;
    private String message;
    private String type;
    private boolean read;
    private LocalDateTime createdAt;
}
