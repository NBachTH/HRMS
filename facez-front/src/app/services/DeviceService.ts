import { apiClient } from '../commons/utils/ApiCallUtil';
import type { Device, DeviceCreateRequest, ApiKeyCreateResponse } from '../commons/types';

export async function getDevices() {
    return apiClient<Device[]>('/api/devices');
}

export async function createDevice(data: DeviceCreateRequest) {
    return apiClient<Device>('/api/devices', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteDevice(deviceId: string) {
    return apiClient<null>(`/api/devices/${deviceId}`, { method: 'DELETE' });
}

export async function createApiKey(deviceId: string) {
    return apiClient<ApiKeyCreateResponse>(`/api/devices/${deviceId}/api-keys`, { method: 'POST' });
}

export async function deactivateApiKey(deviceId: string, keyId: string) {
    return apiClient<null>(`/api/devices/${deviceId}/api-keys/${keyId}/deactivate`, { method: 'PATCH' });
}
