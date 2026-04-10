import { getDay, getDate, differenceInCalendarDays, parseISO } from "date-fns";
import { Task } from "./types";
import { DEFAULT_ROUTINE_TASKS } from "./tasks";
import { getCustomTasks, getCompletions } from "./storage";

// Reference date used for "every-other-day" parity (a known even-offset start)
const EVERY_OTHER_DAY_REFERENCE = "2024-01-01";

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Returns true if a task should appear on the given date based on its recurrence rule.
 */
export function taskOccursOnDate(task: Task, date: Date): boolean {
  const recurrence = task.recurrence.toLowerCase().trim();

  if (recurrence === "daily") {
    return true;
  }

  if (recurrence === "every-other-day") {
    const ref = parseISO(EVERY_OTHER_DAY_REFERENCE);
    const diff = differenceInCalendarDays(date, ref);
    return diff % 2 === 0;
  }

  if (recurrence === "bimonthly") {
    const dayOfMonth = getDate(date);
    return dayOfMonth === 1 || dayOfMonth === 15;
  }

  if (recurrence === "weekly") {
    // Generic weekly — always show (caller can filter by specific day separately)
    return true;
  }

  // Specific day(s): "monday", "tuesday,saturday", "wednesday,sunday", etc.
  const days = recurrence.split(",").map((d) => d.trim());
  const todayIndex = getDay(date);
  return days.some((d) => WEEKDAY_MAP[d] === todayIndex);
}

/**
 * Returns all tasks (routine + custom) that apply to the given date,
 * with their completion state merged in.
 */
export function getTasksForDate(dateStr: string): Task[] {
  const date = parseISO(dateStr);
  const completions = getCompletions(dateStr);
  const customTasks = getCustomTasks();

  const allTasks = [...DEFAULT_ROUTINE_TASKS, ...customTasks];

  return allTasks
    .filter((task) => taskOccursOnDate(task, date))
    .map((task) => {
      const record = completions[task.id];
      return {
        ...task,
        completed: !!record,
        completedAt: record?.completedAt ?? null,
      };
    });
}

/**
 * Ordered time blocks for display.
 */
export const TIME_BLOCK_ORDER = [
  "morning",
  "after-breakfast",
  "after-lunch",
  "after-dinner",
  "anytime",
] as const;

export type TimeBlockKey = (typeof TIME_BLOCK_ORDER)[number];

export const TIME_BLOCK_LABELS: Record<TimeBlockKey, string> = {
  morning: "Morning",
  "after-breakfast": "After Breakfast",
  "after-lunch": "After Lunch",
  "after-dinner": "After Dinner",
  anytime: "Anytime",
};

export const TIME_BLOCK_EMOJIS: Record<TimeBlockKey, string> = {
  morning: "🌅",
  "after-breakfast": "🍳",
  "after-lunch": "☀️",
  "after-dinner": "🌙",
  anytime: "📋",
};

export const TIME_BLOCK_COLORS: Record<TimeBlockKey, string> = {
  morning: "bg-amber-100 text-amber-800 border-amber-200",
  "after-breakfast": "bg-orange-100 text-orange-800 border-orange-200",
  "after-lunch": "bg-sky-100 text-sky-800 border-sky-200",
  "after-dinner": "bg-indigo-100 text-indigo-800 border-indigo-200",
  anytime: "bg-gray-100 text-gray-700 border-gray-200",
};

export const TIME_BLOCK_ACCENT: Record<TimeBlockKey, string> = {
  morning: "border-l-amber-400",
  "after-breakfast": "border-l-orange-400",
  "after-lunch": "border-l-sky-400",
  "after-dinner": "border-l-indigo-400",
  anytime: "border-l-gray-400",
};
