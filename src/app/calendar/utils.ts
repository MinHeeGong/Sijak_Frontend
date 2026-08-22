import { DAY_START, HOUR_PX } from "./constants";
import type { Task } from "./types";

export function timeShort(h: number, m: number) {
  const hh = h % 12 || 12;
  return `${hh}:${m.toString().padStart(2, "0")}${h < 12 ? "a" : "p"}`;
}

export function hourLabel(h: number) {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export function taskTop(t: Pick<Task, "hour" | "min">) {
  return ((t.hour - DAY_START) + t.min / 60) * HOUR_PX;
}

export function taskH(t: Pick<Task, "duration">) {
  return Math.max((t.duration / 60) * HOUR_PX, 24);
}
