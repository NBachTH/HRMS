// WorkDay Service — matches backend /api/work-days/*
import { apiClient } from '../commons/utils/ApiCallUtil';
import type { WorkDay } from '../commons/types';

export async function getMyWorkDays(year: number, month: number) {
    return apiClient<WorkDay[]>(`/api/work-days/my?year=${year}&month=${month}`);
}

export async function getEmployeeWorkDays(employeeId: string, year: number, month: number) {
    return apiClient<WorkDay[]>(`/api/work-days?employeeId=${employeeId}&year=${year}&month=${month}`);
}

/** HR: days needing reconciliation (check-in vs leave conflict) before closing. */
export async function getWorkDayConflicts(year: number, month: number) {
    return apiClient<WorkDay[]>(`/api/work-days/conflicts?year=${year}&month=${month}`);
}

/** HR resolves a conflict by choosing CHECKIN or LEAVE_REQUEST. */
export async function resolveWorkDayConflict(id: string, source: 'CHECKIN' | 'LEAVE_REQUEST') {
    return apiClient<WorkDay>(`/api/work-days/${id}/resolve?source=${source}`, { method: 'PATCH' });
}
