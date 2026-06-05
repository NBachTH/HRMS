// Employee Service — matches backend /api/employees/* endpoints
import { apiClient, getAccessToken } from '../commons/utils/ApiCallUtil';
import type {
    Employee,
    EmployeeCreateRequest,
    EmployeeUpdateRequest,
    PageResponse,
} from '../commons/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

export async function getEmployees(page = 0, size = 20, departmentId?: string) {
    const q = new URLSearchParams({ page: String(page), size: String(size) });
    if (departmentId) q.set('departmentId', departmentId);
    return apiClient<PageResponse<Employee>>(`/api/employees?${q}`);
}

export async function getEmployeeById(id: string) {
    return apiClient<Employee>(`/api/employees/${id}`);
}

export async function getMyProfile() {
    return apiClient<Employee>('/api/employees/me');
}

export async function createEmployee(data: EmployeeCreateRequest) {
    return apiClient<Employee>('/api/employees', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateEmployee(id: string, data: EmployeeUpdateRequest) {
    return apiClient<Employee>(`/api/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteEmployee(id: string) {
    return apiClient<void>(`/api/employees/${id}`, { method: 'DELETE' });
}

export async function uploadProfilePicture(id: string, file: File) {
    const token = getAccessToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/employees/${id}/profile-picture`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: 'include',
    });
    const body = await res.json().catch(() => ({ success: false, message: 'Upload failed', data: null }));
    if (!res.ok) throw { status: res.status, body };
    return body;
}
