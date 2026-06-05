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
