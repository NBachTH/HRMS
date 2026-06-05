// Contract Service — matches backend /api/contracts/* endpoints
import { apiClient } from '../commons/utils/ApiCallUtil';
import type { Contract, ContractRequest } from '../commons/types';

export async function getContracts() {
    return apiClient<Contract[]>('/api/contracts');
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
