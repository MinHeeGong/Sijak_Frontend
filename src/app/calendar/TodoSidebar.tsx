import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Check, Plus } from "lucide-react";
import { clsx } from "clsx";
import { C, COLOR_KEYS } from "./constants";
import type { Todo } from "./types";

function TodoRow({ todo, onToggle }: { todo: Todo; onToggle: () => void }) {
  const col = C[todo.color];
  return (
    <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted/20 transition-colors cursor-default group">
      <button
        onClick={onToggle}
        className="w-4 h-4 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center transition-all hover:scale-110"
        style={{ borderColor: col.dot, backgroundColor: todo.done ? col.dot : "transparent" }}
      >
        {todo.done && <Check size={8} strokeWidth={3} color="white" />}
      </button>
      <span className={clsx(
        "text-[11px] flex-1 leading-snug transition-all",
        todo.done ? "line-through text-muted-foreground/30" : "text-foreground/70"
      )}>
        {todo.title}
      </span>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-40" style={{ backgroundColor: col.dot }} />
    </div>
  );
}

export function TodoSidebar({
  todos, setTodos,
}: {
  todos: Todo[];
  setTodos: (fn: (p: Todo[]) => Todo[]) => void;
}) {
  const [hoverBottom, setHoverBottom] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const toggle = (id: string) => setTodos(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const add = () => {
    if (newTitle.trim()) {
      setTodos(p => [...p, {
        id: Date.now().toString(),
        title: newTitle.trim(),
        done: false,
        color: COLOR_KEYS[p.length % COLOR_KEYS.length],
      }]);
    }
    setNewTitle("");
    setAdding(false);
  };

  const active = todos.filter(t => !t.done);
  const done = todos.filter(t => t.done);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-1.5 flex-shrink-0">
        <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">Tasks</p>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-3 space-y-0.5">
        {active.map(t => <TodoRow key={t.id} todo={t} onToggle={() => toggle(t.id)} />)}

        {done.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-1">
              <p className="text-[10px] text-muted-foreground/30 uppercase tracking-widest">Done</p>
            </div>
            {done.map(t => <TodoRow key={t.id} todo={t} onToggle={() => toggle(t.id)} />)}
          </>
        )}

        <div
          className="pt-1"
          onMouseEnter={() => setHoverBottom(true)}
          onMouseLeave={() => setHoverBottom(false)}
        >
          {adding ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/40 border border-border/30">
              <input
                ref={inputRef}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") add(); if (e.key === "Escape") { setAdding(false); setNewTitle(""); } }}
                onBlur={add}
                placeholder="New task..."
                className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/30"
              />
            </div>
          ) : (
            <motion.button
              initial={false}
              animate={{ opacity: hoverBottom || todos.length === 0 ? 1 : 0 }}
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground/40 hover:text-muted-foreground rounded-xl hover:bg-muted/20 transition-colors"
            >
              <Plus size={12} />
              New task
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
