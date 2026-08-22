import { useState, useRef, useEffect, useMemo } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { AddTaskModal, type AddTaskPayload } from "./AddTaskModal";
import { HOURS, HOUR_PX, DAY_START, DAY_END } from "./constants";
import { taskTop, taskH, timeShort, hourLabel } from "./utils";
import { getSchedules, rescheduleTask, createSchedule } from "../api/schedules";
import { getTasks, createTask } from "../api/tasks";
import { getCategories } from "../api/categories";
import type { Schedule, Task, Category } from "../api/types";

// 렌더링용 view model: schedules(시간) + tasks(제목) + categories(색) 조인 결과.
// taskTop/taskH 등 기존 유틸은 {hour, min, duration}을 기대하므로 로컬 시간으로 풀어서 담습니다.
interface ScheduledTaskView {
  scheduleId: number;
  taskId: number;
  title: string;
  color: string; // 카테고리의 hex 색상
  hour: number;
  min: number;
  duration: number; // 분
}

function utcToLocalParts(startAtIso: string, endAtIso: string) {
  const start = new Date(startAtIso);
  const end = new Date(endAtIso);
  const hour = start.getHours();
  const min = start.getMinutes();
  const duration = Math.round((end.getTime() - start.getTime()) / (60 * 1000));
  return { hour, min, duration };
}

export function DailyTimeline({
  userId,
  date,
  onChangeDate,
}: {
  userId: number;
  date: Date;
  onChangeDate: (d: Date) => void;
}) {
  const dateStr = format(date, "yyyy-MM-dd");

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tasksById, setTasksById] = useState<Record<number, Task>>({});
  const [categoriesById, setCategoriesById] = useState<Record<number, Category>>({});

  const [addAt, setAddAt] = useState<{ hour: number; min: number } | null>(null);
  const [hoverTaskId, setHoverTaskId] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isCurrentDay = isSameDay(date, new Date());
  const now = new Date();
  const currentTop = isCurrentDay
    ? (now.getHours() - DAY_START + now.getMinutes() / 60) * HOUR_PX
    : null;

  // 카테고리 + task 목록은 유저 단위로 한 번 불러와서 캐싱 (조인용)
  useEffect(() => {
    getCategories(userId)
      .then((cats) => setCategoriesById(Object.fromEntries(cats.map((c) => [c.id, c]))))
      .catch((err) => console.error("카테고리 로드 실패", err));

    getTasks(userId)
      .then((tasks) => setTasksById(Object.fromEntries(tasks.map((t) => [t.id, t]))))
      .catch((err) => console.error("task 로드 실패", err));
  }, [userId]);

  // 날짜가 바뀔 때마다 그날의 schedules만 다시 조회
  useEffect(() => {
    getSchedules(userId, dateStr)
      .then(setSchedules)
      .catch((err) => console.error("일정 로드 실패", err));
  }, [userId, dateStr]);

  // Drag-to-reschedule: 마우스무브 중엔 로컬 미리보기만, mouseup에 한 번만 서버 반영
  const dragInfoRef = useRef<{
    scheduleId: number;
    startClientY: number;
    startHour: number;
    startMin: number;
    duration: number;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragPreview, setDragPreview] = useState<{ hour: number; min: number } | null>(null);

  useEffect(() => {
    if (!draggingId) return;

    const onMove = (e: MouseEvent) => {
      const info = dragInfoRef.current;
      if (!info) return;
      const deltaY = e.clientY - info.startClientY;
      const rawDeltaMin = (deltaY / HOUR_PX) * 60;
      const snapped = Math.round(rawDeltaMin / 15) * 15;
      const totalStartMin = info.startHour * 60 + info.startMin + snapped;
      const clamped = Math.max(
        DAY_START * 60,
        Math.min(DAY_END * 60 - info.duration, totalStartMin)
      );
      setDragPreview({ hour: Math.floor(clamped / 60), min: clamped % 60 });
    };

    const onUp = async () => {
      const info = dragInfoRef.current;
      const preview = dragPreview;
      dragInfoRef.current = null;
      setDraggingId(null);

      if (!info || !preview) {
        setDragPreview(null);
        return;
      }

      // 최종 위치로 start_at/end_at 재계산 후 딱 한 번만 서버에 반영
      const newStart = new Date(date);
      newStart.setHours(preview.hour, preview.min, 0, 0);
      const newEnd = new Date(newStart.getTime() + info.duration * 60 * 1000);

      try {
        const updated = await rescheduleTask(info.scheduleId, {
          start_at: newStart.toISOString(),
          end_at: newEnd.toISOString(),
        });
        setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } catch (err) {
        console.error("재배치 실패", err);
      } finally {
        setDragPreview(null);
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingId, dragPreview, date]);

  const onTaskMouseDown = (e: React.MouseEvent, view: ScheduledTaskView) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    dragInfoRef.current = {
      scheduleId: view.scheduleId,
      startClientY: e.clientY,
      startHour: view.hour,
      startMin: view.min,
      duration: view.duration,
    };
    setDraggingId(view.scheduleId);
    setDragPreview({ hour: view.hour, min: view.min });
  };

  const yToTime = (y: number) => {
    const totalMins = (y / HOUR_PX) * 60;
    const h = Math.floor(totalMins / 60) + DAY_START;
    const m = Math.round((totalMins % 60) / 15) * 15;
    return { hour: Math.max(DAY_START, Math.min(DAY_END - 1, h)), min: m >= 60 ? 0 : m };
  };

  const handleBgClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-task]")) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    setAddAt(yToTime(y));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHoverY(e.clientY - rect.top + containerRef.current.scrollTop);
  };

  // 새 task 추가: AddTaskModal이 넘겨준 payload로 task 생성 -> schedule 생성 순차 호출
  const handleAdd = async (payload: AddTaskPayload) => {
    if (payload.category_id == null) {
      // 지금은 REST만으로 즉시 AI 자동분류를 할 수 없어서 우선 막아둠.
      // AI 자동 분류는 대화창(add_task 함수)을 통해서만 가능.
      alert("카테고리를 선택해주세요. AI 자동 분류는 대화창에서 이용할 수 있어요.");
      return;
    }

    try {
      const task = await createTask({
        user_id: userId,
        category_id: payload.category_id,
        title: payload.title,
      });
      const schedule = await createSchedule({
        task_id: task.id,
        start_at: payload.start_at,
        end_at: payload.end_at,
      });

      setTasksById((prev) => ({ ...prev, [task.id]: task }));
      setSchedules((prev) => [...prev, schedule]);
      setAddAt(null);
    } catch (err) {
      console.error("task 추가 실패", err);
      alert("추가에 실패했어요. 다시 시도해주세요.");
    }
  };

  // schedules + tasksById + categoriesById 조인 -> 렌더링용 view model
  const dayTasks: ScheduledTaskView[] = useMemo(() => {
    return schedules
      .map((s) => {
        const task = tasksById[s.task_id];
        if (!task) return null;
        const category = categoriesById[task.category_id];

        const isDraggingThis = draggingId === s.id && dragPreview;
        const { hour, min, duration } = isDraggingThis
          ? { ...dragPreview!, duration: taskDurationMinutes(s) }
          : utcToLocalParts(s.start_at, s.end_at);

        return {
          scheduleId: s.id,
          taskId: task.id,
          title: task.title,
          color: category?.color ?? "#E8F3FB", // 카테고리 로드 전 임시 기본색
          hour,
          min,
          duration,
        };
      })
      .filter((v): v is ScheduledTaskView => v !== null);
  }, [schedules, tasksById, categoriesById, draggingId, dragPreview]);

  function taskDurationMinutes(s: Schedule) {
    return Math.round((new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) / (60 * 1000));
  }

  return (
    <div className="relative flex flex-col h-full bg-card rounded-2xl border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-4 pb-3 border-b border-border/20 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => onChangeDate(addDays(date, -1))}
          className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-muted/50 text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex flex-col items-center">
          <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-0.5">
            {format(date, "EEEE")}
            {isCurrentDay && <span className="text-foreground/70"> · Today</span>}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-light text-foreground leading-none">{format(date, "d")}</span>
            <span className="text-sm text-muted-foreground/60">{format(date, "MMM")}</span>
          </div>
        </div>

        <button
          onClick={() => onChangeDate(addDays(date, 1))}
          className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-muted/50 text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Timeline body */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-hide relative select-none cursor-crosshair"
        onClick={handleBgClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverY(null)}
      >
        <div style={{ height: `${HOURS.length * HOUR_PX}px`, position: "relative" }}>
          {/* Hour grid lines */}
          {HOURS.map((h) => (
            <div
              key={h}
              style={{ top: `${(h - DAY_START) * HOUR_PX}px`, position: "absolute", left: 0, right: 0 }}
              className="flex items-start"
            >
              <span
                className="w-14 text-right pr-3 text-[10px] font-mono text-muted-foreground/40 leading-none flex-shrink-0"
                style={{ paddingTop: "2px" }}
              >
                {hourLabel(h)}
              </span>
              <div className="flex-1 border-t border-border/25" />
            </div>
          ))}

          {/* Hover position indicator */}
          {hoverY !== null && !hoverTaskId && !addAt && !draggingId && (
            <div
              style={{ position: "absolute", top: `${hoverY}px`, left: "56px", right: "8px", zIndex: 6 }}
              className="pointer-events-none flex items-center"
            >
              <div className="h-px flex-1 bg-accent/50" />
              <button
                className="pointer-events-auto w-5 h-5 rounded-full bg-accent border-2 border-background text-foreground/70 flex items-center justify-center ml-1 mr-1 hover:scale-110 transition-transform shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (hoverY !== null) setAddAt(yToTime(hoverY));
                }}
              >
                <Plus size={9} />
              </button>
            </div>
          )}

          {/* Current time indicator */}
          {currentTop !== null && currentTop > 0 && (
            <div
              style={{ position: "absolute", top: `${currentTop}px`, left: "50px", right: 0, zIndex: 10 }}
              className="flex items-center pointer-events-none"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400 -ml-1.5 flex-shrink-0 shadow-sm" />
              <div className="flex-1 h-px bg-rose-400/50" />
            </div>
          )}

          {/* Task blocks */}
          {dayTasks.map((view) => {
            const top = taskTop(view);
            const height = taskH(view);
            const isHovered = hoverTaskId === view.taskId;
            const isDragging = draggingId === view.scheduleId;

            return (
              <div
                key={view.scheduleId}
                data-task="true"
                style={{
                  position: "absolute",
                  top: `${top}px`,
                  height: `${height}px`,
                  left: "56px",
                  right: "10px",
                  backgroundColor: view.color,
                  borderLeft: `3px solid ${view.color}`,
                  zIndex: isDragging ? 25 : isHovered ? 15 : 8,
                  boxShadow: isDragging ? "0 6px 18px rgba(0,0,0,0.12)" : undefined,
                  cursor: isDragging ? "grabbing" : "grab",
                }}
                className="rounded-r-xl px-2.5 py-1.5 hover:brightness-[0.97] transition-[filter] overflow-hidden"
                onMouseDown={(e) => onTaskMouseDown(e, view)}
                onMouseEnter={() => setHoverTaskId(view.taskId)}
                onMouseLeave={() => setHoverTaskId(null)}
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-[11px] font-semibold leading-tight truncate text-foreground">
                  {view.title}
                </p>
                {height > 36 && (
                  <p className="text-[10px] mt-0.5 font-mono opacity-55 leading-tight text-foreground">
                    {timeShort(view.hour, view.min)} · {view.duration}m
                  </p>
                )}

                {isHovered && !draggingId && (
                  <>
                    <button
                      data-task="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddAt({ hour: view.hour, min: view.min });
                      }}
                      style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)" }}
                      className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center shadow-md hover:scale-110 transition-transform z-30"
                    >
                      <Plus size={9} />
                    </button>
                    <button
                      data-task="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        const endH = Math.floor(view.hour + (view.min + view.duration) / 60);
                        const endM = (view.min + view.duration) % 60;
                        setAddAt({ hour: Math.min(endH, DAY_END - 1), min: endH >= DAY_END ? 0 : endM });
                      }}
                      style={{ position: "absolute", bottom: "-10px", left: "50%", transform: "translateX(-50%)" }}
                      className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center shadow-md hover:scale-110 transition-transform z-30"
                    >
                      <Plus size={9} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {addAt && (
        <AddTaskModal
          userId={userId}
          baseDate={date}
          dayOffset={0}
          defaultHour={addAt.hour}
          defaultMin={addAt.min}
          onAdd={handleAdd}
          onClose={() => setAddAt(null)}
        />
      )}
    </div>
  );
}
