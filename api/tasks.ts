// src/api/tasks.ts
import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Task, DeletionPolicy } from './types';

export function getTasks(userId: number) {
  return apiGet<Task[]>(`/tasks?user_id=${userId}`);
}

export function getTask(taskId: number) {
  return apiGet<Task>(`/tasks/${taskId}`);
}

export interface CreateTaskInput {
  user_id: number;
  category_id: number;
  project_id?: number | null;
  title: string;
  memo?: string;
  due_date?: string;
  estimated_minutes?: number;
  deletion_policy?: DeletionPolicy;
}

export function createTask(input: CreateTaskInput) {
  return apiPost<Task>('/tasks', input);
}

export function updateTask(taskId: number, patch: Partial<CreateTaskInput> & { completed_at?: string }) {
  return apiPut<Task>(`/tasks/${taskId}`, patch);
}

export function deleteTask(taskId: number) {
  return apiDelete<{ id: number; deleted: true }>(`/tasks/${taskId}`);
}
