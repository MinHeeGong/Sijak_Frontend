import { useEffect, useState, useMemo, useRef } from "react";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { clsx } from "clsx";
import { HOURS, HOUR_PX, DAY_START, DAY_END } from "./constants";
import { taskTop, taskH, hourLabel } from "./utils";
import { getSchedules, createSchedule } from "../api/schedules";
import { getTasks, createTask } from "../api/tasks";
import { getCategories } from "../api/categories";
import type { Schedule, Task, Category } from "../api/types";
import { AddTaskModal, type AddTaskPayload } from "./AddTaskModal";
import { onDataChanged } from "../lib/dataEvents";

interface ScheduledTaskView {
  scheduleId: number;
  title: string;
  color: string;
  localDate: string;
  hour: number;
  min: number;
  duration: number;
}

function utcToLocalParts(startAtIso: string, endAtIso: string) {
  const start = new Date(startAtIso);
  const end = new Date(endAtIso);
  return {
    hour: start.getHours(),
    min: start.getMinutes(),
    duration: Math.round((end.getTime() - start.getTime()) / (60 * 1000)),
  };
}

export function WeeklyGrid({
  userId,
  selectedDate,
  onSelectDate,
}: {
  userId: number;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tasksById, setTasksById] = useState<Record<number, Task>>({});
  const [categoriesById, setCategoriesById] = useState<Record<number, Category>>({});
  const [addAt, setAddAt] = useState<{ day: Date; hour: number; min: number } | null>(null);
  const colRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const now = new Date();

  // DailyTimeline의 yToTime과 동일한 로직 (y좌표 -> 15분 단위로 스냅된 시:분)
  const yToTime = (y: number) => {
    const totalMins = (y / HOUR_PX) * 60;
    const h = Math.floor(totalMins / 60) + DAY_START;
    const m = Math.round((totalMins % 60) / 15) * 15;
    return { hour: Math.max(DAY_START, Math.min(DAY_END - 1, h)), min: m >= 60 ? 0 : m };
  };

  const handleColumnClick = (e: React.MouseEvent, day: Date, col: number) => {
    if ((e.target as HTMLElement).closest("[data-task]")) return; // 기존 일정 클릭은 무시
    const el = colRefs.current[col];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = e.clientY - rect.top;
    onSelectDate(day);
    setAddAt({ day, ...yToTime(y) });
  };

  // 새 task 추가: DailyTimeline과 동일한 패턴 (task 생성 -> schedule 생성 순차 호출)
  const handleAdd = async (payload: AddTaskPayload) => {
    if (payload.category_id == null) {
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

  const refetchCategoriesAndTasks = () => {
    getCategories(userId)
      .then((cats) => setCategoriesById(Object.fromEntries(cats.map((c) => [c.id, c]))))
      .catch((err) => console.error("카테고리 로드 실패", err));

    getTasks(userId)
      .then((tasks) => setTasksById(Object.fromEntries(tasks.map((t) => [t.id, t]))))
      .catch((err) => console.error("task 로드 실패", err));
  };
  useEffect(refetchCategoriesAndTasks, [userId]);

  // 주 단위 range 쿼리가 아직 백엔드에 없어서, 유저의 전체 schedules를 받아
  // local_date가 이번 주(weekStart~+6일) 안에 있는 것만 클라이언트에서 걸러냅니다.
  // (개인용 MVP 규모라 성능 문제 없음. 나중에 데이터 많아지면 /schedules?from=&to= 추가 권장)
  const refetchSchedules = () => {
    getSchedules(userId)
      .then(setSchedules)
      .catch((err) => console.error("일정 로드 실패", err));
  };
  useEffect(refetchSchedules, [userId]);

  // AI 채팅에서 일정을 추가/변경했을 수도 있으니 신호가 오면 통째로 다시 불러옴
  useEffect(() => onDataChanged(() => {
    refetchCategoriesAndTasks();
    refetchSchedules();
  }), [userId]);

  const weekDateStrs = useMemo(() => weekDays.map((d) => format(d, "yyyy-MM-dd")), [weekDays]);

  const viewsByDate: Record<string, ScheduledTaskView[]> = useMemo(() => {
    const result: Record<string, ScheduledTaskView[]> = {};
    for (const dateStr of weekDateStrs) result[dateStr] = [];

    for (const s of schedules) {
      if (!weekDateStrs.includes(s.local_date)) continue;
      const task = tasksById[s.task_id];
      if (!task) continue;
      const category = categoriesById[task.category_id];
      const { hour, min, duration } = utcToLocalParts(s.start_at, s.end_at);

      result[s.local_date].push({
        scheduleId: s.id,
        title: task.title,
        color: category?.color ?? "#E8F3FB",
        localDate: s.local_date,
        hour,
        min,
        duration,
      });
    }
    return result;
  }, [schedules, tasksById, categoriesById, weekDateStrs]);

  return (
    <div className="relative flex flex-col h-full bg-card rounded-2xl border border-border/40 overflow-hidden">
      {/* Day headers */}
      <div
        className="flex-shrink-0 border-b border-border/20"
        style={{ display: "grid", gridTemplateColumns: "40px repeat(7, 1fr)" }}
      >
        <div className="border-r border-border/15" />
        {weekDays.map((day, i) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayViews = viewsByDate[dateStr] ?? [];
          const isSel = isSameDay(day, selectedDate);
          const isTod = isToday(day);
          return (
            <button
              key={i}
              onClick={() => onSelectDate(day)}
              className={clsx(
                "py-2.5 text-center border-l border-border/15 transition-colors",
                isSel ? "bg-accent/20" : "hover:bg-muted/25"
              )}
            >
              <div className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
                {format(day, "EEE")}
              </div>
              <div
                className={clsx(
                  "text-xs font-medium w-6 h-6 rounded-full flex items-center justify-center mx-auto mt-0.5",
                  isTod ? "bg-foreground text-background" : "text-foreground/65"
                )}
              >
                {format(day, "d")}
              </div>
              <div className="flex justify-center gap-0.5 mt-1.5">
                {dayViews.slice(0, 4).map((v) => (
                  <div key={v.scheduleId} className="w-1 h-1 rounded-full" style={{ backgroundColor: v.color }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div
          className="relative"
          style={{ display: "grid", gridTemplateColumns: "40px repeat(7, 1fr)", height: `${HOURS.length * HOUR_PX}px` }}
        >
          {/* Hour labels column */}
          <div className="relative border-r border-border/15">
            {HOURS.map((h) => (
              <div
                key={h}
                style={{ position: "absolute", top: `${(h - DAY_START) * HOUR_PX}px`, left: 0, right: 0 }}
                className="flex justify-end pr-2"
              >
                <span
                  className="text-[9px] font-mono text-muted-foreground/35 leading-none"
                  style={{ paddingTop: "2px" }}
                >
                  {h % 3 === 0 ? hourLabel(h) : ""}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, col) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayViews = viewsByDate[dateStr] ?? [];
            const isSel = isSameDay(day, selectedDate);
            const isTod = isToday(day);
            const nowTop = isTod ? (now.getHours() - DAY_START + now.getMinutes() / 60) * HOUR_PX : null;

            return (
              <div
                key={col}
                ref={(el) => (colRefs.current[col] = el)}
                className={clsx("relative border-l border-border/15", isSel && "bg-accent/[0.07]")}
                onClick={(e) => handleColumnClick(e, day, col)}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{ position: "absolute", top: `${(h - DAY_START) * HOUR_PX}px`, left: 0, right: 0 }}
                    className="border-t border-border/15"
                  />
                ))}
                {nowTop !== null && nowTop > 0 && (
                  <div
                    style={{ position: "absolute", top: `${nowTop}px`, left: 0, right: 0 }}
                    className="h-px bg-rose-400/35 z-10 pointer-events-none"
                  />
                )}
                {dayViews.map((view) => {
                  const top = taskTop(view);
                  const height = Math.max(taskH(view), 14);
                  return (
                    <div
                      key={view.scheduleId}
                      data-task
                      style={{
                        position: "absolute",
                        top: `${top}px`,
                        height: `${height}px`,
                        left: "2px",
                        right: "2px",
                        backgroundColor: view.color,
                        borderLeft: `2px solid ${view.color}`,
                        zIndex: 5,
                      }}
                      className="rounded-r overflow-hidden px-1 py-0.5"
                    >
                      <p className="text-[9px] font-medium leading-tight truncate text-foreground">{view.title}</p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {addAt && (
        <AddTaskModal
          userId={userId}
          baseDate={addAt.day}
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
