// Payroll Run Service — period-level payroll workflow (/api/payroll-runs)
import { apiClient } from '../commons/utils/ApiCallUtil';
import type { Payroll } from '../commons/types';

export interface PayrollRun {
    id: string;
    year: number;
    month: number;
    status: string;            // DRAFT | PENDING_APPROVAL | APPROVED | PAID
    employeeCount: number;
    totalGross: number;
    totalNet: number;
    submittedBy?: string;
    approvedBy?: string;
    rejectionReason?: string;
}

export async function getRuns() {
    return apiClient<PayrollRun[]>('/api/payroll-runs');
}

export async function getRunLines(id: string) {
    return apiClient<Payroll[]>(`/api/payroll-runs/${id}/lines`);
}

export async function createRun(year: number, month: number) {
    return apiClient<PayrollRun>('/api/payroll-runs', { method: 'POST', body: JSON.stringify({ year, month }) });
}

export async function recalcRun(id: string) {
    return apiClient<PayrollRun>(`/api/payroll-runs/${id}/recalc`, { method: 'POST' });
}

export async function deleteRun(id: string) {
    return apiClient<void>(`/api/payroll-runs/${id}`, { method: 'DELETE' });
}

export async function recalcLine(id: string, employeeId: string) {
    return apiClient<PayrollRun>(`/api/payroll-runs/${id}/recalc/${employeeId}`, { method: 'POST' });
}

export async function excludeLine(id: string, employeeId: string, reason: string) {
    return apiClient<PayrollRun>(`/api/payroll-runs/${id}/exclude/${employeeId}`, {
        method: 'POST', body: JSON.stringify({ reason }),
    });
}

export async function submitRun(id: string) {
    return apiClient<PayrollRun>(`/api/payroll-runs/${id}/submit`, { method: 'PUT' });
}

export async function approveRun(id: string) {
    return apiClient<PayrollRun>(`/api/payroll-runs/${id}/approve`, { method: 'PUT' });
}

export async function rejectRun(id: string, reason: string) {
    return apiClient<PayrollRun>(`/api/payroll-runs/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) });
}

export async function markRunPaid(id: string) {
    return apiClient<PayrollRun>(`/api/payroll-runs/${id}/mark-paid`, { method: 'PUT' });
}
