package org.dummy.facez.domain.notification.service;

import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.dummy.facez.domain.employee.service.EmployeeService;
import org.dummy.facez.domain.notification.dto.NotificationResponse;
import org.dummy.facez.domain.notification.model.Notification;
import org.dummy.facez.domain.notification.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmployeeInfoRepository employeeInfoRepository;
    private final EmployeeService employeeService;

    public NotificationService(NotificationRepository notificationRepository,
                                EmployeeInfoRepository employeeInfoRepository,
                                EmployeeService employeeService) {
        this.notificationRepository = notificationRepository;
        this.employeeInfoRepository = employeeInfoRepository;
        this.employeeService        = employeeService;
    }

    public void send(String employeeId, String title, String message, String type) {
        EmployeeInfo emp = employeeInfoRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeInfo", "id", employeeId));
        Notification n = Notification.builder()
                .notificationId(UUID.randomUUID().toString())
                .recipient(emp)
                .title(title)
                .message(message)
                .type(type)
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(n);
    }

    public PageResponse<NotificationResponse> getMyNotifications(String username, Pageable pageable) {
        String employeeId = employeeService.getEmployeeIdByUsername(username);
        Page<Notification> page = notificationRepository
                .findByRecipient_EmployeeIdOrderByCreatedAtDesc(employeeId, pageable);
        return PageResponse.from(page.map(this::toResponse));
    }

    public long countUnread(String username) {
        String employeeId = employeeService.getEmployeeIdByUsername(username);
        return notificationRepository.countByRecipient_EmployeeIdAndReadFalse(employeeId);
    }

    @Transactional
    public void markAllRead(String username) {
        String employeeId = employeeService.getEmployeeIdByUsername(username);
        notificationRepository.markAllReadByEmployee(employeeId);
    }

    @Transactional
    public NotificationResponse markRead(String notificationId, String username) {
        String employeeId = employeeService.getEmployeeIdByUsername(username);
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));
        if (!n.getRecipient().getEmployeeId().equals(employeeId)) {
            throw new org.dummy.facez.common.exception.BadRequestException("Notification does not belong to this user");
        }
        n.setRead(true);
        notificationRepository.save(n);
        return toResponse(n);
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .notificationId(n.getNotificationId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
