import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X, Send } from "lucide-react";
import { clsx } from "clsx";
import { sendChatMessage } from "../api/chat";
import type { ChatMsg } from "./types";

export function AIChatWindow({ userId }: { userId: number }) {
  const [open, setOpen] = useState(true);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { id: "0", role: "ai", text: "안녕하세요! 일정과 할일 관리를 도와드릴게요. 무엇이든 물어보세요 😊" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing]);

  const send = async () => {
    if (!input.trim() || typing) return;
    const text = input.trim();
    setMsgs((m) => [...m, { id: Date.now().toString(), role: "user", text }]);
    setInput("");
    setTyping(true);

    try {
      const { reply } = await sendChatMessage(userId, text);
      setMsgs((m) => [...m, { id: (Date.now() + 1).toString(), role: "ai", text: reply }]);
    } catch (err) {
      console.error("채팅 전송 실패", err);
      setMsgs((m) => [
        ...m,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: "죄송해요, 지금 응답을 받아오지 못했어요. 잠시 후 다시 시도해주세요.",
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

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
            className="w-72 bg-card/96 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 flex flex-col overflow-hidden"
            style={{ height: "400px" }}
          >
            <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0 border-b border-border/20 bg-gradient-to-r from-secondary/50 to-accent/20">
              <div className="w-7 h-7 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
                <MessageCircle size={12} className="text-background" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-tight">Tdi AI</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-muted-foreground/50">Online</span>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-5 h-5 flex items-center justify-center text-muted-foreground/40 hover:text-foreground/60 transition-colors"
              >
                <X size={13} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-2.5">
              {msgs.map((msg) => (
                <div key={msg.id} className={clsx("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={clsx(
                      "max-w-[88%] px-3 py-2 rounded-2xl text-xs leading-relaxed",
                      msg.role === "user"
                        ? "bg-foreground text-background rounded-br-md"
                        : "bg-secondary/70 text-foreground/80 rounded-bl-md"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="px-3 py-2.5 bg-secondary/70 rounded-2xl rounded-bl-md">
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
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="px-3 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2 bg-muted/20 border border-border/30 rounded-xl px-3 py-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                  }}
                  placeholder="일정에 대해 물어보세요..."
                  className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/30"
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
              setTimeout(() => inputRef.current?.focus(), 350);
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
