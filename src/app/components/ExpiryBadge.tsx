// src/app/components/ExpiryBadge.tsx
// task.expires_at 기준으로 24시간(1일) 이하 남았을 때만 노란 경고 배지를 띄움.
// 이미 만료됐거나(diff <= 0) 하루보다 많이 남았으면 아무것도 렌더링하지 않음.

import { Clock } from "lucide-react";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;

  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0 || diffMs > ONE_DAY_MS) return null;

  const hoursLeft = Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium flex-shrink-0"
      title="자동 삭제 예정 (deletion_policy 기준)"
    >
      <Clock size={10} />
      {hoursLeft}시간 후 삭제
    </span>
  );
}
