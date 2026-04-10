export type TimeBlock =
  | "morning"
  | "after-breakfast"
  | "after-lunch"
  | "after-dinner"
  | "anytime";

export type Recurrence =
  | "daily"
  | "every-other-day"
  | "weekly"
  | "bimonthly"
  | string; // comma-separated weekday names e.g. "monday,thursday"

export interface Task {
  id: string;
  title: string;
  timeBlock: TimeBlock;
  recurrence: Recurrence;
  isRoutine: boolean;
  completed: boolean;
  completedAt: string | null;
}

export interface CompletionRecord {
  taskId: string;
  completedAt: string;
}

export type CompletionsByDate = Record<string, Record<string, CompletionRecord>>;
