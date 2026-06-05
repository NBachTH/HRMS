// Leave Service — matches backend /api/leaves/*
import { apiClient } from '../commons/utils/ApiCallUtil';
import type { LeaveRequest, LeaveCreateRequest, LeaveBalance, PageResponse } from '../commons/types';

export async function getLeaves(page = 0, size = 20) {
    return apiClient<PageResponse<LeaveRequest>>(`/api/leaves/my?page=${page}&size=${size}`);
}

export async function getAllLeaves(status: string | null, page = 0, size = 20) {
    const q = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) q.set('status', status);
    return apiClient<PageResponse<LeaveRequest>>(`/api/leaves?${q}`);
}

export async function getLeaveById(id: string) {
    return apiClient<LeaveRequest>(`/api/leaves/${id}`);
}

export async function createLeave(data: LeaveCreateRequest) {
    return apiClient<LeaveRequest>('/api/leaves', { method: 'POST', body: JSON.stringify(data) });
}

export async function approveLeave(id: string) {
    return apiClient<LeaveRequest>(`/api/leaves/${id}/approve`, { method: 'PUT' });
}

export async function rejectLeave(id: string) {
    return apiClient<LeaveRequest>(`/api/leaves/${id}/reject`, { method: 'PUT' });
}

export async function deleteLeave(id: string) {
    return apiClient<void>(`/api/leaves/${id}`, { method: 'DELETE' });
}

export async function getMyBalances() {
    return apiClient<LeaveBalance[]>('/api/leaves/balances/my');
}

export async function getBalancesByEmployee(employeeId: string) {
    return apiClient<LeaveBalance[]>(`/api/leaves/balances/${employeeId}`);
}
