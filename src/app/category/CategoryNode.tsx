// src/app/category/CategoryNode.tsx
// reactflow 커스텀 노드. 카테고리/프로젝트/task 세 종류를 한 컴포넌트로 처리.
// - 더블클릭: 이름 인라인 수정
// - + 버튼(카테고리/프로젝트만): 하위 항목 추가
// - x 버튼: 삭제

import { useState } from "react";
import { Handle, Position } from "reactflow";
import { Plus, X } from "lucide-react";
import { clsx } from "clsx";
import { ExpiryBadge } from "../components/ExpiryBadge";

export interface CategoryNodeData {
  label: string;
  color: string;
  kind: "category" | "project" | "task";
  expiresAt?: string | null;
  done?: boolean;
  onRename: (newName: string) => void;
  onAddChild?: () => void;
  onDelete: () => void;
}

export function CategoryNode({ data }: { data: CategoryNodeData }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== data.label) data.onRename(draft.trim());
    else setDraft(data.label);
  };

  return (
    <div
      className={clsx(
        "group relative px-3 py-2 rounded-2xl border shadow-sm bg-card min-w-[140px] max-w-[220px] select-none",
        data.kind === "task" ? "border-dashed" : "border-solid"
      )}
      style={{ borderColor: data.color }}
    >
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none !w-1 !h-1" />
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-none !w-1 !h-1" />

      <button
        onClick={data.onDelete}
        className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-muted-foreground/20 hover:bg-destructive hover:text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={9} />
      </button>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="text-xs w-full bg-transparent outline-none border-b border-border/50"
        />
      ) : (
        <div
          onDoubleClick={() => setEditing(true)}
          className={clsx(
            "text-xs font-medium truncate",
            data.done ? "line-through text-muted-foreground/40" : "text-foreground"
          )}
        >
          {data.label}
        </div>
      )}

      {data.kind !== "task" && (
        <div className="text-[9px] text-muted-foreground/50 mt-0.5 capitalize">{data.kind}</div>
      )}
      {data.kind === "task" && !data.done && (
        <div className="mt-1">
          <ExpiryBadge expiresAt={data.expiresAt ?? null} />
        </div>
      )}

      {data.onAddChild && (
        <button
          onClick={data.onAddChild}
          className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Plus size={11} />
        </button>
      )}
    </div>
  );
}
