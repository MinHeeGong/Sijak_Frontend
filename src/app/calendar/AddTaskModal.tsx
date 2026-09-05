import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, MoreHorizontal, Sparkles, ArrowLeft } from "lucide-react";
import { DAY_START, DAY_END } from "./constants";
import { timeShort } from "./utils";
import { getCategories } from "../api/categories";
import type { Category } from "../api/types";

// 백엔드에 넘길 task 생성 payload. 실제 생성(POST /tasks, POST /schedules)은
// 이 payload를 받은 부모 컴포넌트가 api/tasks.ts, api/schedules.ts로 처리합니다.
export interface AddTaskPayload {
  title: string;
  category_id: number | null; // null이면 "AI 자동 분류" 의미
  start_at: string; // UTC ISO 8601
  end_at: string; // UTC ISO 8601
}

// 15분 단위 시간대 슬롯 목록 (레퍼런스 이미지의 "When?" 가로 스크롤 피커 참고)
function buildTimeSlots() {
  const slots: { hour: number; min: number }[] = [];
  for (let h = DAY_START; h < DAY_END; h++) {
    for (const m of [0, 15, 30, 45]) slots.push({ hour: h, min: m });
  }
  return slots;
}
const TIME_SLOTS = buildTimeSlots();
const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

type Step = "title" | "time";

export function AddTaskModal({
  userId,
  baseDate,
  defaultHour,
  defaultMin,
  dayOffset,
  onAdd,
  onClose,
}: {
  userId: number;
  baseDate: Date; // 지금 보고 있는 화면의 기준 날짜 (일간이면 그날, 주간이면 클릭한 날)
  defaultHour: number;
  defaultMin: number;
  dayOffset: number;
  onAdd: (payload: AddTaskPayload) => void;
  onClose: () => void;
}) {
  // ---- step 1: 제목만 ----
  const [step, setStep] = useState<Step>("title");
  const [title, setTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ---- step 2: 시간/기간/카테고리 ----
  const [hour, setHour] = useState(defaultHour);
  const [min, setMin] = useState(defaultMin);
  const [duration, setDuration] = useState(30); // 레퍼런스대로 기본 30분
  const [categoryId, setCategoryId] = useState<number | null>(null); // null = AI 자동 분류
  const [categories, setCategories] = useState<Category[]>([]);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  useEffect(() => {
    getCategories(userId)
      .then(setCategories)
      .catch(() => setCategories([])); // 실패해도 "AI 자동 분류"로 진행 가능하게
  }, [userId]);

  const endH = Math.floor(hour + (min + duration) / 60);
  const endM = (min + duration) % 60;
  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;

  // dayOffset + hour/min/duration(로컬 상대값) -> UTC ISO 절대시각으로 변환.
  function toAbsoluteRange(): { start_at: string; end_at: string } {
    const start = new Date(baseDate);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(hour, min, 0, 0);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    return { start_at: start.toISOString(), end_at: end.toISOString() };
  }

  const goToTimeStep = () => {
    if (!title.trim()) return;
    setStep("time");
  };

  const submit = () => {
    const { start_at, end_at } = toAbsoluteRange();
    onAdd({ title: title.trim(), category_id: categoryId, start_at, end_at });
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-foreground/5 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <AnimatePresence mode="wait">
        {step === "title" ? (
          // ---------------- STEP 1: 제목 입력 ----------------
          <motion.div
            key="title-step"
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className="bg-card rounded-2xl shadow-2xl border border-border/50 w-72 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">새 일정</h3>
              <button
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <X size={13} />
              </button>
            </div>

            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goToTimeStep();
                if (e.key === "Escape") onClose();
              }}
              placeholder="무엇을 해야 하나요?"
              className="w-full text-sm rounded-xl px-3 py-2.5 bg-muted/30 border border-border/40 focus:border-accent outline-none placeholder:text-muted-foreground/30 mb-3 transition-colors"
            />

            <button
              onClick={goToTimeStep}
              disabled={!title.trim()}
              className="w-full text-xs px-4 py-2.5 bg-foreground text-background rounded-xl hover:opacity-90 disabled:opacity-30 font-medium transition-opacity"
            >
              일정 추가
            </button>
          </motion.div>
        ) : (
          // ---------------- STEP 2: 시간/기간 선택 ----------------
          <motion.div
            key="time-step"
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className="bg-card rounded-2xl shadow-2xl border border-border/50 w-80 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setStep("title")}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground/50 hover:text-foreground transition-colors flex-shrink-0"
              >
                <ArrowLeft size={13} />
              </button>
              <h3 className="text-sm font-semibold truncate flex-1">{title}</h3>
              <button
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground/50 hover:text-foreground transition-colors flex-shrink-0"
              >
                <X size={13} />
              </button>
            </div>

            {/* When? - 가로 스크롤 시간대 피커 (레퍼런스: 가운데 하이라이트 슬롯) */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground/60">When?</span>
              <span className="text-[11px] font-mono text-muted-foreground/50">
                {timeShort(hour, min)} → {timeShort(Math.min(endH, 23), endH > 23 ? 59 : endM)}
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-3 pb-1 -mx-1 px-1">
              {TIME_SLOTS.map((slot) => {
                const active = slot.hour === hour && slot.min === min;
                return (
                  <button
                    key={`${slot.hour}-${slot.min}`}
                    onClick={() => {
                      setHour(slot.hour);
                      setMin(slot.min);
                    }}
                    className={clsxSlot(active)}
                  >
                    {timeShort(slot.hour, slot.min)}
                  </button>
                );
              })}
            </div>

            {/* How long? - duration 프리셋 */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground/60">How long?</span>
            </div>
            <div className="flex gap-1.5 mb-3">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={clsxDuration(duration === d)}
                >
                  {d < 60 ? `${d}m` : `${d / 60}h${d % 60 ? ` ${d % 60}m` : ""}`}
                </button>
              ))}
            </div>

            {/* 카테고리 */}
            <div className="flex items-center gap-2 mb-3">
              <select
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 text-xs rounded-xl px-2.5 py-1.5 bg-muted/30 border border-border/40 outline-none"
              >
                <option value="">✨ AI 자동 분류</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span
                className="w-5 h-5 rounded-full border border-border/30 flex items-center justify-center shrink-0"
                style={{ backgroundColor: selectedCategory?.color ?? "transparent" }}
                title={selectedCategory ? selectedCategory.name : "AI가 분류 후 색이 정해져요"}
              >
                {!selectedCategory && <Sparkles size={10} className="text-muted-foreground/40" />}
              </span>
            </div>

            {/* More: 정확한 시작 시간 + 기간(분) 세부 조정 */}
            {showMore && (
              <div className="mb-3 p-3 rounded-xl bg-muted/20 border border-border/20 space-y-2">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground/60 w-14">Start</span>
                  <input
                    type="number"
                    min={DAY_START}
                    max={DAY_END - 1}
                    value={hour}
                    onChange={(e) => setHour(+e.target.value)}
                    className="w-12 text-center bg-card rounded-lg px-1.5 py-1 border border-border/30 outline-none font-mono text-xs"
                  />
                  <span className="text-muted-foreground/40">:</span>
                  <select
                    value={min}
                    onChange={(e) => setMin(+e.target.value)}
                    className="bg-card rounded-lg px-1.5 py-1 border border-border/30 outline-none text-xs font-mono"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {m.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground/60 w-14">Duration</span>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(+e.target.value)}
                    className="bg-card rounded-lg px-2 py-1 border border-border/30 outline-none text-xs"
                  >
                    {[15, 30, 45, 60, 90, 120, 180, 240].map((d) => (
                      <option key={d} value={d}>
                        {d < 60 ? `${d}m` : `${d / 60}h${d % 60 ? ` ${d % 60}m` : ""}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowMore(!showMore)}
                className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                <MoreHorizontal size={12} />
                {showMore ? "Less" : "More..."}
              </button>
              <button
                onClick={submit}
                className="text-xs px-4 py-2 bg-foreground text-background rounded-xl hover:opacity-90 font-medium transition-opacity"
              >
                Create Task
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 매번 새 문자열 리터럴 만들지 않게 작은 헬퍼 두 개로 분리
function clsxSlot(active: boolean) {
  return [
    "flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-colors",
    active ? "bg-foreground text-background font-semibold" : "bg-muted/30 text-muted-foreground/60 hover:bg-muted/50",
  ].join(" ");
}
function clsxDuration(active: boolean) {
  return [
    "flex-1 text-center px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
    active ? "bg-foreground text-background" : "bg-muted/30 text-muted-foreground/60 hover:bg-muted/50",
  ].join(" ");
}
