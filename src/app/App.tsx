import { useState, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, Target, FolderTree, MessageCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { format, addDays, isToday } from "date-fns";

import { DailyTimeline } from "./calendar/DailyTimeline";
import { WeeklyGrid } from "./calendar/WeeklyGrid";
import { MonthlyCalendar } from "./calendar/MonthlyCalendar";
import { PriorityMatrix } from "./calendar/PriorityMatrix";
import { AIChatWindow } from "./calendar/AIChatWindow";
import { TodoSidebar } from "./calendar/TodoSidebar";
import { CategoryView } from "./category/CategoryView";
import { ResizeHandle } from "./calendar/ResizeHandle";
import { useDragResize } from "./calendar/useDragResize";
import { useIsMobile } from "./components/ui/use-mobile";
import { TODAY } from "./calendar/constants";
import { getMe, type AuthUser } from "./api/auth";
import { LoginPage, setLastLoginProvider } from "./auth/LoginPage";
import { OnboardingFlow } from "./auth/OnboardingFlow";

type Tab = "schedule" | "monthly" | "priority" | "category" | "chat";

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 400;
const DAILY_MIN = 320;
const DAILY_MAX = 640;

// 실제 앱 화면 전체 - 로그인 완료 + 온보딩 완료 후에만 렌더링됨 (아래 App()이 그 게이트 역할)
function AppShell({ userId }: { userId: number }) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>("schedule");
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
    { id: "category", label: "Category", Icon: FolderTree },
  ];

  // 모바일 하단 네비게이션: 데스크탑 탭 그대로 + AI 대화가 5번째 탭으로 추가됨
  // (데스크탑에선 AI가 우하단에 항상 떠있는 위젯이지만, 좁은 화면에선 그 방식이
  //  안 맞아서 탭 하나를 통째로 차지하는 방식으로 바뀜)
  const MOBILE_TABS = [...TABS, { id: "chat" as Tab, label: "AI", Icon: MessageCircle }];

  if (isMobile) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        {/* 모바일 상단바: 로고 + (일정 탭일 때만) 날짜 네비게이터 */}
        <header className="h-12 flex-shrink-0 flex items-center px-4 gap-3 bg-card/80 backdrop-blur-sm border-b border-border/30">
          <div className="w-6 h-6 rounded-lg bg-foreground flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-bold text-background leading-none select-none">S</span>
          </div>
          <span className="text-xs font-semibold">Sijak</span>
          {tab === "schedule" && (
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setSelectedDate(d => addDays(d, -1))}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground/50"
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={() => setSelectedDate(TODAY)}
                className="text-[10px] font-mono text-muted-foreground/60 px-1.5"
              >
                {isToday(selectedDate) ? "Today" : format(selectedDate, "MMM d")}
              </button>
              <button
                onClick={() => setSelectedDate(d => addDays(d, 1))}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground/50"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </header>

        {/* 탭 콘텐츠 */}
        <main className="flex-1 overflow-hidden p-2.5">
          {tab === "schedule" && (
            // 데스크탑은 일간/주간을 좌우로 나란히 두지만, 좁은 화면에선 위아래로 쌓아서
            // 각각 세로 스크롤하도록 함 (일간 먼저, 그 아래 주간).
            <div className="h-full flex flex-col gap-2.5 overflow-y-auto">
              <div className="h-[70vh] flex-shrink-0">
                <DailyTimeline userId={userId} date={selectedDate} onChangeDate={setSelectedDate} />
              </div>
              <div className="h-[70vh] flex-shrink-0">
                <WeeklyGrid userId={userId} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
              </div>
            </div>
          )}
          {tab === "monthly" && <MonthlyCalendar userId={userId} />}
          {tab === "priority" && <PriorityMatrix userId={userId} />}
          {tab === "category" && <CategoryView userId={userId} />}
          {tab === "chat" && <AIChatWindow userId={userId} variant="docked" />}
        </main>

        {/* 하단 네비게이션 */}
        <nav className="flex-shrink-0 flex items-stretch border-t border-border/30 bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
          {MOBILE_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
                tab === id ? "text-foreground" : "text-muted-foreground/50"
              )}
            >
              <Icon size={16} />
              <span className="text-[9px] font-medium">{label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }


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
            <span className="text-[11px] font-bold text-background tracking-tight leading-none select-none">S</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground tracking-tight">Sijak</span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <TodoSidebar userId={userId} />
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
                <DailyTimeline userId={userId} date={selectedDate} onChangeDate={setSelectedDate} />
              </div>
              <ResizeHandle onMouseDown={startDailyResize} />
              <div className="flex-1 min-w-0 h-full">
                <WeeklyGrid userId={userId} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
              </div>
            </div>
          )}
          {tab === "monthly" && <MonthlyCalendar userId={userId} />}
          {tab === "priority" && <PriorityMatrix userId={userId} />}
          {tab === "category" && <CategoryView userId={userId} />}
        </main>
      </div>

      {/* ── Floating AI Chat ── */}
      <AIChatWindow userId={userId} />
    </div>
  );
}

// ── 인증 게이트: 로딩 -> (미로그인) 로그인 페이지 -> (온보딩 미완료) 온보딩 -> 본 앱 ──
type GateState =
  | { status: "loading" }
  | { status: "loggedOut" }
  | { status: "onboarding"; user: AuthUser }
  | { status: "ready"; user: AuthUser };

export default function App() {
  const [gate, setGate] = useState<GateState>({ status: "loading" });

  useEffect(() => {
    // OAuth 콜백이 성공하면 백엔드가 ?login_provider=xxx를 붙여서 리다이렉트해줌.
    // 여기서 읽어서 "지난번 로그인 방식" 배지용으로 저장하고 주소창에서는 지워버림.
    const params = new URLSearchParams(window.location.search);
    const provider = params.get("login_provider");
    if (provider === "google" || provider === "kakao" || provider === "naver") {
      setLastLoginProvider(provider);
      window.history.replaceState({}, "", window.location.pathname);
    }

    getMe()
      .then((res) => {
        if (!res) {
          setGate({ status: "loggedOut" });
        } else if (!res.settings.onboarding_completed) {
          setGate({ status: "onboarding", user: res.user });
        } else {
          setGate({ status: "ready", user: res.user });
        }
      })
      .catch((err) => {
        console.error("/auth/me 확인 실패", err);
        setGate({ status: "loggedOut" });
      });
  }, []);

  if (gate.status === "loading") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-muted/20">
        <div className="w-6 h-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    );
  }

  if (gate.status === "loggedOut") return <LoginPage />;

  if (gate.status === "onboarding") {
    return (
      <OnboardingFlow
        userId={gate.user.id}
        onDone={() => setGate({ status: "ready", user: gate.user })}
      />
    );
  }

  return <AppShell userId={gate.user.id} />;
}
