// src/api/categories.ts
import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Category } from './types';

export function getCategories(userId: number) {
  return apiGet<Category[]>(`/categories?user_id=${userId}`);
}

export interface CreateCategoryInput {
  user_id: number;
  name: string;
  color: string;
  parent_id?: number | null;
}

export function createCategory(input: CreateCategoryInput) {
  return apiPost<Category>('/categories', input);
}

export function updateCategory(
  categoryId: number,
  patch: Partial<Pick<Category, 'name' | 'color' | 'parent_id' | 'last_task_updated_at'>>
) {
  return apiPut<Category>(`/categories/${categoryId}`, patch);
}

export function deleteCategory(categoryId: number) {
  return apiDelete<{ id: number; deleted: true }>(`/categories/${categoryId}`);
}
