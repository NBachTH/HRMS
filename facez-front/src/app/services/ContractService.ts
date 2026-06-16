// Contract Service — matches backend /api/contracts/* endpoints
import { apiClient, getAccessToken } from '../commons/utils/ApiCallUtil';
import type { Contract, ContractRequest } from '../commons/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

export async function getContracts(page = 0, size = 20) {
    return apiClient<Contract[] | { content: Contract[]; totalPages: number }>(
        `/api/contracts?page=${page}&size=${size}`);
}

/** Upload (or replace) the contract document PDF (stored in MinIO). */
export async function uploadContractDocument(id: string, file: File) {
    const token = getAccessToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/contracts/${id}/document`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: 'include',
    });
    const body = await res.json().catch(() => ({ success: false, message: 'Upload failed', data: null }));
    if (!res.ok) throw { status: res.status, body };
    return body;
}

/** Get a short-lived presigned URL to view the contract document. */
export async function getContractDocumentUrl(id: string) {
    return apiClient<{ url: string }>(`/api/contracts/${id}/document-url`);
}

export async function getMyContract() {
    return apiClient<Contract>('/api/contracts/my');
}

export async function getContractById(id: string) {
    return apiClient<Contract>(`/api/contracts/${id}`);
}

export async function getHistoryByEmployee(employeeId: string) {
    return apiClient<Contract[]>(`/api/contracts/employee/${employeeId}/history`);
}

export async function getExpiringSoon(withinDays = 30) {
    return apiClient<Contract[]>(`/api/contracts/expiring-soon?withinDays=${withinDays}`);
}

export async function createContract(data: ContractRequest) {
    return apiClient<Contract>('/api/contracts', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateContract(id: string, data: Partial<ContractRequest>) {
    return apiClient<Contract>(`/api/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteContract(id: string) {
    return apiClient<void>(`/api/contracts/${id}`, { method: 'DELETE' });
}
