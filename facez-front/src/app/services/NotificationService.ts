import { apiClient } from '../commons/utils/ApiCallUtil';
import type { ApiResponse, PageResponse, Notification } from '../commons/types';

export async function getNotifications(page = 0, size = 20) {
    return apiClient<PageResponse<Notification>>(`/api/notifications?page=${page}&size=${size}`);
}

export async function getUnreadCount() {
    return apiClient<{ unreadCount: number }>('/api/notifications/unread-count');
}

export async function markRead(id: string) {
    return apiClient<Notification>(`/api/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllRead() {
    return apiClient<null>('/api/notifications/read-all', { method: 'PATCH' });
}
