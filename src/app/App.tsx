import { useState } from "react";
import {
  ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, Target,
} from "lucide-react";
import { clsx } from "clsx";
import { format, addDays, isToday } from "date-fns";

import { DailyTimeline } from "./calendar/DailyTimeline";
import { WeeklyGrid } from "./calendar/WeeklyGrid";
import { MonthlyCalendar } from "./calendar/MonthlyCalendar";
import { PriorityMatrix } from "./calendar/PriorityMatrix";
import { AIChatWindow } from "./calendar/AIChatWindow";
import { TodoSidebar } from "./calendar/TodoSidebar";
import { ResizeHandle } from "./calendar/ResizeHandle";
import { useDragResize } from "./calendar/useDragResize";
import { TODAY, SEED_TASKS, SEED_TODOS } from "./calendar/constants";
import type { Task, Todo } from "./calendar/types";

type Tab = "schedule" | "monthly" | "priority";

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 400;
const DAILY_MIN = 320;
const DAILY_MAX = 640;

export default function App() {
  const [tab, setTab] = useState<Tab>("schedule");
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [todos, setTodos] = useState<Todo[]>(SEED_TODOS);
  const [sidebarW, setSidebarW] = useState(252);
  const [dailyW, setDailyW] = useState(420);
  const [selectedDate, setSelectedDate] = useState(TODAY);

  const startSidebarResize = useDragResize(deltaX => {
    setSidebarW(w => Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, w + deltaX)));
  });
  const startDailyResize = useDragResize(deltaX => {
    setDailyW(w => Math.max(DAILY_MIN, Math.min(DAILY_MAX, w + deltaX)));
  });

  const TABS: { id: Tab; label: string; Icon: React.FC<{ size?: number }> }[] = [
    { id: "schedule", label: "Schedule", Icon: CalendarDays },
    { id: "monthly",  label: "Monthly",  Icon: LayoutGrid },
    { id: "priority", label: "Priority", Icon: Target },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* ── Sidebar ── */}
      <div
        className="flex-shrink-0 h-full flex flex-col bg-card"
        style={{ width: `${sidebarW}px` }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border/25 flex-shrink-0">
          <div className="w-8 h-8 rounded-[10px] bg-foreground flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[11px] font-bold text-background tracking-tight leading-none select-none">T</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground tracking-tight">Tdi</span>
            <span className="text-sm font-light text-muted-foreground/60">.ai</span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <TodoSidebar todos={todos} setTodos={setTodos} />
        </div>
      </div>

      <ResizeHandle onMouseDown={startSidebarResize} className="border-r border-border/40" />

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex-shrink-0 flex items-center px-5 gap-4 bg-card/80 backdrop-blur-sm border-b border-border/30">
          <nav className="flex items-center gap-1">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                  tab === id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </nav>

          {tab === "schedule" && (
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setSelectedDate(d => addDays(d, -1))}
                className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-muted/50 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() => setSelectedDate(TODAY)}
                className="text-xs font-mono text-muted-foreground/60 hover:text-foreground px-2 py-1 rounded-xl hover:bg-muted/50 transition-colors min-w-[56px] text-center"
              >
                {isToday(selectedDate) ? "Today" : format(selectedDate, "MMM d")}
              </button>
              <button
                onClick={() => setSelectedDate(d => addDays(d, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-muted/50 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </header>

        {/* Tab content */}
        <main className="flex-1 overflow-hidden p-4">
          {tab === "schedule" && (
            <div className="h-full flex">
              <div style={{ width: `${dailyW}px` }} className="flex-shrink-0 h-full">
                <DailyTimeline tasks={tasks} setTasks={setTasks} date={selectedDate} onChangeDate={setSelectedDate} />
              </div>
              <ResizeHandle onMouseDown={startDailyResize} />
              <div className="flex-1 min-w-0 h-full">
                <WeeklyGrid tasks={tasks} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
              </div>
            </div>
          )}
          {tab === "monthly" && <MonthlyCalendar tasks={tasks} />}
          {tab === "priority" && <PriorityMatrix tasks={tasks} setTasks={setTasks} />}
        </main>
      </div>

      {/* ── Floating AI Chat ── */}
      <AIChatWindow />
    </div>
  );
}
