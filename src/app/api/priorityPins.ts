// src/api/priorityPins.ts
// PriorityMatrix.tsx에서 사용. AI 판단은 classifyPriority, 드래그 수정은 updatePriorityPinByUser로 분리.

import { apiGet, apiPost, apiPut } from './client';
import type { PriorityPin } from './types';

export function getPriorityPins(userId: number) {
  return apiGet<PriorityPin[]>(`/priority-pins?user_id=${userId}`);
}

export function getPriorityPin(taskId: number) {
  return apiGet<PriorityPin>(`/priority-pins/${taskId}`);
}

// classify_priority 함수(AI)가 매핑되는 지점
export function classifyPriority(input: {
  task_id: number;
  ai_urgency: number;
  ai_importance: number;
  ai_reasoning?: string;
}) {
  return apiPost<PriorityPin>('/priority-pins', input);
}

// 매트릭스에서 유저가 핀을 드래그해서 옮겼을 때 호출
export function updatePriorityPinByUser(
  taskId: number,
  patch: { user_urgency?: number; user_importance?: number }
) {
  return apiPut<PriorityPin>(`/priority-pins/${taskId}`, patch);
}
