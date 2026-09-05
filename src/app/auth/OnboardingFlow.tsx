// src/app/auth/OnboardingFlow.tsx
// 아티팩트의 4단계 흐름(목적 -> 상태 신호 -> 자유메모 -> 완료)을 실제 저장까지 연결.

import { useState } from "react";
import { clsx } from "clsx";
import { saveOnboarding, skipOnboarding } from "../api/userSettings";
import type { OnboardingPurpose } from "../api/auth";

type Screen = "intro" | "step1" | "step2" | "step3" | "complete";

const PURPOSE_OPTIONS: { value: OnboardingPurpose; label: string }[] = [
  { value: "project_mgmt", label: "프로젝트 관리" },
  { value: "simple_schedule", label: "단순 일정관리" },
  { value: "priority_mgmt", label: "우선순위 정리" },
  { value: "low_activation", label: "시작하는 것부터 힘들 때" },
];

const YN_QUESTIONS: { key: "planning_type" | "burnout_signal" | "adhd_signal"; text: string }[] = [
  { key: "planning_type", text: "계획을 세우면 웬만하면 지키는 편이에요" },
  { key: "burnout_signal", text: "요즘 하루를 시작하는 게 유독 힘들게 느껴져요" },
  { key: "adhd_signal", text: "할 일이 많아지면 오히려 손을 못 대는 편이에요" },
];

function ProgressDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1.5 mb-4">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={clsx(
            "h-1 flex-1 rounded-full transition-colors",
            n <= step ? "bg-foreground" : "bg-muted/40"
          )}
        />
      ))}
    </div>
  );
}

export function OnboardingFlow({ userId, onDone }: { userId: number; onDone: () => void }) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [purpose, setPurpose] = useState<OnboardingPurpose | null>(null);
  const [answers, setAnswers] = useState<Record<string, 0 | 1>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const step2Complete = YN_QUESTIONS.every((q) => answers[q.key] !== undefined);

  const finish = async () => {
    setSaving(true);
    try {
      await saveOnboarding(userId, {
        purpose: purpose ?? undefined,
        planning_type: answers.planning_type,
        burnout_signal: answers.burnout_signal,
        adhd_signal: answers.adhd_signal,
        onboarding_notes: notes.trim() || undefined,
      });
    } catch (err) {
      console.error("온보딩 저장 실패", err);
    } finally {
      setSaving(false);
      setScreen("complete");
    }
  };

  const skip = async () => {
    setSaving(true);
    try {
      await skipOnboarding(userId);
    } catch (err) {
      console.error("온보딩 스킵 처리 실패", err);
    } finally {
      onDone();
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-muted/20 p-6">
      <div className="w-full max-w-md bg-card rounded-3xl border border-border/40 shadow-xl p-8">
        {screen === "intro" && (
          <>
            <p className="text-xs text-muted-foreground/50 mb-1">시작하기 전에</p>
            <h2 className="text-xl font-semibold mb-1.5">몇 가지만 여쭤볼게요</h2>
            <p className="text-sm text-muted-foreground/60 mb-6">
              1분이면 충분해요. 답변에 맞춰 시작이 사용자님께 맞게 움직여요. 나중에 설정에서 언제든 바꿀 수 있어요.
            </p>
            <button
              onClick={() => setScreen("step1")}
              className="w-full py-3 rounded-2xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity mb-3"
            >
              시작하기
            </button>
            <button onClick={skip} className="w-full text-center text-xs text-muted-foreground/50 hover:text-foreground transition-colors">
              건너뛰고 바로 시작하기
            </button>
          </>
        )}

        {screen === "step1" && (
          <>
            <ProgressDots step={1} />
            <h2 className="text-xl font-semibold mb-1.5">어떤 걸 도와드릴까요?</h2>
            <p className="text-sm text-muted-foreground/60 mb-5">가장 가까운 걸 하나 골라주세요.</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {PURPOSE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPurpose(opt.value)}
                  className={clsx(
                    "px-3 py-3 rounded-2xl text-xs font-medium text-center leading-snug transition-colors border",
                    purpose === opt.value
                      ? "bg-foreground text-background border-foreground"
                      : "bg-muted/20 border-border/40 hover:bg-muted/40 text-foreground/80"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setScreen("intro")} className="px-4 py-2.5 rounded-xl text-xs text-muted-foreground/60 hover:bg-muted/30 transition-colors">
                이전
              </button>
              <button
                onClick={() => setScreen("step2")}
                disabled={!purpose}
                className="flex-1 py-2.5 rounded-xl bg-foreground text-background text-xs font-medium disabled:opacity-30 hover:opacity-90 transition-opacity"
              >
                다음
              </button>
            </div>
          </>
        )}

        {screen === "step2" && (
          <>
            <ProgressDots step={2} />
            <h2 className="text-xl font-semibold mb-1.5">요즘 어떠신가요?</h2>
            <p className="text-sm text-muted-foreground/60 mb-5">그냥 편하게 답해주세요, 정답은 없어요.</p>
            <div className="space-y-4 mb-6">
              {YN_QUESTIONS.map((q) => (
                <div key={q.key} className="flex items-center justify-between gap-3">
                  <p className="text-xs text-foreground/80 leading-snug flex-1">{q.text}</p>
                  <div className="flex gap-1 flex-shrink-0 p-0.5 rounded-full bg-muted/30">
                    {([1, 0] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setAnswers((a) => ({ ...a, [q.key]: v }))}
                        className={clsx(
                          "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors",
                          answers[q.key] === v ? "bg-foreground text-background" : "text-muted-foreground/50"
                        )}
                      >
                        {v === 1 ? "예" : "아니오"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setScreen("step1")} className="px-4 py-2.5 rounded-xl text-xs text-muted-foreground/60 hover:bg-muted/30 transition-colors">
                이전
              </button>
              <button
                onClick={() => setScreen("step3")}
                disabled={!step2Complete}
                className="flex-1 py-2.5 rounded-xl bg-foreground text-background text-xs font-medium disabled:opacity-30 hover:opacity-90 transition-opacity"
              >
                다음
              </button>
            </div>
          </>
        )}

        {screen === "step3" && (
          <>
            <ProgressDots step={3} />
            <h2 className="text-xl font-semibold mb-1.5">참고할 만한 게 있다면 알려주세요</h2>
            <p className="text-sm text-muted-foreground/60 mb-4">
              시간계획을 짤 때 고려했으면 하는 상황이나 고민을 편하게 적어주세요.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="예: 오전엔 집중이 잘 안 돼요 / 저녁엔 육아 때문에 시간을 비워둬야 해요"
              rows={4}
              className="w-full text-xs rounded-2xl px-3.5 py-3 bg-muted/20 border border-border/40 outline-none resize-none placeholder:text-muted-foreground/30 mb-2"
            />
            <p className="text-[10px] text-muted-foreground/40 mb-6">선택 항목이에요. 나중에 설정에서 다시 고쳐 쓸 수 있어요.</p>
            <div className="flex gap-2">
              <button onClick={() => setScreen("step2")} className="px-4 py-2.5 rounded-xl text-xs text-muted-foreground/60 hover:bg-muted/30 transition-colors">
                이전
              </button>
              <button
                onClick={finish}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-foreground text-background text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {saving ? "저장하는 중..." : "완료"}
              </button>
            </div>
          </>
        )}

        {screen === "complete" && (
          <div className="text-center py-4">
            <div className="text-4xl mb-4">🌱</div>
            <h2 className="text-xl font-semibold mb-1.5">준비됐어요</h2>
            <p className="text-sm text-muted-foreground/60 mb-6">이제 오늘 할 일을 편하게 이야기해주세요.</p>
            <button
              onClick={onDone}
              className="w-full py-3 rounded-2xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
            >
              할 일 정리하러 가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
