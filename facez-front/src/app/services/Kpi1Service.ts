// KPI1 Service — performance rating entered by a direct superior (/api/kpi1)
import { apiClient } from '../commons/utils/ApiCallUtil';

export interface Kpi1Rating {
    id: string;
    employeeId: string;
    employeeName?: string;
    year: number;
    month: number;
    rating: string;       // A / B / C
    evaluatorId?: string;
    note?: string;
}

export async function getKpi1(year: number, month: number) {
    return apiClient<Kpi1Rating[]>(`/api/kpi1?year=${year}&month=${month}`);
}

export async function upsertKpi1(data: { employeeId: string; year: number; month: number; rating: string; note?: string }) {
    return apiClient<Kpi1Rating>('/api/kpi1', { method: 'PUT', body: JSON.stringify(data) });
}
