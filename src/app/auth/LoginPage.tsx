// src/app/auth/LoginPage.tsx
// 아티팩트(로그인+온보딩 mockup)의 화면 구성을 앱 기존 디자인 토큰으로 옮겨온 버전.

import { loginUrl, type Provider } from "../api/auth";

const LAST_LOGIN_KEY = "sijak:last-login-provider";

export function getLastLoginProvider(): Provider | null {
  const v = localStorage.getItem(LAST_LOGIN_KEY);
  return v === "google" || v === "kakao" || v === "naver" ? v : null;
}

export function setLastLoginProvider(p: Provider) {
  localStorage.setItem(LAST_LOGIN_KEY, p);
}

const PROVIDERS: { id: Provider; label: string; badge: string; badgeClass: string }[] = [
  { id: "google", label: "Google로 계속하기", badge: "G", badgeClass: "bg-white text-[#4285F4] border border-border/40" },
  { id: "kakao", label: "카카오로 계속하기", badge: "톡", badgeClass: "bg-[#FEE500] text-[#3C1E1E]" },
  { id: "naver", label: "네이버로 계속하기", badge: "N", badgeClass: "bg-[#03C75A] text-white" },
];

export function LoginPage() {
  const lastProvider = getLastLoginProvider();

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-muted/20 p-6">
      <div className="w-full max-w-md bg-card rounded-3xl border border-border/40 shadow-xl p-8">
        <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center mb-6">
          <span className="text-xs font-bold text-background select-none">S</span>
        </div>

        <p className="text-xs text-muted-foreground/50 mb-1">좋은 오후예요</p>
        <h2 className="text-xl font-semibold text-foreground mb-1.5">오늘도 시작해볼까요?</h2>
        <p className="text-sm text-muted-foreground/60 mb-6">생각을 정리하고, 일정을 맡겨보세요.</p>

        <div className="space-y-2 mb-5">
          {PROVIDERS.map((p) => (
            <div key={p.id} className="relative">
              <button
                onClick={() => {
                  window.location.href = loginUrl(p.id);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-border/40 hover:bg-muted/30 transition-colors text-sm font-medium text-foreground"
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${p.badgeClass}`}>
                  {p.badge}
                </span>
                {p.label}
              </button>
              {lastProvider === p.id && (
                <span className="absolute -top-2 right-3 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-medium">
                  지난번 로그인
                </span>
              )}
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
          계속 진행하면 이용약관 및 개인정보 처리방침에 동의하는 것으로 간주돼요.
        </p>
      </div>
    </div>
  );
}
