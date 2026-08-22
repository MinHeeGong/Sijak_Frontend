import { useState } from "react";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, differenceInCalendarDays,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { ResizeHandle } from "./ResizeHandle";
import { useDragResize } from "./useDragResize";
import { C, TODAY } from "./constants";
import { timeShort } from "./utils";
import type { Task } from "./types";

const MIN_DETAIL_W = 176;
const MAX_DETAIL_W = 360;

export function MonthlyCalendar({ tasks }: { tasks: Task[] }) {
  const [month, setMonth] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [selected, setSelected] = useState(TODAY);
  const [detailW, setDetailW] = useState(208);

  const startResize = useDragResize(deltaX => {
    setDetailW(w => Math.max(MIN_DETAIL_W, Math.min(MAX_DETAIL_W, w - deltaX)));
  });

  const calStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const calEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const getDayTasks = (day: Date) => {
    const offset = differenceInCalendarDays(day, TODAY);
    return tasks.filter(t => t.dayOffset === offset);
  };

  const selTasks = getDayTasks(selected);

  return (
    <div className="h-full flex">
      {/* Calendar */}
      <div className="flex-1 min-w-0 bg-card rounded-2xl border border-border/40 overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold">{format(month, "MMMM yyyy")}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-muted/50 text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => setMonth(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))}
              className="text-xs px-2.5 py-1 rounded-xl text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-muted/50 text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 px-4 pt-3 flex-shrink-0">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
            <div key={d} className="text-[10px] font-medium text-muted-foreground/40 text-center uppercase tracking-wider py-1">{d}</div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-3">
          <div className="grid grid-cols-7 gap-1">
            {calDays.map((day, i) => {
              const inMonth = day.getMonth() === month.getMonth();
              const isSel = isSameDay(day, selected);
              const isTod = isToday(day);
              const dayTasks = getDayTasks(day);

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
                  <span className={clsx(
                    "w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium mb-1 flex-shrink-0",
                    isTod ? "bg-foreground text-background" : "text-foreground/65"
                  )}>
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5 w-full">
                    {dayTasks.slice(0, 2).map(t => (
                      <div
                        key={t.id}
                        className="px-1.5 py-0.5 rounded text-[9px] leading-tight truncate"
                        style={{ backgroundColor: C[t.color].pill, color: C[t.color].text }}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <span className="text-[9px] text-muted-foreground/40 px-1">+{dayTasks.length - 2}</span>
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
          {selTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground/30 text-center mt-6">No tasks</p>
          ) : (
            selTasks.map(task => {
              const col = C[task.color];
              return (
                <div key={task.id} className="rounded-xl px-3 py-2.5" style={{ backgroundColor: col.pill }}>
                  <p className="text-xs font-medium" style={{ color: col.text }}>{task.title}</p>
                  <p className="text-[10px] mt-0.5 font-mono opacity-55" style={{ color: col.text }}>
                    {timeShort(task.hour, task.min)} · {task.duration}m
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
