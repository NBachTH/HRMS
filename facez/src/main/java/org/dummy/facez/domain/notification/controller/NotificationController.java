package org.dummy.facez.domain.notification.controller;

import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.notification.dto.NotificationResponse;
import org.dummy.facez.domain.notification.service.NotificationService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PageResponse<NotificationResponse>>> getMyNotifications(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        return ResponseEntity.ok(ApiResponse.ok(notificationService.getMyNotifications(username, pageable)));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(Authentication authentication) {
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        long count = notificationService.countUnread(username);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("unreadCount", count)));
    }

    @PatchMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<NotificationResponse>> markRead(
            @PathVariable String id,
            Authentication authentication) {
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        return ResponseEntity.ok(ApiResponse.ok(notificationService.markRead(id, username), "Notification marked as read"));
    }

    @PatchMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> markAllRead(Authentication authentication) {
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        notificationService.markAllRead(username);
        return ResponseEntity.ok(ApiResponse.ok(null, "All notifications marked as read"));
    }
}
