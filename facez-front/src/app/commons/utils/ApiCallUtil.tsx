// Centralized API client with token refresh support
import type { ApiResponse } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

let accessToken: string | null = null;
let onTokenRefreshed: ((token: string) => void) | null = null;

export function setAccessToken(token: string | null) {
    accessToken = token;
}

export function getAccessToken(): string | null {
    return accessToken;
}

export function onTokenRefresh(callback: (token: string) => void) {
    onTokenRefreshed = callback;
}

// Single-flight refresh: concurrent 401/403s share ONE /api/auth/refresh call.
// (Refresh-token rotation revokes the old token, so parallel refreshes would
//  cascade into 401s — e.g. the config page firing 4 requests at once.)
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
    try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        });
        if (!res.ok) return null;
        const body: ApiResponse<{ accessToken: string }> = await res.json();
        if (body.success && body.data?.accessToken) {
            accessToken = body.data.accessToken;
            onTokenRefreshed?.(body.data.accessToken);
            return body.data.accessToken;
        }
        return null;
    } catch {
        return null;
    }
}

function refreshAccessToken(): Promise<string | null> {
    if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
}

export async function apiClient<T = unknown>(
    path: string,
    init: RequestInit = {}
): Promise<ApiResponse<T>> {
    const headers = new Headers(init.headers || {});
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    if (!headers.has('Content-Type') && init.body) {
        headers.set('Content-Type', 'application/json');
    }

    let res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
        credentials: 'include',
    });

    // if 401 or 403, try refresh and retry once
    // (this backend returns 403 for expired/missing tokens, not 401)
    if (res.status === 401 || res.status === 403) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            headers.set('Authorization', `Bearer ${newToken}`);
            res = await fetch(`${API_BASE}${path}`, {
                ...init,
                headers,
                credentials: 'include',
            });
        }
    }

    const body = await res.json().catch(() => ({
        success: false,
        message: 'Network error',
        data: null,
        timestamp: new Date().toISOString(),
    }));

    if (!res.ok) {
        throw { status: res.status, body };
    }

    return body as ApiResponse<T>;
}
