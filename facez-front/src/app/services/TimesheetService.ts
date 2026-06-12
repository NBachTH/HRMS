// Timesheet Service — matches backend /api/timesheets/*
import { apiClient } from '../commons/utils/ApiCallUtil';
import type { Timesheet } from '../commons/types';

/** HR / Manager / Finance: all employees' monthly timesheets. */
export async function getTimesheets(year: number, month: number) {
    return apiClient<Timesheet[]>(`/api/timesheets?year=${year}&month=${month}`);
}

/** Employee self-service: all of the caller's monthly timesheets (newest first). */
export async function getMyTimesheets() {
    return apiClient<Timesheet[]>(`/api/timesheets/my`);
}

export async function getEmployeeTimesheet(employeeId: string, year: number, month: number) {
    return apiClient<Timesheet>(`/api/timesheets/${employeeId}?year=${year}&month=${month}`);
}
