import { useState, useEffect, useMemo, useRef } from "react";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, StickyNote, Pencil } from "lucide-react";
import { clsx } from "clsx";
import { ResizeHandle } from "./ResizeHandle";
import { useDragResize } from "./useDragResize";
import { timeShort } from "./utils";
import { getSchedules } from "../api/schedules";
import { getTasks } from "../api/tasks";
import { getCategories } from "../api/categories";
import { getDailyMemos, saveDailyMemo } from "../api/dailyMemos";
import type { Schedule, Task, Category, DailyMemo } from "../api/types";
import { onDataChanged } from "../lib/dataEvents";

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

// 마우스 커서 옆에 붙어다니는 메모 미리보기 툴팁
function MemoHoverPreview({ x, y, content }: { x: number; y: number; content: string }) {
  return (
    <div
      className="fixed z-50 max-w-[220px] px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[10px] leading-snug shadow-xl pointer-events-none"
      style={{ left: x + 14, top: y + 14 }}
    >
      {content.length > 80 ? content.slice(0, 80) + "…" : content}
    </div>
  );
}

export function MonthlyCalendar({ userId }: { userId: number }) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const [detailW, setDetailW] = useState(208);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tasksById, setTasksById] = useState<Record<number, Task>>({});
  const [categoriesById, setCategoriesById] = useState<Record<number, Category>>({});
  const [memosByDate, setMemosByDate] = useState<Record<string, DailyMemo>>({});
  const [hoverMemo, setHoverMemo] = useState<{ date: string; x: number; y: number } | null>(null);

  const [memoEditing, setMemoEditing] = useState(false);
  const [memoDraft, setMemoDraft] = useState("");
  const memoTextareaRef = useRef<HTMLTextAreaElement>(null);

  const startResize = useDragResize((deltaX: number) => {
    setDetailW((w) => Math.max(MIN_DETAIL_W, Math.min(MAX_DETAIL_W, w - deltaX)));
  });

  const calStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const calEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const refetchCategoriesAndTasks = () => {
    getCategories(userId)
      .then((cats) => setCategoriesById(Object.fromEntries(cats.map((c) => [c.id, c]))))
      .catch((err) => console.error("카테고리 로드 실패", err));

    getTasks(userId)
      .then((tasks) => setTasksById(Object.fromEntries(tasks.map((t) => [t.id, t]))))
      .catch((err) => console.error("task 로드 실패", err));
  };
  useEffect(refetchCategoriesAndTasks, [userId]);

  // 월간 range 쿼리가 아직 백엔드에 없어서, 유저의 전체 schedules를 받아
  // local_date가 이번에 보이는 달력 범위(calStart~calEnd) 안에 있는 것만 걸러냅니다.
  const refetchSchedules = () => {
    getSchedules(userId)
      .then(setSchedules)
      .catch((err) => console.error("일정 로드 실패", err));
  };
  useEffect(refetchSchedules, [userId, month]);

  const refetchMemos = () => {
    const startStr = format(calStart, "yyyy-MM-dd");
    const endStr = format(calEnd, "yyyy-MM-dd");
    getDailyMemos(userId, startStr, endStr)
      .then((memos) => setMemosByDate(Object.fromEntries(memos.map((m) => [m.date, m]))))
      .catch((err) => console.error("메모 로드 실패", err));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refetchMemos, [userId, month]);

  // AI 채팅에서 일정/task를 추가·변경했을 수도 있으니 신호가 오면 통째로 다시 불러옴
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onDataChanged(() => {
    refetchCategoriesAndTasks();
    refetchSchedules();
    refetchMemos();
  }), [userId, month]);

  useEffect(() => {
    setMemoEditing(false);
  }, [selected]);

  useEffect(() => {
    if (memoEditing) memoTextareaRef.current?.focus();
  }, [memoEditing]);

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
  const selDateStr = format(selected, "yyyy-MM-dd");
  const selMemo = memosByDate[selDateStr];

  const startEditingMemo = () => {
    setMemoDraft(selMemo?.content ?? "");
    setMemoEditing(true);
  };

  const saveMemo = async () => {
    const content = memoDraft.trim();
    if (!content) {
      setMemoEditing(false);
      return;
    }
    try {
      const saved = await saveDailyMemo(userId, selDateStr, content);
      setMemosByDate((m) => ({ ...m, [selDateStr]: saved }));
    } catch (err) {
      console.error("메모 저장 실패", err);
    } finally {
      setMemoEditing(false);
    }
  };

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
              const dateStr = format(day, "yyyy-MM-dd");
              const memo = memosByDate[dateStr];

              return (
                <button
                  key={i}
                  onClick={() => setSelected(day)}
                  onMouseMove={(e) => {
                    if (memo) setHoverMemo({ date: dateStr, x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHoverMemo((h) => (h?.date === dateStr ? null : h))}
                  className={clsx(
                    "relative flex flex-col p-2 rounded-xl text-left transition-all min-h-[76px]",
                    isSel ? "bg-accent/25 ring-1 ring-accent/40" : "hover:bg-muted/25",
                    !inMonth && "opacity-25"
                  )}
                >
                  {memo && (
                    <StickyNote
                      size={10}
                      className="absolute top-1.5 right-1.5 text-amber-500/80"
                      strokeWidth={2}
                    />
                  )}
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

      {hoverMemo && memosByDate[hoverMemo.date] && (
        <MemoHoverPreview x={hoverMemo.x} y={hoverMemo.y} content={memosByDate[hoverMemo.date].content} />
      )}

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

        {/* 메모 영역: 날짜당 1개, 빈 곳 클릭하면 입력, 저장/수정 버튼은 오른쪽 */}
        <div className="border-t border-border/20 px-3 py-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-muted-foreground/50 flex items-center gap-1">
              <StickyNote size={10} /> 메모
            </span>
            {!memoEditing && (
              <button
                onClick={startEditingMemo}
                className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <Pencil size={10} />
                {selMemo ? "수정" : "추가"}
              </button>
            )}
          </div>

          {memoEditing ? (
            <div className="space-y-1.5">
              <textarea
                ref={memoTextareaRef}
                value={memoDraft}
                onChange={(e) => setMemoDraft(e.target.value)}
                placeholder="이 날짜에 대한 메모를 남겨보세요..."
                rows={3}
                className="w-full text-[11px] leading-relaxed bg-muted/20 border border-border/30 rounded-lg px-2.5 py-2 outline-none resize-none placeholder:text-muted-foreground/30"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setMemoEditing(false)}
                  className="text-[10px] px-2 py-1 rounded-lg text-muted-foreground/50 hover:bg-muted/40 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={saveMemo}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-foreground text-background hover:opacity-85 transition-opacity"
                >
                  저장
                </button>
              </div>
            </div>
          ) : selMemo ? (
            <p
              onClick={startEditingMemo}
              className="text-[11px] leading-relaxed text-foreground/70 whitespace-pre-wrap cursor-pointer hover:text-foreground transition-colors"
            >
              {selMemo.content}
            </p>
          ) : (
            <button
              onClick={startEditingMemo}
              className="w-full text-left text-[11px] text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors py-1"
            >
              클릭해서 메모 추가...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
