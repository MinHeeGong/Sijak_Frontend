import { useState, useRef, useEffect, useMemo } from "react";
import { getPriorityPins, updatePriorityPinByUser } from "../api/priorityPins";
import { getTasks } from "../api/tasks";
import { getCategories } from "../api/categories";
import type { PriorityPin, Task, Category } from "../api/types";

interface MatrixTaskView {
  taskId: number;
  title: string;
  color: string;
  urgencyPercent: number; // 0~100 (final_urgency * 100)
  importancePercent: number; // 0~100
}

// 0.0~1.0(백엔드 저장 스케일) <-> 0~100(매트릭스 좌표 %) 변환
const toPercent = (v: number) => v * 100;
const toUnit = (percent: number) => percent / 100;

export function PriorityMatrix({ userId }: { userId: number }) {
  const matrixRef = useRef<HTMLDivElement>(null);

  const [pins, setPins] = useState<PriorityPin[]>([]);
  const [tasksById, setTasksById] = useState<Record<number, Task>>({});
  const [categoriesById, setCategoriesById] = useState<Record<number, Category>>({});

  const [dragging, setDragging] = useState<number | null>(null); // task_id
  const [dragOverride, setDragOverride] = useState<{ urgency: number; importance: number } | null>(null);

  useEffect(() => {
    getPriorityPins(userId).then(setPins).catch((err) => console.error("우선순위 로드 실패", err));
    getTasks(userId)
      .then((tasks) => setTasksById(Object.fromEntries(tasks.map((t) => [t.id, t]))))
      .catch((err) => console.error("task 로드 실패", err));
    getCategories(userId)
      .then((cats) => setCategoriesById(Object.fromEntries(cats.map((c) => [c.id, c]))))
      .catch((err) => console.error("카테고리 로드 실패", err));
  }, [userId]);

  useEffect(() => {
    if (dragging == null) return;

    const onMove = (e: MouseEvent) => {
      if (!matrixRef.current) return;
      const rect = matrixRef.current.getBoundingClientRect();
      const urgency = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const importance = Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100));
      setDragOverride({ urgency, importance });
    };

    const onUp = async () => {
      const taskId = dragging;
      const override = dragOverride;
      setDragging(null);

      if (taskId == null || !override) {
        setDragOverride(null);
        return;
      }

      try {
        const updated = await updatePriorityPinByUser(taskId, {
          user_urgency: toUnit(override.urgency),
          user_importance: toUnit(override.importance),
        });
        setPins((prev) => prev.map((p) => (p.task_id === updated.task_id ? updated : p)));
      } catch (err) {
        console.error("우선순위 수정 실패", err);
      } finally {
        setDragOverride(null);
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging, dragOverride]);

  // pins + tasksById + categoriesById 조인. completed_at이 있는(완료된) task와
  // 아직 AI 분류 전(final_urgency/importance가 null)인 task는 매트릭스에서 제외.
  const activeViews: MatrixTaskView[] = useMemo(() => {
    return pins
      .map((pin) => {
        const task = tasksById[pin.task_id];
        if (!task || task.completed_at != null) return null;
        if (pin.final_urgency == null || pin.final_importance == null) return null;

        const category = categoriesById[task.category_id];
        const isDraggingThis = dragging === task.id && dragOverride;

        return {
          taskId: task.id,
          title: task.title,
          color: category?.color ?? "#E8F3FB",
          urgencyPercent: isDraggingThis ? dragOverride!.urgency : toPercent(pin.final_urgency),
          importancePercent: isDraggingThis ? dragOverride!.importance : toPercent(pin.final_importance),
        };
      })
      .filter((v): v is MatrixTaskView => v !== null);
  }, [pins, tasksById, categoriesById, dragging, dragOverride]);

  const stableRot = (taskId: number) => ((taskId % 11) - 5) * 1.2;

  function quadrantLabel(urgencyPercent: number, importancePercent: number) {
    const urgent = urgencyPercent >= 50;
    const important = importancePercent >= 50;
    if (urgent && important) return "최우선";
    if (!urgent && important) return "무조건";
    if (urgent && !important) return "덜 급함";
    return "언젠가";
  }

  return (
    <div className="h-full flex flex-col bg-card rounded-2xl border border-border/40 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold">Priority Matrix</h2>
          <p className="text-xs text-muted-foreground/50 mt-0.5">Drag tasks to reprioritize</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-rose-200 inline-block" />최우선
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-sky-200 inline-block" />무조건
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-amber-200 inline-block" />덜 급함
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-neutral-200 inline-block" />언젠가
          </span>
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-5 min-h-0">
        {/* Matrix area */}
        <div className="flex-1 flex flex-col gap-1.5 min-h-0">
          <div className="flex items-center gap-2 pl-9">
            <span className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">← High importance</span>
          </div>

          <div className="flex-1 flex gap-1.5 min-h-0">
            {/* Y axis label */}
            <div className="w-8 flex items-center justify-center">
              <span
                className="text-[9px] text-muted-foreground/30 uppercase tracking-widest select-none"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                Importance
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-1 min-h-0">
              {/* Top quadrant labels */}
              <div className="grid grid-cols-2 gap-0.5 text-[9px] font-medium text-center">
                <span className="text-sky-400/60">무조건</span>
                <span className="text-rose-400/70">최우선</span>
              </div>

              {/* Matrix */}
              <div
                ref={matrixRef}
                className="flex-1 rounded-2xl overflow-hidden relative"
                style={{ cursor: dragging != null ? "grabbing" : "default" }}
              >
                {/* Quadrant backgrounds */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-border/20">
                  <div className="bg-sky-50/80" />
                  <div className="bg-rose-50/80" />
                  <div className="bg-neutral-50/90" />
                  <div className="bg-amber-50/80" />
                </div>

                {/* Center cross */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/40 -translate-x-px" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-border/40 -translate-y-px" />
                </div>

                {/* Quadrant labels inside */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
                  <div className="flex items-start p-3">
                    <span className="text-[10px] text-sky-400/35 font-semibold uppercase tracking-wide">무조건</span>
                  </div>
                  <div className="flex items-start p-3">
                    <span className="text-[10px] text-rose-400/35 font-semibold uppercase tracking-wide">최우선</span>
                  </div>
                  <div className="flex items-start p-3">
                    <span className="text-[10px] text-muted-foreground/20 font-semibold uppercase tracking-wide">
                      언젠가
                    </span>
                  </div>
                  <div className="flex items-start p-3">
                    <span className="text-[10px] text-amber-400/35 font-semibold uppercase tracking-wide">덜 급함</span>
                  </div>
                </div>

                {/* Task sticky notes */}
                {activeViews.map((view) => {
                  const left = view.urgencyPercent;
                  const top = 100 - view.importancePercent;
                  const rot = stableRot(view.taskId);
                  const isDragging = dragging === view.taskId;

                  return (
                    <div
                      key={view.taskId}
                      style={{
                        position: "absolute",
                        left: `${left}%`,
                        top: `${top}%`,
                        transform: `translate(-50%, -50%) rotate(${isDragging ? 0 : rot}deg)`,
                        zIndex: isDragging ? 30 : 15,
                        cursor: isDragging ? "grabbing" : "grab",
                        transition: isDragging ? "none" : "transform 0.15s ease",
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setDragging(view.taskId);
                        setDragOverride({ urgency: view.urgencyPercent, importance: view.importancePercent });
                      }}
                    >
                      <div
                        className="min-w-[52px] max-w-[96px] px-2.5 py-2 rounded-lg shadow-sm text-center select-none hover:shadow-md transition-shadow"
                        style={{
                          backgroundColor: view.color,
                          borderBottom: `3px solid ${view.color}`,
                          transform: isDragging ? "scale(1.06)" : "scale(1)",
                          transition: "transform 0.1s",
                        }}
                      >
                        <p className="text-[9px] font-semibold leading-tight text-foreground">{view.title}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom quadrant labels + X axis */}
              <div className="grid grid-cols-2 gap-0.5 text-[9px] text-center">
                <span className="text-muted-foreground/30">언젠가</span>
                <span className="text-amber-400/50">덜 급함</span>
              </div>
              <div className="flex justify-between pl-0 text-[9px] text-muted-foreground/35 font-medium">
                <span>← Not urgent</span>
                <span>Urgent →</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-9">
            <span className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">Low importance →</span>
          </div>
        </div>

        {/* Task list legend */}
        <div className="w-40 flex flex-col gap-3 flex-shrink-0">
          <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider">
            Tasks ({activeViews.length})
          </p>
          <div className="space-y-0.5 overflow-y-auto scrollbar-hide flex-1">
            {activeViews.map((view) => (
              <div
                key={view.taskId}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-muted/25 transition-colors"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: view.color }} />
                <span className="text-[10px] text-foreground/65 flex-1 truncate leading-tight">{view.title}</span>
                <span className="text-[9px] font-mono text-muted-foreground/40 flex-shrink-0">
                  {quadrantLabel(view.urgencyPercent, view.importancePercent)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
