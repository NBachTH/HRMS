// Attendance Adjustment Service — matches backend /api/attendance-adjustments/*
import { apiClient } from '../commons/utils/ApiCallUtil';
import type { AttendanceAdjustment, AttendanceAdjustmentCreate, PageResponse } from '../commons/types';

export async function createAdjustment(data: AttendanceAdjustmentCreate) {
    return apiClient<AttendanceAdjustment>('/api/attendance-adjustments', {
        method: 'POST', body: JSON.stringify(data),
    });
}

export async function getMyAdjustments(page = 0, size = 20) {
    return apiClient<PageResponse<AttendanceAdjustment>>(`/api/attendance-adjustments/my?page=${page}&size=${size}`);
}

export async function getAllAdjustments(status: string | null, page = 0, size = 20) {
    const q = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) q.set('status', status);
    return apiClient<PageResponse<AttendanceAdjustment>>(`/api/attendance-adjustments?${q}`);
}

export async function approveAdjustment(id: string) {
    return apiClient<AttendanceAdjustment>(`/api/attendance-adjustments/${id}/approve`, { method: 'PUT' });
}

export async function rejectAdjustment(id: string, reason: string) {
    return apiClient<AttendanceAdjustment>(`/api/attendance-adjustments/${id}/reject`, {
        method: 'PUT', body: JSON.stringify({ reason }),
    });
}

export async function deleteAdjustment(id: string) {
    return apiClient<void>(`/api/attendance-adjustments/${id}`, { method: 'DELETE' });
}
