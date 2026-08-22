import { useState, useEffect, useMemo } from "react";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { ResizeHandle } from "./ResizeHandle";
import { useDragResize } from "./useDragResize";
import { timeShort } from "./utils";
import { getSchedules } from "../api/schedules";
import { getTasks } from "../api/tasks";
import { getCategories } from "../api/categories";
import type { Schedule, Task, Category } from "../api/types";

const MIN_DETAIL_W = 176;
const MAX_DETAIL_W = 360;

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

export function MonthlyCalendar({ userId }: { userId: number }) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const [detailW, setDetailW] = useState(208);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tasksById, setTasksById] = useState<Record<number, Task>>({});
  const [categoriesById, setCategoriesById] = useState<Record<number, Category>>({});

  const startResize = useDragResize((deltaX: number) => {
    setDetailW((w) => Math.max(MIN_DETAIL_W, Math.min(MAX_DETAIL_W, w - deltaX)));
  });

  const calStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const calEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  useEffect(() => {
    getCategories(userId)
      .then((cats) => setCategoriesById(Object.fromEntries(cats.map((c) => [c.id, c]))))
      .catch((err) => console.error("카테고리 로드 실패", err));

    getTasks(userId)
      .then((tasks) => setTasksById(Object.fromEntries(tasks.map((t) => [t.id, t]))))
      .catch((err) => console.error("task 로드 실패", err));
  }, [userId]);

  // 월간 range 쿼리가 아직 백엔드에 없어서, 유저의 전체 schedules를 받아
  // local_date가 이번에 보이는 달력 범위(calStart~calEnd) 안에 있는 것만 걸러냅니다.
  useEffect(() => {
    getSchedules(userId)
      .then(setSchedules)
      .catch((err) => console.error("일정 로드 실패", err));
  }, [userId, month]);

  const viewsByDate: Record<string, ScheduledTaskView[]> = useMemo(() => {
    const calStartStr = format(calStart, "yyyy-MM-dd");
    const calEndStr = format(calEnd, "yyyy-MM-dd");
    const result: Record<string, ScheduledTaskView[]> = {};

    for (const s of schedules) {
      if (s.local_date < calStartStr || s.local_date > calEndStr) continue;
      const task = tasksById[s.task_id];
      if (!task) continue;
      const category = categoriesById[task.category_id];
      const { hour, min, duration } = utcToLocalParts(s.start_at, s.end_at);

      if (!result[s.local_date]) result[s.local_date] = [];
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
  }, [schedules, tasksById, categoriesById, calStart, calEnd]);

  const getDayViews = (day: Date) => viewsByDate[format(day, "yyyy-MM-dd")] ?? [];
  const selViews = getDayViews(selected);

  return (
    <div className="h-full flex">
      {/* Calendar */}
      <div className="flex-1 min-w-0 bg-card rounded-2xl border border-border/40 overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold">{format(month, "MMMM yyyy")}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-muted/50 text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="text-xs px-2.5 py-1 rounded-xl text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-muted/50 text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 px-4 pt-3 flex-shrink-0">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-[10px] font-medium text-muted-foreground/40 text-center uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-3">
          <div className="grid grid-cols-7 gap-1">
            {calDays.map((day, i) => {
              const inMonth = day.getMonth() === month.getMonth();
              const isSel = isSameDay(day, selected);
              const isTod = isToday(day);
              const dayViews = getDayViews(day);

              return (
                <button
                  key={i}
                  onClick={() => setSelected(day)}
                  className={clsx(
                    "flex flex-col p-2 rounded-xl text-left transition-all min-h-[76px]",
                    isSel ? "bg-accent/25 ring-1 ring-accent/40" : "hover:bg-muted/25",
                    !inMonth && "opacity-25"
                  )}
                >
                  <span
                    className={clsx(
                      "w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium mb-1 flex-shrink-0",
                      isTod ? "bg-foreground text-background" : "text-foreground/65"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5 w-full">
                    {dayViews.slice(0, 2).map((v) => (
                      <div
                        key={v.scheduleId}
                        className="px-1.5 py-0.5 rounded text-[9px] leading-tight truncate text-foreground"
                        style={{ backgroundColor: v.color }}
                      >
                        {v.title}
                      </div>
                    ))}
                    {dayViews.length > 2 && (
                      <span className="text-[9px] text-muted-foreground/40 px-1">+{dayViews.length - 2}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ResizeHandle onMouseDown={startResize} />

      {/* Day detail panel */}
      <div
        className="bg-card rounded-2xl border border-border/40 flex flex-col overflow-hidden flex-shrink-0"
        style={{ width: `${detailW}px` }}
      >
        <div className="px-4 pt-5 pb-4 border-b border-border/20">
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">{format(selected, "EEE")}</p>
          <p className="text-4xl font-light leading-none mt-1">{format(selected, "d")}</p>
          <p className="text-xs text-muted-foreground/50 mt-1.5">{format(selected, "MMMM yyyy")}</p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-1.5">
          {selViews.length === 0 ? (
            <p className="text-xs text-muted-foreground/30 text-center mt-6">No tasks</p>
          ) : (
            selViews.map((view) => (
              <div key={view.scheduleId} className="rounded-xl px-3 py-2.5" style={{ backgroundColor: view.color }}>
                <p className="text-xs font-medium text-foreground">{view.title}</p>
                <p className="text-[10px] mt-0.5 font-mono opacity-55 text-foreground">
                  {timeShort(view.hour, view.min)} · {view.duration}m
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
