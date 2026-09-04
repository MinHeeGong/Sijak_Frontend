// src/api/chat.ts
import { apiPost } from './client';

export function sendChatMessage(userId: number, message: string) {
  return apiPost<{ reply: string; choices?: string[] }>('/chat', { user_id: userId, message });
}
