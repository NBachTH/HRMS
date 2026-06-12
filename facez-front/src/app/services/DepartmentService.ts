// Department Service — matches backend /api/departments/*
import { apiClient } from '../commons/utils/ApiCallUtil';
import type { Department, DepartmentRequest } from '../commons/types';

export async function getDepartments() {
    return apiClient<Department[]>('/api/departments');
}

/** Leader/Manager: only the department(s) they manage (or their own). */
export async function getMyDepartments() {
    return apiClient<Department[]>('/api/departments/my');
}

export async function getDepartmentById(id: string) {
    return apiClient<Department>(`/api/departments/${id}`);
}

export async function createDepartment(data: DepartmentRequest) {
    return apiClient<Department>('/api/departments', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateDepartment(id: string, data: Partial<DepartmentRequest>) {
    return apiClient<Department>(`/api/departments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteDepartment(id: string) {
    return apiClient<void>(`/api/departments/${id}`, { method: 'DELETE' });
}
