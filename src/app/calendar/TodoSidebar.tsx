import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Check, Plus } from "lucide-react";
import { clsx } from "clsx";
import { getTasks, createTask, updateTask } from "../api/tasks";
import { getCategories, ensureUnclassifiedCategory } from "../api/categories";
import type { Task, Category } from "../api/types";
import { ExpiryBadge } from "../components/ExpiryBadge";

function TodoRow({
  task,
  color,
  onToggle,
}: {
  task: Task;
  color: string;
  onToggle: () => void;
}) {
  const done = task.completed_at != null;
  return (
    <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted/20 transition-colors cursor-default group">
      <button
        onClick={onToggle}
        className="w-4 h-4 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center transition-all hover:scale-110"
        style={{ borderColor: color, backgroundColor: done ? color : "transparent" }}
      >
        {done && <Check size={8} strokeWidth={3} color="white" />}
      </button>
      <span
        className={clsx(
          "text-[11px] flex-1 leading-snug transition-all",
          done ? "line-through text-muted-foreground/30" : "text-foreground/70"
        )}
      >
        {task.title}
      </span>
      {!done && <ExpiryBadge expiresAt={task.expires_at} />}
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-40" style={{ backgroundColor: color }} />
    </div>
  );
}

export function TodoSidebar({ userId }: { userId: number }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hoverBottom, setHoverBottom] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  useEffect(() => {
    getTasks(userId).then(setTasks).catch((err) => console.error("task 로드 실패", err));
    getCategories(userId).then(setCategories).catch((err) => console.error("카테고리 로드 실패", err));
  }, [userId]);

  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]));

  const toggle = async (task: Task) => {
    const nextCompletedAt = task.completed_at ? null : new Date().toISOString();
    try {
      const updated = await updateTask(task.id, { completed_at: nextCompletedAt ?? undefined });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      console.error("완료 토글 실패", err);
    }
  };

  const add = async () => {
    const title = newTitle.trim();
    setNewTitle("");
    setAdding(false);
    if (!title) return;

    try {
      // 카테고리 선택 UI가 없는 빠른 입력이라, "미분류"로 우선 담아두고
      // 나중에 AI 대화창에서 다시 분류하는 흐름을 전제로 합니다.
      let category = categories.find((c) => c.name === "미분류") ?? null;
      if (!category) {
        category = await ensureUnclassifiedCategory(userId, categories);
        setCategories((prev) => [...prev, category!]);
      }

      const task = await createTask({ user_id: userId, category_id: category.id, title });
      setTasks((prev) => [...prev, task]);
    } catch (err) {
      console.error("task 추가 실패", err);
    }
  };

  const active = tasks.filter((t) => t.completed_at == null);
  const done = tasks.filter((t) => t.completed_at != null);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-1.5 flex-shrink-0">
        <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">Tasks</p>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-3 space-y-0.5">
        {active.map((t) => (
          <TodoRow
            key={t.id}
            task={t}
            color={categoriesById[t.category_id]?.color ?? "#E8F3FB"}
            onToggle={() => toggle(t)}
          />
        ))}

        {done.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-1">
              <p className="text-[10px] text-muted-foreground/30 uppercase tracking-widest">Done</p>
            </div>
            {done.map((t) => (
              <TodoRow
                key={t.id}
                task={t}
                color={categoriesById[t.category_id]?.color ?? "#E8F3FB"}
                onToggle={() => toggle(t)}
              />
            ))}
          </>
        )}

        <div className="pt-1" onMouseEnter={() => setHoverBottom(true)} onMouseLeave={() => setHoverBottom(false)}>
          {adding ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/40 border border-border/30">
              <input
                ref={inputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") add();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setNewTitle("");
                  }
                }}
                onBlur={add}
                placeholder="New task..."
                className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/30"
              />
            </div>
          ) : (
            <motion.button
              initial={false}
              animate={{ opacity: hoverBottom || tasks.length === 0 ? 1 : 0 }}
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
