// src/api/types.ts
// backend/db/schema.sql 기준 타입. 기존 프론트에 이미 정의된 Task 타입이 있다면
// 필드명을 서로 맞춰서 병합해주세요 (특히 category_id, project_id, due_date 부분).

export type DeletionPolicy = '24h' | '7d' | '30d' | 'manual';
export type AssignmentMode = 'auto' | 'ask';

export interface Category {
  id: number;
  user_id: number;
  parent_id: number | null;
  name: string;
  color: string;
  last_task_updated_at: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  user_id: number;
  category_id: number | null;
  parent_id: number | null;
  name: string;
  color: string;
  deadline: string | null; // 'YYYY-MM-DD'
  last_task_updated_at: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  user_id: number;
  category_id: number;
  project_id: number | null;
  title: string;
  memo: string | null;
  due_date: string | null; // 'YYYY-MM-DD'
  estimated_minutes: number | null;
  deletion_policy: DeletionPolicy;
  expires_at: string | null;
  completed_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: number;
  task_id: number;
  start_at: string; // UTC ISO 8601
  end_at: string; // UTC ISO 8601
  local_date: string; // 'YYYY-MM-DD', 유저 타임존 기준
  created_at: string;
  updated_at: string;
}

export type Quadrant = '최우선' | '무조건' | '덜 급함' | '언젠가' | null;

export interface PriorityPin {
  id: number;
  task_id: number;
  ai_urgency: number | null;
  ai_importance: number | null;
  ai_reasoning: string | null;
  user_urgency: number | null;
  user_importance: number | null;
  is_ai_classified: 0 | 1;
  created_at: string;
  updated_at: string;
  // 백엔드가 조회 시점에 계산해서 얹어주는 파생값
  final_urgency: number | null;
  final_importance: number | null;
  quadrant: Quadrant;
}

export interface EnergyLog {
  id: number;
  user_id: number;
  date: string;
  time_slot: string; // 'HH:MM-HH:MM'
  energy_level: 1 | 2 | 3 | 4 | 5;
  created_at: string;
}

export interface EventFollowup {
  id: number;
  task_id: number;
  event_date: string;
  followup_shown: 0 | 1;
  user_response: 'acknowledged' | 'declined' | null;
  created_at: string;
  task_title?: string; // /pending 조회 시에만 join되어 내려옴
}
