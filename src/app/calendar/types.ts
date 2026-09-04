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
  choices?: string[]; // present_choices로 온 경우에만 존재. 유저가 고르면 사라짐.
}
