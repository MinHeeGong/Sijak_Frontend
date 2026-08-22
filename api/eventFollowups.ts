// src/api/eventFollowups.ts
// 앱 최초 진입(하루 중 첫 방문) 시 getPendingFollowups를 호출해서
// AI 대화창이 시작 멘트로 자연스럽게 언급하도록 연결하면 됩니다.

import { apiGet, apiPost, apiPut } from './client';
import type { EventFollowup } from './types';

export function getPendingFollowups(userId: number, today: string) {
  return apiGet<EventFollowup[]>(`/event-followups/pending?user_id=${userId}&today=${today}`);
}

// create_followup_flag 함수(AI, 선별적으로만 호출)가 매핑되는 지점
export function createFollowupFlag(input: { task_id: number; event_date: string }) {
  return apiPost<EventFollowup>('/event-followups', input);
}

export function respondToFollowup(
  followupId: number,
  userResponse: 'acknowledged' | 'declined'
) {
  return apiPut<EventFollowup>(`/event-followups/${followupId}`, { user_response: userResponse });
}
