// src/api/auth.ts
import { apiPost, API_BASE_URL } from './client';
import type { AssignmentMode } from './types';

export type OnboardingPurpose = 'project_mgmt' | 'simple_schedule' | 'priority_mgmt' | 'low_activation';
export type Provider = 'google' | 'kakao' | 'naver';

export interface AuthUser {
  id: number;
  email: string;
  display_name: string | null;
  provider: Provider | null;
}

export interface AuthSettings {
  assignment_mode: AssignmentMode;
  purpose: OnboardingPurpose | null;
  planning_type: 0 | 1 | null;
  burnout_signal: 0 | 1 | null;
  adhd_signal: 0 | 1 | null;
  onboarding_notes: string | null;
  onboarding_completed: 0 | 1;
}

// apiGet을 안 쓰는 이유: 401(로그인 안 됨)이 "에러"가 아니라 정상적인 상태값이라서,
// throw 대신 null을 반환하는 별도 처리가 필요함.
export async function getMe(): Promise<{ user: AuthUser; settings: AuthSettings } | null> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
  const json = await res.json();
  if (!json.success) return null;
  return json.data;
}

export function logout() {
  return apiPost<{ loggedOut: true }>('/auth/logout', {});
}

// 로그인 버튼 클릭 시 이 주소로 location 이동 (fetch가 아니라 실제 페이지 이동이어야
// OAuth 제공사의 로그인 화면으로 리다이렉트됨)
export function loginUrl(provider: Provider) {
  return `${API_BASE_URL}/auth/${provider}`;
}
