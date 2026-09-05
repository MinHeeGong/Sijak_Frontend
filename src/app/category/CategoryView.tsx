// src/app/category/CategoryView.tsx
// 카테고리 탭. 폴더뷰(Canva Projects 참고) <-> 마인드맵뷰(Mindnode 참고) 토글.
// 마지막으로 보던 뷰는 localStorage에 저장 (서버까지 저장할 정도로 중요한 값은 아니라고 판단).

import { useEffect, useState, useCallback } from "react";
import { Folder, Network } from "lucide-react";
import { clsx } from "clsx";

import { getCategories } from "../api/categories";
import { getProjects } from "../api/projects";
import { getTasks } from "../api/tasks";
import type { Category, Project, Task } from "../api/types";
import { FolderView } from "./FolderView";
import { MindmapView } from "./MindmapView";
import { onDataChanged } from "../lib/dataEvents";

type ViewMode = "folder" | "mindmap";
const STORAGE_KEY = "sijak:category-view-mode";

export function CategoryView({ userId }: { userId: number }) {
  const [mode, setMode] = useState<ViewMode>(
    () => (localStorage.getItem(STORAGE_KEY) as ViewMode) || "folder"
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const refresh = useCallback(() => {
    getCategories(userId).then(setCategories).catch((err) => console.error("카테고리 로드 실패", err));
    getProjects(userId).then(setProjects).catch((err) => console.error("프로젝트 로드 실패", err));
    getTasks(userId).then(setTasks).catch((err) => console.error("task 로드 실패", err));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // AI 채팅에서 카테고리/task를 추가·변경했을 수도 있으니 신호가 오면 다시 불러옴
  useEffect(() => onDataChanged(refresh), [refresh]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 mb-2 flex-shrink-0">
        {(
          [
            { id: "folder" as const, label: "폴더뷰", Icon: Folder },
            { id: "mindmap" as const, label: "마인드맵뷰", Icon: Network },
          ]
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
              mode === id ? "bg-foreground text-background" : "text-muted-foreground/60 hover:bg-muted/40"
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {mode === "folder" ? (
          <FolderView categories={categories} projects={projects} tasks={tasks} onRefresh={refresh} />
        ) : (
          <MindmapView userId={userId} categories={categories} projects={projects} tasks={tasks} onRefresh={refresh} />
        )}
      </div>
    </div>
  );
}
