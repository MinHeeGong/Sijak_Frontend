// src/api/categories.ts
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client';
import type { Category } from './types';

// schema.sql의 user_settings.color_order 기본값과 동일 (헤이즈님이 지정한 6색 팔레트)
export const DEFAULT_COLOR_PALETTE = [
  '#D5F1FF',
  '#E4DCFC',
  '#CCFAE4',
  '#CBF0EA',
  '#FDF0DC',
  '#FDDFEB',
];

const UNCLASSIFIED_CATEGORY_NAME = '미분류';

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

// 마인드맵뷰: 라쏘로 여러 카테고리 노드를 선택한 뒤 부모를 한 번에 바꿀 때 사용
export function bulkUpdateCategoryParent(categoryIds: number[], parentId: number | null) {
  return apiPatch<Category[]>('/categories/bulk', { category_ids: categoryIds, parent_id: parentId });
}

// 카테고리 선택 없이 빠르게 task를 추가하는 화면(TodoSidebar 등)에서 사용.
// "미분류" 카테고리가 이미 있으면 그걸 재사용하고, 없으면 팔레트에서
// 아직 안 쓰인 색을 골라 새로 만듭니다. (스키마상 task는 category_id가 필수라서 필요)
export async function ensureUnclassifiedCategory(
  userId: number,
  existingCategories: Category[]
): Promise<Category> {
  const found = existingCategories.find((c) => c.name === UNCLASSIFIED_CATEGORY_NAME);
  if (found) return found;

  const usedColors = new Set(existingCategories.map((c) => c.color));
  const nextColor =
    DEFAULT_COLOR_PALETTE.find((c) => !usedColors.has(c)) ??
    DEFAULT_COLOR_PALETTE[existingCategories.length % DEFAULT_COLOR_PALETTE.length];

  return createCategory({ user_id: userId, name: UNCLASSIFIED_CATEGORY_NAME, color: nextColor });
}
