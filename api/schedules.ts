// src/api/schedules.ts
// DailyTimeline.tsx, WeeklyGrid.tsx가 같은 getSchedules를 다른 날짜 범위로 호출하면 됩니다.
// (스키마 설계상 일간/주간은 같은 schedules row를 다르게 렌더링만 하는 구조라, 조회 함수도 하나로 공유)

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Schedule } from './types';

// date를 생략하면 해당 유저의 전체 일정을 가져옵니다 (WeeklyGrid에서는 프론트에서 범위 필터링하거나,
// 필요하면 백엔드에 from/to 쿼리를 추가로 열어달라고 요청하세요).
export function getSchedules(userId: number, date?: string) {
  const query = date ? `?user_id=${userId}&date=${date}` : `?user_id=${userId}`;
  return apiGet<Schedule[]>(`/schedules${query}`);
}

export interface CreateScheduleInput {
  task_id: number;
  start_at: string; // UTC ISO 8601
  end_at: string; // UTC ISO 8601
}

export function createSchedule(input: CreateScheduleInput) {
  return apiPost<Schedule>('/schedules', input);
}

// reschedule_task가 매핑되는 지점 - 드래그로 옮긴 새 시간을 그대로 넘기면 됩니다.
export function rescheduleTask(scheduleId: number, patch: { start_at?: string; end_at?: string }) {
  return apiPut<Schedule>(`/schedules/${scheduleId}`, patch);
}

export function deleteSchedule(scheduleId: number) {
  return apiDelete<{ id: number; deleted: true }>(`/schedules/${scheduleId}`);
}
