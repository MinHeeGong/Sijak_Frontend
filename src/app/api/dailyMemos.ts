// src/api/dailyMemos.ts
import { apiGet, apiPut, apiDelete } from './client';
import type { DailyMemo } from './types';

export function getDailyMemos(userId: number, startDate?: string, endDate?: string) {
  const range = startDate && endDate ? `&start_date=${startDate}&end_date=${endDate}` : '';
  return apiGet<DailyMemo[]>(`/daily-memos?user_id=${userId}${range}`);
}

// 날짜당 1개라 생성/수정 구분 없이 upsert
export function saveDailyMemo(userId: number, date: string, content: string) {
  return apiPut<DailyMemo>('/daily-memos', { user_id: userId, date, content });
}

export function deleteDailyMemo(userId: number, date: string) {
  return apiDelete<{ user_id: number; date: string; deleted: true }>(
    `/daily-memos?user_id=${userId}&date=${date}`
  );
}
