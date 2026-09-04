// src/api/userSettings.ts
import { apiGet, apiPut } from './client';
import type { UserSettings, AssignmentMode } from './types';

export function getUserSettings(userId: number) {
  return apiGet<UserSettings>(`/user-settings?user_id=${userId}`);
}

export function updateAssignmentMode(userId: number, mode: AssignmentMode) {
  return apiPut<UserSettings>('/user-settings', { user_id: userId, assignment_mode: mode });
}
