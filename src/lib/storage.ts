import { Task, CompletionRecord } from "./types";

const COMPLETIONS_KEY = "helper_completions";
const CUSTOM_TASKS_KEY = "helper_custom_tasks";
const MANAGER_AUTH_KEY = "helper_manager_auth";

// --- Completion helpers ---

export function getCompletions(date: string): Record<string, CompletionRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(COMPLETIONS_KEY);
    if (!raw) return {};
    const all = JSON.parse(raw) as Record<
      string,
      Record<string, CompletionRecord>
    >;
    return all[date] ?? {};
  } catch {
    return {};
  }
}

export function toggleCompletion(date: string, taskId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(COMPLETIONS_KEY);
    const all: Record<string, Record<string, CompletionRecord>> = raw
      ? JSON.parse(raw)
      : {};

    const dateRecord = all[date] ?? {};

    if (dateRecord[taskId]) {
      // Already completed — uncheck it
      delete dateRecord[taskId];
    } else {
      dateRecord[taskId] = {
        taskId,
        completedAt: new Date().toISOString(),
      };
    }

    all[date] = dateRecord;
    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(all));
  } catch {
    // silently fail
  }
}

// --- Custom task helpers ---

export function getCustomTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_TASKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Task[];
  } catch {
    return [];
  }
}

export function addCustomTask(task: Task): void {
  if (typeof window === "undefined") return;
  try {
    const tasks = getCustomTasks();
    tasks.push(task);
    localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(tasks));
  } catch {
    // silently fail
  }
}

export function removeCustomTask(taskId: string): void {
  if (typeof window === "undefined") return;
  try {
    const tasks = getCustomTasks().filter((t) => t.id !== taskId);
    localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(tasks));
  } catch {
    // silently fail
  }
}

// --- Manager auth (sessionStorage so it resets on tab close) ---

export function isManagerAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(MANAGER_AUTH_KEY) === "true";
  } catch {
    return false;
  }
}

export function setManagerAuthenticated(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      sessionStorage.setItem(MANAGER_AUTH_KEY, "true");
    } else {
      sessionStorage.removeItem(MANAGER_AUTH_KEY);
    }
  } catch {
    // silently fail
  }
}
