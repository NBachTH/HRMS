import { apiClient } from '../commons/utils/ApiCallUtil';
import type { PublicHoliday, PublicHolidayRequest } from '../commons/types';

const BASE = '/api/public-holidays';

export async function getByYear(year: number) {
    return apiClient<PublicHoliday[]>(`${BASE}?year=${year}`);
}

export async function createHoliday(body: PublicHolidayRequest) {
    return apiClient<PublicHoliday>(BASE, { method: 'POST', body: JSON.stringify(body) });
}

export async function deleteHoliday(id: string) {
    return apiClient<null>(`${BASE}/${id}`, { method: 'DELETE' });
}
