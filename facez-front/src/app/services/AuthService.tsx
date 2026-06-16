// Auth Service — matches backend /api/auth/* endpoints
import { apiClient, setAccessToken } from '../commons/utils/ApiCallUtil';
import type { LoginRequest, LoginResponse } from '../commons/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export async function signin(credentials: LoginRequest): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include',
    });
    const body = await res.json();
    if (!res.ok) throw { status: res.status, body };

    // backend wraps in ApiResponse<T>, data contains the login payload
    const data = body.data || body;
    setAccessToken(data.accessToken);
    return data;
}

export async function refresh(): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
    });
    const body = await res.json();
    if (!res.ok) throw { status: res.status, body };

    const data = body.data || body;
    setAccessToken(data.accessToken);
    return data;
}

export async function signout(): Promise<void> {
    try {
        await apiClient('/api/auth/logout', { method: 'POST' });
    } catch {
        // ignore — we clear local state anyway
    }
    setAccessToken(null);
}

export async function changePassword(oldPassword: string, newPassword: string) {
    return apiClient('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ oldPassword, newPassword }),
    });
}

export async function getCurrentUser() {
    return apiClient<{ username: string; role: string; employeeId: string }>('/api/auth/me');
}
