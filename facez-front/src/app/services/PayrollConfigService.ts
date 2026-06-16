import { apiClient } from '@/app/commons/utils/ApiCallUtil';
import type {
    ApiResponse,
    SalaryGradeConfig, SalaryGradeConfigRequest,
    PitConfig, PitConfigRequest,
    InsuranceConfig, InsuranceConfigRequest,
    AllowanceConfig, AllowanceConfigRequest,
} from '@/app/commons/types';

const BASE = '/api/payroll-configs';

// ── SALARY GRADE ────────────────────────────────────────────────────────────
export const listSalaryGradeConfigs = () =>
    apiClient<SalaryGradeConfig[]>(`${BASE}/salary-grade`);
export const createSalaryGradeConfig = (body: SalaryGradeConfigRequest) =>
    apiClient<SalaryGradeConfig>(`${BASE}/salary-grade`, { method: 'POST', body: JSON.stringify(body) });
export const publishSalaryGradeConfig = (id: string) =>
    apiClient<SalaryGradeConfig>(`${BASE}/salary-grade/${id}/publish`, { method: 'PATCH' });
export const deleteSalaryGradeConfig = (id: string) =>
    apiClient<null>(`${BASE}/salary-grade/${id}`, { method: 'DELETE' });

// ── PIT ──────────────────────────────────────────────────────────────────────
export const listPitConfigs = () =>
    apiClient<PitConfig[]>(`${BASE}/pit`);
export const createPitConfig = (body: PitConfigRequest) =>
    apiClient<PitConfig>(`${BASE}/pit`, { method: 'POST', body: JSON.stringify(body) });
export const publishPitConfig = (id: string) =>
    apiClient<PitConfig>(`${BASE}/pit/${id}/publish`, { method: 'PATCH' });
export const deletePitConfig = (id: string) =>
    apiClient<null>(`${BASE}/pit/${id}`, { method: 'DELETE' });

// ── INSURANCE ──────────────────────────────────────────────────────────────────
export const listInsuranceConfigs = () =>
    apiClient<InsuranceConfig[]>(`${BASE}/insurance`);
export const createInsuranceConfig = (body: InsuranceConfigRequest) =>
    apiClient<InsuranceConfig>(`${BASE}/insurance`, { method: 'POST', body: JSON.stringify(body) });
export const publishInsuranceConfig = (id: string) =>
    apiClient<InsuranceConfig>(`${BASE}/insurance/${id}/publish`, { method: 'PATCH' });
export const deleteInsuranceConfig = (id: string) =>
    apiClient<null>(`${BASE}/insurance/${id}`, { method: 'DELETE' });

// ── ALLOWANCE ──────────────────────────────────────────────────────────────────
export const listAllowanceConfigs = () =>
    apiClient<AllowanceConfig[]>(`${BASE}/allowance`);
export const createAllowanceConfig = (body: AllowanceConfigRequest) =>
    apiClient<AllowanceConfig>(`${BASE}/allowance`, { method: 'POST', body: JSON.stringify(body) });
export const publishAllowanceConfig = (id: string) =>
    apiClient<AllowanceConfig>(`${BASE}/allowance/${id}/publish`, { method: 'PATCH' });
export const deleteAllowanceConfig = (id: string) =>
    apiClient<null>(`${BASE}/allowance/${id}`, { method: 'DELETE' });
