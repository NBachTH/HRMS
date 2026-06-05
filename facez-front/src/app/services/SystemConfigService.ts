import { apiClient } from '@/app/commons/utils/ApiCallUtil';
import type { ApiResponse, SystemConfig, SystemConfigCreateRequest, ConfigType } from '@/app/commons/types';

export function getSystemConfigs(type: ConfigType): Promise<ApiResponse<SystemConfig[]>> {
    return apiClient<SystemConfig[]>(`/api/system-configs?type=${type}`);
}

export function getSystemConfig(id: string): Promise<ApiResponse<SystemConfig>> {
    return apiClient<SystemConfig>(`/api/system-configs/${id}`);
}

export function createSystemConfig(body: SystemConfigCreateRequest): Promise<ApiResponse<SystemConfig>> {
    return apiClient<SystemConfig>('/api/system-configs', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export function activateSystemConfig(id: string): Promise<ApiResponse<SystemConfig>> {
    return apiClient<SystemConfig>(`/api/system-configs/${id}/activate`, { method: 'PATCH' });
}

export function deleteSystemConfig(id: string): Promise<ApiResponse<null>> {
    return apiClient<null>(`/api/system-configs/${id}`, { method: 'DELETE' });
}
