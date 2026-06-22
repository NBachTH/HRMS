import { apiClient } from '@/app/commons/utils/ApiCallUtil';
import type {
    ApiResponse,
    SalaryGradeConfig, SalaryGradeConfigRequest,
    PitConfig, PitConfigRequest,
    InsuranceConfig, InsuranceConfigRequest,
    AllowanceConfig, AllowanceConfigRequest,
} from '@/app/commons/types';

const BASE = '/api/payroll-configs';

export interface EffectiveConfig {
    configType: 'SALARY_GRADE' | 'ALLOWANCE' | 'PIT' | 'INSURANCE';
    id?: string;
    effectiveFrom?: string;
    legalBasis?: string;
    found: boolean;
}

/** PUBLISHED config version each type resolves to for a payroll period. */
export const getEffectiveConfigs = (year: number, month: number) =>
    apiClient<EffectiveConfig[]>(`${BASE}/effective?year=${year}&month=${month}`);

// ── SALARY GRADE ────────────────────────────────────────────────────────────
export const listSalaryGradeConfigs = () =>
    apiClient<SalaryGradeConfig[]>(`${BASE}/salary-grade`);
export const createSalaryGradeConfig = (body: SalaryGradeConfigRequest) =>
    apiClient<SalaryGradeConfig>(`${BASE}/salary-grade`, { method: 'POST', body: JSON.stringify(body) });
export const updateSalaryGradeConfig = (id: string, body: SalaryGradeConfigRequest) =>
    apiClient<SalaryGradeConfig>(`${BASE}/salary-grade/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const submitSalaryGradeConfig = (id: string) =>
    apiClient<SalaryGradeConfig>(`${BASE}/salary-grade/${id}/submit`, { method: 'PATCH' });
export const rejectSalaryGradeConfig = (id: string) =>
    apiClient<SalaryGradeConfig>(`${BASE}/salary-grade/${id}/reject`, { method: 'PATCH' });
export const publishSalaryGradeConfig = (id: string) =>
    apiClient<SalaryGradeConfig>(`${BASE}/salary-grade/${id}/publish`, { method: 'PATCH' });
export const deleteSalaryGradeConfig = (id: string) =>
    apiClient<null>(`${BASE}/salary-grade/${id}`, { method: 'DELETE' });

// ── PIT ──────────────────────────────────────────────────────────────────────
export const listPitConfigs = () =>
    apiClient<PitConfig[]>(`${BASE}/pit`);
export const createPitConfig = (body: PitConfigRequest) =>
    apiClient<PitConfig>(`${BASE}/pit`, { method: 'POST', body: JSON.stringify(body) });
export const updatePitConfig = (id: string, body: PitConfigRequest) =>
    apiClient<PitConfig>(`${BASE}/pit/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const submitPitConfig = (id: string) =>
    apiClient<PitConfig>(`${BASE}/pit/${id}/submit`, { method: 'PATCH' });
export const rejectPitConfig = (id: string) =>
    apiClient<PitConfig>(`${BASE}/pit/${id}/reject`, { method: 'PATCH' });
export const publishPitConfig = (id: string) =>
    apiClient<PitConfig>(`${BASE}/pit/${id}/publish`, { method: 'PATCH' });
export const deletePitConfig = (id: string) =>
    apiClient<null>(`${BASE}/pit/${id}`, { method: 'DELETE' });

// ── INSURANCE ──────────────────────────────────────────────────────────────────
export const listInsuranceConfigs = () =>
    apiClient<InsuranceConfig[]>(`${BASE}/insurance`);
export const createInsuranceConfig = (body: InsuranceConfigRequest) =>
    apiClient<InsuranceConfig>(`${BASE}/insurance`, { method: 'POST', body: JSON.stringify(body) });
export const updateInsuranceConfig = (id: string, body: InsuranceConfigRequest) =>
    apiClient<InsuranceConfig>(`${BASE}/insurance/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const submitInsuranceConfig = (id: string) =>
    apiClient<InsuranceConfig>(`${BASE}/insurance/${id}/submit`, { method: 'PATCH' });
export const rejectInsuranceConfig = (id: string) =>
    apiClient<InsuranceConfig>(`${BASE}/insurance/${id}/reject`, { method: 'PATCH' });
export const publishInsuranceConfig = (id: string) =>
    apiClient<InsuranceConfig>(`${BASE}/insurance/${id}/publish`, { method: 'PATCH' });
export const deleteInsuranceConfig = (id: string) =>
    apiClient<null>(`${BASE}/insurance/${id}`, { method: 'DELETE' });

// ── ALLOWANCE ──────────────────────────────────────────────────────────────────
export const listAllowanceConfigs = () =>
    apiClient<AllowanceConfig[]>(`${BASE}/allowance`);
export const createAllowanceConfig = (body: AllowanceConfigRequest) =>
    apiClient<AllowanceConfig>(`${BASE}/allowance`, { method: 'POST', body: JSON.stringify(body) });
export const updateAllowanceConfig = (id: string, body: AllowanceConfigRequest) =>
    apiClient<AllowanceConfig>(`${BASE}/allowance/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const submitAllowanceConfig = (id: string) =>
    apiClient<AllowanceConfig>(`${BASE}/allowance/${id}/submit`, { method: 'PATCH' });
export const rejectAllowanceConfig = (id: string) =>
    apiClient<AllowanceConfig>(`${BASE}/allowance/${id}/reject`, { method: 'PATCH' });
export const publishAllowanceConfig = (id: string) =>
    apiClient<AllowanceConfig>(`${BASE}/allowance/${id}/publish`, { method: 'PATCH' });
export const deleteAllowanceConfig = (id: string) =>
    apiClient<null>(`${BASE}/allowance/${id}`, { method: 'DELETE' });
