import { apiClient } from '../commons/utils/ApiCallUtil';
import type { TaxDependent, TaxDependentRequest } from '../commons/types';

const BASE = '/api/tax-dependents';

export async function getByEmployee(employeeId: string) {
    return apiClient<TaxDependent[]>(`${BASE}?employeeId=${employeeId}`);
}

export async function createDependent(body: TaxDependentRequest) {
    return apiClient<TaxDependent>(BASE, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateDependent(id: string, body: Partial<TaxDependentRequest>) {
    return apiClient<TaxDependent>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteDependent(id: string) {
    return apiClient<null>(`${BASE}/${id}`, { method: 'DELETE' });
}
