export type Color = "sky" | "teal" | "violet" | "amber" | "rose" | "mint";

export interface Task {
  id: string;
  title: string;
  done: boolean;
  color: Color;
  hour: number;
  min: number;
  duration: number;
  dayOffset: number;
  urgency: number;
  importance: number;
}

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  color: Color;
}

export interface ChatMsg {
  id: string;
  role: "user" | "ai";
  text: string;
}
