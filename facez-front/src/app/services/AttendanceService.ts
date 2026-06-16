// Attendance Service — matches backend /api/attendances/*
import {apiClient} from '../commons/utils/ApiCallUtil';
import type {Attendance, AttendanceRequest, PageResponse} from '../commons/types';

export interface AttendanceFilter {
    page?: number;
    size?: number;
    employeeId?: string;
    from?: string;   // YYYY-MM-DD
    to?: string;     // YYYY-MM-DD
    date?: string;   // YYYY-MM-DD (single day)
}

export async function getAttendances(filter: AttendanceFilter = {}) {
    const {page = 0, size = 20, from, to, date} = filter;
    const q = new URLSearchParams({page: String(page), size: String(size)});
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (date) q.set('date', date);
    return apiClient<PageResponse<Attendance>>(`/api/attendances/my?${q}`);
}

export async function getAllAttendances(filter: AttendanceFilter = {}) {
    const {page = 0, size = 20, employeeId, from, to, date} = filter;
    const q = new URLSearchParams({page: String(page), size: String(size)});
    if (employeeId) q.set('employeeId', employeeId);
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (date) q.set('date', date);
    return apiClient<PageResponse<Attendance>>(`/api/attendances?${q}`);
}

export async function closePeriod(year: number, month: number, notes?: string, forceClose?: boolean) {
    return apiClient<import('../commons/types').PeriodCloseResponse>('/api/attendances/close-period', {
        method: 'POST',
        body: JSON.stringify({ year, month, notes, forceClose }),
    });
}

/** HR: notify employees with unexplained absences to file an adjustment request. */
export async function remindAbsentees(year: number, month: number) {
    return apiClient<{ notified: number }>('/api/attendances/close-period/remind', {
        method: 'POST',
        body: JSON.stringify({ year, month }),
    });
}

export async function getAttendanceById(id: string) {
    return apiClient<Attendance>(`/api/attendances/${id}`);
}

export async function updateAttendance(id: string, data: AttendanceRequest) {
    return apiClient<Attendance>(`/api/attendances/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteAttendance(id: string) {
    return apiClient<void>(`/api/attendances/${id}`, {method: 'DELETE'});
}
