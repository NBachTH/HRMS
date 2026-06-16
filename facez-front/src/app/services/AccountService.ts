// Account Service — SYSTEM_ADMIN account management (/api/accounts/*)
import { apiClient } from '../commons/utils/ApiCallUtil';
import type { PageResponse } from '../commons/types';

export interface Account {
    employeeId: string;
    username: string;
    role: string;
    employeeName?: string;
    departmentName?: string;
    enabled: boolean;
}

export async function getAccounts(page = 0, size = 20) {
    return apiClient<PageResponse<Account>>(`/api/accounts?page=${page}&size=${size}`);
}

export async function toggleAccount(employeeId: string) {
    return apiClient<Account>(`/api/accounts/${employeeId}/toggle`, { method: 'PATCH' });
}

export async function resetAccountPassword(employeeId: string) {
    return apiClient<null>(`/api/accounts/${employeeId}/reset-password`, { method: 'PATCH' });
}
