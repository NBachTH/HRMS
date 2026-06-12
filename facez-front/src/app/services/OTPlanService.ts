// OT Plan Service — matches backend /api/ot-plans/*
import { apiClient } from '../commons/utils/ApiCallUtil';
import type { OTPlan, OTPlanCreateRequest, PageResponse } from '../commons/types';

/** LEADER creates an OT plan (employees + planned window). */
export async function createOTPlan(data: OTPlanCreateRequest) {
    return apiClient<OTPlan>('/api/ot-plans', { method: 'POST', body: JSON.stringify(data) });
}

/** LEADER/MANAGER/HR list plans, optional status filter. */
export async function getOTPlans(status: string | null, page = 0, size = 20) {
    const q = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) q.set('status', status);
    return apiClient<PageResponse<OTPlan>>(`/api/ot-plans?${q}`);
}

/** Employee self-service: approved plans the caller is assigned to (OT-request picker). */
export async function getMyApprovedOTPlans() {
    return apiClient<OTPlan[]>('/api/ot-plans/my-approved');
}

export async function getOTPlanById(id: string) {
    return apiClient<OTPlan>(`/api/ot-plans/${id}`);
}

export async function approveOTPlan(id: string) {
    return apiClient<OTPlan>(`/api/ot-plans/${id}/approve`, { method: 'PUT' });
}

export async function rejectOTPlan(id: string, reason: string) {
    return apiClient<OTPlan>(`/api/ot-plans/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
    });
}
