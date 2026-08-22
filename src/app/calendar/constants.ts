import { startOfToday } from "date-fns";
import type { Color, Task, Todo } from "./types";

export const TODAY = startOfToday();
export const HOUR_PX = 58;
export const DAY_START = 7;
export const DAY_END = 22;
export const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);
export const COLOR_KEYS: Color[] = ["sky", "teal", "violet", "amber", "rose", "mint"];

export const C: Record<Color, { bg: string; pill: string; text: string; dot: string }> = {
  sky:    { bg: "#EBF6FF", pill: "#D5F1FF", text: "#1a6080", dot: "#74C5F5" },
  teal:   { bg: "#E6F8F5", pill: "#CBF0EA", text: "#0d5c52", dot: "#5DC8BC" },
  violet: { bg: "#F2EDFC", pill: "#E4DCFC", text: "#4a33a0", dot: "#A894EE" },
  amber:  { bg: "#FEF8ED", pill: "#FDF0DC", text: "#8a5a10", dot: "#EDBB5C" },
  rose:   { bg: "#FEF0F4", pill: "#FDDFEB", text: "#921d4e", dot: "#EE88B4" },
  mint:   { bg: "#EDFAF4", pill: "#CCFAE4", text: "#0d5c3a", dot: "#5DC8A0" },
};

export const AI_REPLIES = [
  "오늘 오후 2-4시에 딥워크 블록을 추가하는 게 좋을 것 같아요. 추가해드릴까요?",
  "현재 긴급+중요 항목이 3개 있어요. 오전에 먼저 처리하는 것을 추천해요.",
  "이번 주 수요일 오전에 여유가 있어요. 'Write release notes'를 거기로 이동할까요?",
  "알겠습니다! 일정을 최적화했어요. 다른 것도 도와드릴게요.",
  "내일 연속 미팅 2개가 있어요. 각 미팅 전 15분 준비 시간을 잡아드릴까요?",
  "Task들을 분석해봤어요. Q1 항목부터 처리하면 오늘 생산성이 크게 올라갈 것 같아요.",
];

export const SEED_TASKS: Task[] = [
  { id: "1",  title: "Morning standup",       done: false, color: "sky",    hour: 9,  min: 0,  duration: 30,  dayOffset: 0,  urgency: 78, importance: 72 },
  { id: "2",  title: "Product design review", done: false, color: "violet", hour: 10, min: 30, duration: 90,  dayOffset: 0,  urgency: 62, importance: 88 },
  { id: "3",  title: "Lunch",                 done: false, color: "mint",   hour: 12, min: 30, duration: 60,  dayOffset: 0,  urgency: 45, importance: 32 },
  { id: "4",  title: "Dev sync",              done: false, color: "teal",   hour: 14, min: 0,  duration: 60,  dayOffset: 0,  urgency: 68, importance: 68 },
  { id: "5",  title: "Write release notes",   done: false, color: "amber",  hour: 15, min: 30, duration: 75,  dayOffset: 0,  urgency: 25, importance: 82 },
  { id: "6",  title: "Team retro",            done: false, color: "rose",   hour: 17, min: 0,  duration: 60,  dayOffset: 0,  urgency: 58, importance: 62 },
  { id: "7",  title: "Client call",           done: false, color: "sky",    hour: 10, min: 0,  duration: 45,  dayOffset: 1,  urgency: 88, importance: 85 },
  { id: "8",  title: "Sprint planning",       done: false, color: "violet", hour: 13, min: 0,  duration: 120, dayOffset: 1,  urgency: 72, importance: 90 },
  { id: "9",  title: "1:1 with manager",      done: false, color: "teal",   hour: 11, min: 0,  duration: 30,  dayOffset: 2,  urgency: 52, importance: 70 },
  { id: "10", title: "Architecture review",   done: false, color: "mint",   hour: 14, min: 0,  duration: 90,  dayOffset: 2,  urgency: 38, importance: 85 },
  { id: "11", title: "Stakeholder update",    done: false, color: "amber",  hour: 9,  min: 30, duration: 60,  dayOffset: 3,  urgency: 68, importance: 78 },
  { id: "12", title: "Investor prep",         done: false, color: "rose",   hour: 16, min: 0,  duration: 90,  dayOffset: 4,  urgency: 90, importance: 92 },
  { id: "13", title: "Code review",           done: true,  color: "teal",   hour: 15, min: 0,  duration: 60,  dayOffset: -1, urgency: 62, importance: 58 },
];

export const SEED_TODOS: Todo[] = [
  { id: "td1", title: "Finalize Q3 roadmap",          done: false, color: "sky"    },
  { id: "td2", title: "Review open pull requests",    done: false, color: "violet" },
  { id: "td3", title: "Write sprint retrospective",   done: false, color: "teal"   },
  { id: "td4", title: "Update product documentation", done: true,  color: "mint"   },
  { id: "td5", title: "Schedule stakeholder meeting", done: false, color: "amber"  },
  { id: "td6", title: "Prepare Friday demo",          done: false, color: "rose"   },
  { id: "td7", title: "Review analytics report",      done: false, color: "sky"    },
];
