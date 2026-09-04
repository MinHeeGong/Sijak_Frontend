// src/app/category/FolderView.tsx
// Canva Projects 참고: 폴더 카드 드릴다운 + breadcrumb.
// 드래그: react-dnd (이미 설치돼 있던 걸 여기서 처음 사용).
// 다중 선택: 체크박스 -> 하단 bulk 툴바 -> 선택된 것들 중 하나를 드래그하면 선택된 전체가 같이 이동.

import { useMemo, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Folder, FileText, ChevronRight, Trash2, FolderInput, Layers } from "lucide-react";
import { clsx } from "clsx";

import type { Category, Project, Task } from "../api/types";
import { bulkUpdateTasks } from "../api/tasks";
import { bulkUpdateCategoryParent } from "../api/categories";
import { bulkUpdateProjects } from "../api/projects";
import { ExpiryBadge } from "../components/ExpiryBadge";
import { type FolderRef, folderKey, getFolderContents, getBreadcrumb } from "./tree";

type ItemKind = "task" | "category" | "project";
interface DragPayload {
  kind: ItemKind;
  ids: number[];
}

function itemKey(kind: ItemKind, id: number) {
  return `${kind}-${id}`;
}

// 드롭 대상(폴더)에 아이템을 놓았을 때 실제 이동을 수행.
// kind 불일치(예: 카테고리를 프로젝트 안으로)는 스키마상 불가능하므로 조용히 무시.
async function moveIntoFolder(payload: DragPayload, target: FolderRef, onDone: () => void) {
  const { kind, ids } = payload;

  if (kind === "task") {
    const patch =
      target.type === "project"
        ? { project_id: target.id }
        : target.type === "category"
        ? { category_id: target.id, project_id: null }
        : null; // root에는 task를 직접 못 둠
    if (!patch) return;
    await bulkUpdateTasks({ task_ids: ids, ...patch });
  } else if (kind === "category") {
    if (target.type === "project") return; // 카테고리는 프로젝트 밑으로 못 감
    await bulkUpdateCategoryParent(ids, target.type === "category" ? target.id : null);
  } else if (kind === "project") {
    if (target.type === "category") {
      await bulkUpdateProjects(ids, { category_id: target.id, parent_id: null });
    } else if (target.type === "project") {
      await bulkUpdateProjects(ids, { parent_id: target.id, category_id: null });
    } else {
      await bulkUpdateProjects(ids, { category_id: null, parent_id: null });
    }
  }

  onDone();
}

function FolderCard({
  ref,
  name,
  color,
  itemCount,
  kind,
  id,
  selected,
  onToggleSelect,
  onOpen,
  dragPayload,
  onDropItem,
}: {
  ref: FolderRef;
  name: string;
  color: string;
  itemCount: number;
  kind: ItemKind;
  id: number;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  dragPayload: DragPayload;
  onDropItem: (payload: DragPayload, target: FolderRef) => void;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "FOLDER_ITEM",
    item: dragPayload,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "FOLDER_ITEM",
    canDrop: (item: DragPayload) => !(item.kind === "category" && kind === "project"),
    drop: (item: DragPayload) => onDropItem(item, ref),
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  }));

  return (
    <div
      ref={(node) => drag(drop(node))}
      onClick={onOpen}
      className={clsx(
        "relative flex flex-col gap-2 p-3 rounded-2xl border cursor-pointer transition-all select-none",
        isDragging && "opacity-40",
        isOver && canDrop ? "border-foreground bg-muted/40 scale-[1.02]" : "border-border/40 bg-card hover:bg-muted/20"
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onClick={(e) => e.stopPropagation()}
        onChange={onToggleSelect}
        className="absolute top-2 right-2 w-3.5 h-3.5"
      />
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: color + "33" }}
      >
        {kind === "project" ? <Layers size={16} color={color} /> : <Folder size={16} color={color} />}
      </div>
      <div className="text-xs font-medium text-foreground truncate">{name}</div>
      <div className="text-[10px] text-muted-foreground/60">{itemCount}개 항목</div>
    </div>
  );
}

function TaskCard({
  task,
  selected,
  onToggleSelect,
}: {
  task: Task;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "FOLDER_ITEM",
    item: { kind: "task", ids: [task.id] } as DragPayload,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  const done = task.completed_at != null;

  return (
    <div
      ref={(node) => drag(node)}
      className={clsx(
        "flex items-center gap-2 p-2.5 rounded-2xl border border-border/30 bg-card/60 select-none",
        isDragging && "opacity-40"
      )}
    >
      <input type="checkbox" checked={selected} onChange={onToggleSelect} className="w-3.5 h-3.5 flex-shrink-0" />
      <FileText size={13} className="text-muted-foreground/50 flex-shrink-0" />
      <span className={clsx("text-xs flex-1 truncate", done ? "line-through text-muted-foreground/30" : "text-foreground/80")}>
        {task.title}
      </span>
      {!done && <ExpiryBadge expiresAt={task.expires_at} />}
    </div>
  );
}

export function FolderView({
  categories,
  projects,
  tasks,
  onRefresh,
}: {
  categories: Category[];
  projects: Project[];
  tasks: Task[];
  onRefresh: () => void;
}) {
  const [folder, setFolder] = useState<FolderRef>({ type: "root" });
  const [selection, setSelection] = useState<Set<string>>(new Set());

  const { subCategories, subProjects, leafTasks } = useMemo(
    () => getFolderContents(folder, categories, projects, tasks),
    [folder, categories, projects, tasks]
  );
  const breadcrumb = useMemo(() => getBreadcrumb(folder, categories, projects), [folder, categories, projects]);

  const toggle = (kind: ItemKind, id: number) => {
    const key = itemKey(kind, id);
    setSelection((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // 드래그된 아이템이 이미 선택돼 있으면 선택된 전체를, 아니면 그 아이템 하나만 이동.
  const resolveDragPayload = (kind: ItemKind, id: number): DragPayload => {
    const key = itemKey(kind, id);
    if (selection.has(key)) {
      const ids = Array.from(selection)
        .filter((k) => k.startsWith(`${kind}-`))
        .map((k) => Number(k.split("-")[1]));
      return { kind, ids };
    }
    return { kind, ids: [id] };
  };

  const handleDrop = async (payload: DragPayload, target: FolderRef) => {
    await moveIntoFolder(payload, target, onRefresh);
    setSelection(new Set());
  };

  const bulkDelete = async () => {
    const taskIds = Array.from(selection).filter((k) => k.startsWith("task-")).map((k) => Number(k.split("-")[1]));
    if (taskIds.length > 0) {
      await bulkUpdateTasks({ task_ids: taskIds, deleted_at: new Date().toISOString() });
    }
    setSelection(new Set());
    onRefresh();
  };

  const selectionCount = selection.size;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col">
        {/* breadcrumb */}
        <div className="flex items-center gap-1 px-1 py-2 text-xs text-muted-foreground/70 flex-shrink-0">
          {breadcrumb.map((c, i) => (
            <div key={folderKey(c.ref)} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={11} />}
              <BreadcrumbSegment crumb={c} onOpen={() => setFolder(c.ref)} onDropItem={handleDrop} />
            </div>
          ))}
        </div>

        {/* bulk toolbar */}
        {selectionCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-foreground text-background text-xs flex-shrink-0">
            <FolderInput size={13} />
            <span>{selectionCount}개 선택됨 — 드래그해서 폴더로 이동</span>
            <button onClick={bulkDelete} className="ml-auto flex items-center gap-1 hover:opacity-70">
              <Trash2 size={13} /> 삭제
            </button>
          </div>
        )}

        {/* grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-3 content-start p-1">
          {subCategories.map((c) => (
            <FolderCard
              key={`cat-${c.id}`}
              ref={{ type: "category", id: c.id }}
              name={c.name}
              color={c.color}
              itemCount={
                categories.filter((x) => x.parent_id === c.id).length +
                projects.filter((x) => x.category_id === c.id && x.parent_id == null).length +
                tasks.filter((t) => t.category_id === c.id && t.project_id == null).length
              }
              kind="category"
              id={c.id}
              selected={selection.has(itemKey("category", c.id))}
              onToggleSelect={() => toggle("category", c.id)}
              onOpen={() => setFolder({ type: "category", id: c.id })}
              dragPayload={resolveDragPayload("category", c.id)}
              onDropItem={handleDrop}
            />
          ))}
          {subProjects.map((p) => (
            <FolderCard
              key={`proj-${p.id}`}
              ref={{ type: "project", id: p.id }}
              name={p.name}
              color={p.color}
              itemCount={
                projects.filter((x) => x.parent_id === p.id).length +
                tasks.filter((t) => t.project_id === p.id).length
              }
              kind="project"
              id={p.id}
              selected={selection.has(itemKey("project", p.id))}
              onToggleSelect={() => toggle("project", p.id)}
              onOpen={() => setFolder({ type: "project", id: p.id })}
              dragPayload={resolveDragPayload("project", p.id)}
              onDropItem={handleDrop}
            />
          ))}
          {leafTasks.map((t) => (
            <TaskCard
              key={`task-${t.id}`}
              task={t}
              selected={selection.has(itemKey("task", t.id))}
              onToggleSelect={() => toggle("task", t.id)}
            />
          ))}
          {subCategories.length + subProjects.length + leafTasks.length === 0 && (
            <div className="col-span-4 text-center text-xs text-muted-foreground/50 py-10">
              이 폴더는 비어있어요.
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}

// breadcrumb 세그먼트도 drop target으로 만들어서, 하위 폴더에 있는 걸 상위로 바로 드래그해 올릴 수 있게 함.
function BreadcrumbSegment({
  crumb,
  onOpen,
  onDropItem,
}: {
  crumb: { ref: FolderRef; name: string };
  onOpen: () => void;
  onDropItem: (payload: DragPayload, target: FolderRef) => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "FOLDER_ITEM",
    canDrop: (item: DragPayload) => !(item.kind === "category" && crumb.ref.type === "project"),
    drop: (item: DragPayload) => onDropItem(item, crumb.ref),
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  }));

  return (
    <button
      ref={(node) => drop(node)}
      onClick={onOpen}
      className={clsx(
        "px-1.5 py-0.5 rounded-lg hover:text-foreground hover:bg-muted/40 transition-colors",
        isOver && canDrop && "bg-muted/60 text-foreground"
      )}
    >
      {crumb.name}
    </button>
  );
}
