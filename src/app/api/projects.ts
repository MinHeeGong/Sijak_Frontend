// src/api/projects.ts
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client';
import type { Project } from './types';

export function getProjects(userId: number) {
  return apiGet<Project[]>(`/projects?user_id=${userId}`);
}

export interface CreateProjectInput {
  user_id: number;
  name: string;
  color: string;
  category_id?: number | null;
  parent_id?: number | null;
  deadline?: string | null; // 'YYYY-MM-DD'
}

export function createProject(input: CreateProjectInput) {
  return apiPost<Project>('/projects', input);
}

export function updateProject(
  projectId: number,
  patch: Partial<Pick<Project, 'name' | 'color' | 'category_id' | 'parent_id' | 'deadline'>>
) {
  return apiPut<Project>(`/projects/${projectId}`, patch);
}

export function deleteProject(projectId: number) {
  return apiDelete<{ id: number; deleted: true }>(`/projects/${projectId}`);
}

// 카테고리 탭 다중 선택: 여러 프로젝트를 한 번에 다른 카테고리/부모프로젝트로 이동
export function bulkUpdateProjects(
  projectIds: number[],
  patch: { category_id?: number | null; parent_id?: number | null }
) {
  return apiPatch<Project[]>('/projects/bulk', { project_ids: projectIds, ...patch });
}
