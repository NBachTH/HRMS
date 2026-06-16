import { apiClient } from '@/app/commons/utils/ApiCallUtil';
import type { ApiResponse, SystemConfig, ConfigType } from '@/app/commons/types';

// DEPRECATED, read-only. Legacy JSONB system_config kept for reference/rollback only.
// Payroll config is now managed via PayrollConfigService.ts (/api/payroll-configs).

export function getSystemConfigs(type: ConfigType): Promise<ApiResponse<SystemConfig[]>> {
    return apiClient<SystemConfig[]>(`/api/system-configs?type=${type}`);
}

export function getSystemConfig(id: string): Promise<ApiResponse<SystemConfig>> {
    return apiClient<SystemConfig>(`/api/system-configs/${id}`);
}
