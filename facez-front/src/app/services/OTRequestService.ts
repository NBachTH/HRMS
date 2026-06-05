// OT Request Service — matches backend /api/ot-requests/*
import { apiClient } from '../commons/utils/ApiCallUtil';
import type { OTRequest, OTRequestCreate, PageResponse } from '../commons/types';

// Employee self-service (scoped to current user)
export async function getOTRequests(page = 0, size = 20) {
    return apiClient<PageResponse<OTRequest>>(`/api/ot-requests/my?page=${page}&size=${size}`);
}

// Manager / HR scoped — all employees, optional status filter
export async function getAllOTRequests(status: string | null, page = 0, size = 20) {
    const q = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) q.set('status', status);
    return apiClient<PageResponse<OTRequest>>(`/api/ot-requests?${q}`);
}

export async function getOTRequestById(id: string) {
    return apiClient<OTRequest>(`/api/ot-requests/${id}`);
}

export async function createOTRequest(data: OTRequestCreate) {
    return apiClient<OTRequest>('/api/ot-requests', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function approveOTRequest(id: string) {
    return apiClient<OTRequest>(`/api/ot-requests/${id}/approve`, { method: 'PUT' });
}

export async function rejectOTRequest(id: string) {
    return apiClient<OTRequest>(`/api/ot-requests/${id}/reject`, { method: 'PUT' });
}

export async function deleteOTRequest(id: string) {
    return apiClient<void>(`/api/ot-requests/${id}`, { method: 'DELETE' });
}
