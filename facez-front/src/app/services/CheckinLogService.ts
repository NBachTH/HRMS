import { apiClient } from '../commons/utils/ApiCallUtil';
import type { CheckinLog, PageResponse } from '../commons/types';

export interface CheckinLogFilter {
    employeeId?: string;
    from?: string;
    to?: string;
    logType?: 'IN' | 'OUT';
    page?: number;
    size?: number;
}

export async function getCheckinLogs(filter: CheckinLogFilter = {}) {
    const { page = 0, size = 50, employeeId, from, to, logType } = filter;
    const q = new URLSearchParams({ page: String(page), size: String(size) });
    if (employeeId) q.set('employeeId', employeeId);
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (logType) q.set('logType', logType);
    return apiClient<PageResponse<CheckinLog>>(`/api/checkin-logs?${q}`);
}

/**
 * Management view: GET /api/checkin-logs?date=YYYY-MM-DD returns ALL raw logs
 * for that calendar day (every employee). Restricted to HR_ADMIN/MANAGER/SYSTEM_ADMIN.
 */
export async function getCheckinLogsByDate(date: string) {
    return apiClient<CheckinLog[]>(`/api/checkin-logs?date=${encodeURIComponent(date)}`);
}

/**
 * Self-service: GET /api/checkin-logs/my?date=YYYY-MM-DD returns only the calling
 * user's own raw logs for the day (scoped server-side from the JWT).
 */
export async function getMyCheckinLogsByDate(date: string) {
    return apiClient<CheckinLog[]>(`/api/checkin-logs/my?date=${encodeURIComponent(date)}`);
}
