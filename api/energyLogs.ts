// src/api/energyLogs.ts
import { apiGet, apiPost } from './client';
import type { EnergyLog } from './types';

export function getEnergyLogs(userId: number, date?: string) {
  const query = date ? `?user_id=${userId}&date=${date}` : `?user_id=${userId}`;
  return apiGet<EnergyLog[]>(`/energy-logs${query}`);
}

export function logEnergy(input: {
  user_id: number;
  date: string;
  time_slot: string;
  energy_level: 1 | 2 | 3 | 4 | 5;
}) {
  return apiPost<EnergyLog>('/energy-logs', input);
}
