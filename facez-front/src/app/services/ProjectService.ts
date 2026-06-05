// Project Service — lightweight project context for OT / Leave routing.
// NOTE: backend `/api/projects` chưa được triển khai. Consumer cần bắt lỗi
// và xử lý danh sách rỗng một cách mềm mại (form vẫn render bình thường).
import { apiClient } from '../commons/utils/ApiCallUtil';
import type { Project } from '../commons/types';

export async function getProjects() {
    return apiClient<Project[]>('/api/projects');
}

export async function getMyProjects() {
    return apiClient<Project[]>('/api/projects/my');
}
