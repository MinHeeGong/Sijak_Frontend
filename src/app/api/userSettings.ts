// src/api/userSettings.ts
import { apiGet, apiPut } from './client';
import type { UserSettings, AssignmentMode } from './types';

export function getUserSettings(userId: number) {
  return apiGet<UserSettings>(`/user-settings?user_id=${userId}`);
}

export function updateAssignmentMode(userId: number, mode: AssignmentMode) {
  return apiPut<UserSettings>('/user-settings', { user_id: userId, assignment_mode: mode });
}

export interface OnboardingAnswers {
  purpose: string;
  planning_type: 0 | 1;
  burnout_signal: 0 | 1;
  adhd_signal: 0 | 1;
  onboarding_notes: string;
}

export function saveOnboarding(userId: number, answers: Partial<OnboardingAnswers>) {
  return apiPut<UserSettings>('/user-settings', {
    user_id: userId,
    ...answers,
    onboarding_completed: 1,
  });
}

export function skipOnboarding(userId: number) {
  return apiPut<UserSettings>('/user-settings', { user_id: userId, onboarding_completed: 1 });
}
