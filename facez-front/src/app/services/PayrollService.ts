// Payroll Service — matches backend /api/payrolls/* endpoints
import { apiClient } from '../commons/utils/ApiCallUtil';
import type {
    Payroll, PayrollCalculateRequest, PayrollBatchCalculateRequest,
    PayrollJobResponse, PageResponse, Payslip,
    LabourCostResponse, InsuranceRemittanceResponse, PitSummaryResponse,
} from '../commons/types';

export async function getPayrollsByPeriod(year: number, month: number, page = 0, size = 20) {
    return apiClient<PageResponse<Payroll>>(
        `/api/payrolls/period?year=${year}&month=${month}&page=${page}&size=${size}`
    );
}

export async function getAllPayrolls(page = 0, size = 20) {
    return apiClient<PageResponse<Payroll>>(`/api/payrolls?page=${page}&size=${size}`);
}

export async function getMyPayrolls(page = 0, size = 20) {
    return apiClient<PageResponse<Payroll>>(`/api/payrolls/my?page=${page}&size=${size}`);
}

export async function getPayrollsByEmployee(employeeId: string, page = 0, size = 20) {
    return apiClient<PageResponse<Payroll>>(
        `/api/payrolls/employee/${employeeId}?page=${page}&size=${size}`
    );
}

export async function getPayrollById(id: string) {
    return apiClient<Payroll>(`/api/payrolls/${id}`);
}

export async function calculatePayroll(data: PayrollCalculateRequest) {
    return apiClient<Payroll>('/api/payrolls/calculate', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function batchCalculatePayroll(data: PayrollBatchCalculateRequest) {
    return apiClient<PayrollJobResponse>('/api/payrolls/batch-calculate', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function pollPayrollJob(jobId: string) {
    return apiClient<PayrollJobResponse>(`/api/payrolls/jobs/${jobId}`);
}

export async function approvePayroll(id: string) {
    return apiClient<Payroll>(`/api/payrolls/${id}/approve`, { method: 'PATCH' });
}

export async function submitPayroll(id: string) {
    return apiClient<Payroll>(`/api/payrolls/${id}/submit`, { method: 'PATCH' });
}

export async function rejectPayroll(id: string, reason: string) {
    return apiClient<Payroll>(`/api/payrolls/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
    });
}

export async function markPaidPayroll(id: string) {
    return apiClient<Payroll>(`/api/payrolls/${id}/mark-paid`, { method: 'PATCH' });
}

export async function deletePayroll(id: string) {
    return apiClient<null>(`/api/payrolls/${id}`, { method: 'DELETE' });
}

export async function getMyPayslip(year: number, month: number) {
    return apiClient<Payslip>(`/api/payrolls/my/${year}/${month}/slip`);
}

export async function getLabourCostReport(year: number, month: number, deptId?: string) {
    const q = deptId ? `&deptId=${deptId}` : '';
    return apiClient<LabourCostResponse>(`/api/payrolls/reports/labour-cost?year=${year}&month=${month}${q}`);
}

export async function getInsuranceRemittanceReport(year: number, month: number) {
    return apiClient<InsuranceRemittanceResponse>(`/api/payrolls/reports/insurance-remittance?year=${year}&month=${month}`);
}

export async function getPitSummaryReport(year: number, month: number) {
    return apiClient<PitSummaryResponse>(`/api/payrolls/reports/pit-summary?year=${year}&month=${month}`);
}
