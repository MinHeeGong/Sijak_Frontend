import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X, Send } from "lucide-react";
import { clsx } from "clsx";
import { sendChatMessage } from "../api/chat";
import { getUserSettings, updateAssignmentMode } from "../api/userSettings";
import { emitDataChanged } from "../lib/dataEvents";
import type { ChatMsg } from "./types";
import type { AssignmentMode } from "../api/types";

const DEFAULT_WIDTH = 512;
const DEFAULT_HEIGHT = 510;
const WIDTH_MIN = 340;
const WIDTH_MAX = 800;
const HEIGHT_MIN = 420;
const HEIGHT_MAX = 900;

const TEXTAREA_MIN_HEIGHT = 36; // 1줄
const TEXTAREA_MAX_HEIGHT = 96; // 대략 3~4줄, 이 이상은 스크롤

// 실제 백엔드가 어느 단계인지(도구 호출 몇 번째 등) 스트리밍으로 알려주는 구조가
// 아직 없어서(POST 한 번에 최종 응답만 옴), 완전히 정확한 진행 상황은 아니고
// "지금 이 정도 하고 있을 것"이라는 추정 문구를 순환 표시함.
// -> 진짜 단계별 상태를 보여주려면 백엔드에 SSE/스트리밍 도입이 필요 (다음 단계로 미룸).
const LOADING_PHRASES = [
  "메시지를 읽는 중...",
  "일정을 확인하는 중...",
  "우선순위를 정리하는 중...",
  "답변을 작성하는 중...",
];

// 세로 드래그(위쪽 모서리)로 높이 조절. useDragResize는 가로(deltaX)만 지원해서
// 이 컴포넌트 안에서 직접 구현.
function useVerticalDragResize(onDeltaY: (deltaY: number) => void) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    let lastY = e.clientY;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - lastY;
      lastY = ev.clientY;
      onDeltaY(delta);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
}

function useHorizontalDragResize(onDeltaX: (deltaX: number) => void) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    let lastX = e.clientX;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - lastX;
      lastX = ev.clientX;
      onDeltaX(delta);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
}

interface AIChatWindowProps {
  userId: number;
  // "floating": 데스크탑용 - 화면 우하단에 떠있는 리사이즈 가능한 패널 (기본값)
  // "docked": 모바일용 - 하단 탭에 끼워넣는 전체화면 채팅 (리사이즈/열기닫기 없음)
  variant?: "floating" | "docked";
}

export function AIChatWindow({ userId, variant = "floating" }: AIChatWindowProps) {
  const [open, setOpen] = useState(true);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { id: "0", role: "ai", text: "안녕하세요! 일정과 할일 관리를 도와드릴게요. 무엇이든 물어보세요 😊" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [loadingPhraseIdx, setLoadingPhraseIdx] = useState(0);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>("ask");

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getUserSettings(userId)
      .then((s) => setAssignmentMode(s.assignment_mode))
      .catch((err) => console.error("user_settings 로드 실패", err));
  }, [userId]);

  const toggleAssignmentMode = () => {
    const next: AssignmentMode = assignmentMode === "auto" ? "ask" : "auto";
    setAssignmentMode(next); // 낙관적 업데이트
    updateAssignmentMode(userId, next).catch((err) => {
      console.error("assignment_mode 저장 실패", err);
      setAssignmentMode(assignmentMode); // 실패하면 롤백
    });
  };

  // 로딩 문구를 일정 주기로 순환
  useEffect(() => {
    if (!typing) {
      setLoadingPhraseIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingPhraseIdx((i) => (i + 1) % LOADING_PHRASES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [typing]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing]);

  // 입력창 자동 확장: 2~3줄까지는 늘어나고, 그 이상은 내부 스크롤
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, TEXTAREA_MIN_HEIGHT), TEXTAREA_MAX_HEIGHT)}px`;
  }, [input]);

  const startWidthResize = useHorizontalDragResize((deltaX) => {
    setWidth((w) => Math.max(WIDTH_MIN, Math.min(WIDTH_MAX, w - deltaX)));
  });
  const startHeightResize = useVerticalDragResize((deltaY) => {
    setHeight((h) => Math.max(HEIGHT_MIN, Math.min(HEIGHT_MAX, h - deltaY)));
  });

  const sendText = async (text: string) => {
    if (!text.trim() || typing) return;
    setMsgs((m) => [...m, { id: Date.now().toString(), role: "user", text }]);
    setTyping(true);

    try {
      const { reply, choices } = await sendChatMessage(userId, text);
      setMsgs((m) => [...m, { id: (Date.now() + 1).toString(), role: "ai", text: reply, choices }]);
      // AI가 schedule_task/add_task 등을 호출했을 수 있으니, 다른 화면(일간/주간/월간/카테고리)에
      // "혹시 모르니 다시 불러와" 신호를 보냄. 매번 쏴도 그냥 GET 몇 번 더 도는 정도라 무해함.
      emitDataChanged();
    } catch (err) {
      console.error("채팅 전송 실패", err);
      const detail = err instanceof Error ? err.message : "알 수 없는 오류";
      setMsgs((m) => [
        ...m,
        { id: (Date.now() + 1).toString(), role: "ai", text: `⚠️ 응답 실패: ${detail}` },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendText(text);
  };

  // 선택 버튼 클릭: 그 문구를 그대로 다음 유저 메시지로 보냄 (백엔드 입장에선 일반 대화 turn).
  // 누른 메시지의 choices는 지워서 버튼이 계속 남아있지 않게 함.
  const pickChoice = (msgId: string, choice: string) => {
    setMsgs((m) => m.map((msg) => (msg.id === msgId ? { ...msg, choices: undefined } : msg)));
    sendText(choice);
  };

  const AssignmentToggle = (
    <button
      onClick={toggleAssignmentMode}
      title={assignmentMode === "auto" ? "자동 배치 중 (클릭하면 확인 모드로)" : "확인 후 배치 중 (클릭하면 자동 모드로)"}
      className="flex items-center gap-0.5 p-0.5 rounded-full bg-muted/40 flex-shrink-0"
    >
      <span
        className={clsx(
          "px-2 py-1 rounded-full text-[9px] font-medium transition-colors",
          assignmentMode === "auto" ? "bg-foreground text-background" : "text-muted-foreground/50"
        )}
      >
        Auto
      </span>
      <span
        className={clsx(
          "px-2 py-1 rounded-full text-[9px] font-medium transition-colors",
          assignmentMode === "ask" ? "bg-foreground text-background" : "text-muted-foreground/50"
        )}
      >
        Ask
      </span>
    </button>
  );

  const panelInner = (
    <>
      <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0 border-b border-border/20 bg-gradient-to-r from-secondary/50 to-accent/20">
        <div className="w-7 h-7 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
          <MessageCircle size={12} className="text-background" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-tight">Sijak AI</p>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-muted-foreground/50">Online</span>
          </div>
        </div>
        {AssignmentToggle}
        {variant === "floating" && (
          <button
            onClick={() => setOpen(false)}
            className="w-5 h-5 flex items-center justify-center text-muted-foreground/40 hover:text-foreground/60 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-2.5">
        {msgs.map((msg) => (
          <div key={msg.id} className={clsx("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
            <div
              className={clsx(
                "max-w-[88%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words",
                msg.role === "user"
                  ? "bg-foreground text-background rounded-br-md"
                  : "bg-secondary/70 text-foreground/80 rounded-bl-md"
              )}
            >
              {msg.text}
            </div>
            {msg.choices && msg.choices.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[88%]">
                {msg.choices.map((choice) => (
                  <button
                    key={choice}
                    onClick={() => pickChoice(msg.id, choice)}
                    disabled={typing}
                    className="text-[11px] px-2.5 py-1.5 rounded-xl border border-border/40 bg-card hover:bg-accent/20 hover:border-accent/50 transition-colors disabled:opacity-40"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="px-3 py-2.5 bg-secondary/70 rounded-2xl rounded-bl-md flex items-center gap-2">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"
                    animate={{ y: ["0px", "-4px", "0px"] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground/50">{LOADING_PHRASES[loadingPhraseIdx]}</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="px-3 pb-3 flex-shrink-0">
        <div className="flex items-end gap-2 bg-muted/20 border border-border/30 rounded-xl px-3 py-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="일정에 대해 물어보세요... (Shift+Enter로 줄바꿈)"
            className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/30 resize-none leading-relaxed"
            style={{ minHeight: TEXTAREA_MIN_HEIGHT, maxHeight: TEXTAREA_MAX_HEIGHT }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || typing}
            className="w-6 h-6 rounded-lg bg-foreground text-background flex items-center justify-center hover:opacity-80 disabled:opacity-25 transition-opacity flex-shrink-0"
          >
            <Send size={10} />
          </button>
        </div>
      </div>
    </>
  );

  if (variant === "docked") {
    // 모바일 하단 탭용 - 리사이즈/열기닫기 없이 부모 컨테이너를 꽉 채움
    return (
      <div className="h-full w-full bg-card rounded-2xl border border-border/40 flex flex-col overflow-hidden">
        {panelInner}
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            className="relative bg-card/96 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 flex flex-col overflow-hidden"
            style={{ width: `${width}px`, height: `${height}px` }}
          >
            {/* 리사이즈 핸들: 왼쪽 모서리(너비), 위쪽 모서리(높이) */}
            <div
              onMouseDown={startWidthResize}
              className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 group"
            >
              <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors" />
            </div>
            <div
              onMouseDown={startHeightResize}
              className="absolute top-0 left-0 right-0 h-2 cursor-row-resize z-10 group"
            >
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors" />
            </div>

            {panelInner}
          </motion.div>
        ) : (
          <motion.button
            key="pill"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            onClick={() => {
              setOpen(true);
              setTimeout(() => textareaRef.current?.focus(), 350);
            }}
            className="flex items-center gap-2.5 bg-foreground text-background px-4 py-2.5 rounded-2xl shadow-xl hover:opacity-90 transition-opacity"
          >
            <MessageCircle size={14} />
            <span className="text-xs font-medium">AI와 대화하기</span>
            <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
              <span className="text-[9px] font-bold text-foreground/70">
                {msgs.filter((m) => m.role === "ai").length}
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
