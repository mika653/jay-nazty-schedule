"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { Check, Lock } from "lucide-react";
import Link from "next/link";
import {
  getTasksForDate,
  TIME_BLOCK_ORDER,
  TIME_BLOCK_LABELS,
  TIME_BLOCK_EMOJIS,
  TIME_BLOCK_COLORS,
  TIME_BLOCK_ACCENT,
  TimeBlockKey,
} from "@/lib/schedule";
import { toggleCompletion } from "@/lib/storage";
import { Task } from "@/lib/types";

export default function HelperPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [today] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [displayDate] = useState(() => format(new Date(), "EEEE, MMMM d"));
  const [displayYear] = useState(() => format(new Date(), "yyyy"));
  const clapAudioRef = useRef<HTMLAudioElement | null>(null);
  const wasAllDoneRef = useRef(false);

  const loadTasks = useCallback(() => {
    const loaded = getTasksForDate(today);
    setTasks(loaded);
  }, [today]);

  useEffect(() => {
    setMounted(true);
    clapAudioRef.current = new Audio("/clap.wav");
    loadTasks();
  }, [loadTasks]);

  // Play clapping sound when all tasks become completed
  useEffect(() => {
    if (!mounted || tasks.length === 0) return;
    const allDone = tasks.every((t) => t.completed);
    if (allDone && !wasAllDoneRef.current) {
      clapAudioRef.current?.play().catch(() => {});
    }
    wasAllDoneRef.current = allDone;
  }, [tasks, mounted]);

  function handleToggle(taskId: string) {
    toggleCompletion(today, taskId);
    setAnimatingId(taskId);
    loadTasks();
    setTimeout(() => setAnimatingId(null), 300);
  }

  // Show a loading state during SSR / before hydration
  if (!mounted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#faf8f5" }}
      >
        <div className="text-stone-400 text-sm font-medium">Loading...</div>
      </div>
    );
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const progressPct =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const grouped = TIME_BLOCK_ORDER.reduce<Record<string, Task[]>>(
    (acc, block) => {
      acc[block] = tasks.filter((t) => t.timeBlock === block);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#faf8f5" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 shadow-sm"
        style={{ background: "#faf8f5" }}
      >
        <div className="px-4 pt-5 pb-3 max-w-lg mx-auto">
          {/* Date */}
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              {displayYear}
            </p>
            <h1 className="text-2xl font-bold text-stone-800 leading-tight">
              {displayDate}
            </h1>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full progress-gradient transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-stone-600 min-w-[64px] text-right">
              {completedTasks}/{totalTasks} done
            </span>
          </div>

          {completedTasks === totalTasks && totalTasks > 0 && (
            <p className="mt-2 text-sm font-medium text-green-600 text-center">
              All done! Great job today! 🎉
            </p>
          )}
        </div>
      </header>

      {/* Task list */}
      <main className="flex-1 px-4 pb-28 pt-3 space-y-6 max-w-lg mx-auto w-full">
        {TIME_BLOCK_ORDER.map((block) => {
          const blockTasks = grouped[block];
          if (!blockTasks || blockTasks.length === 0) return null;
          const blockKey = block as TimeBlockKey;
          const blockDone = blockTasks.filter((t) => t.completed).length;

          return (
            <section key={block}>
              {/* Block header */}
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${TIME_BLOCK_COLORS[blockKey]}`}
                >
                  <span aria-hidden="true">{TIME_BLOCK_EMOJIS[blockKey]}</span>
                  {TIME_BLOCK_LABELS[blockKey]}
                </span>
                <span className="text-xs text-stone-400 font-medium">
                  {blockDone}/{blockTasks.length}
                </span>
              </div>

              {/* Task cards */}
              <div className="space-y-2">
                {blockTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    accentClass={TIME_BLOCK_ACCENT[blockKey]}
                    isAnimating={animatingId === task.id}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-stone-400">
            <p className="text-5xl mb-4" aria-hidden="true">🌸</p>
            <p className="text-base font-semibold">No tasks for today!</p>
            <p className="text-sm mt-1">Enjoy your day off.</p>
          </div>
        )}
      </main>

      {/* Footer: Manager access */}
      <footer className="fixed bottom-0 left-0 right-0 flex justify-end px-5 py-4 pointer-events-none">
        <Link
          href="/manager"
          className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-stone-800/85 backdrop-blur-sm text-stone-200 text-xs font-semibold shadow-lg active:scale-95 transition-transform no-select"
          aria-label="Manager view"
        >
          <Lock size={13} />
          Manager
        </Link>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaskCard
// ---------------------------------------------------------------------------

interface TaskCardProps {
  task: Task;
  accentClass: string;
  isAnimating: boolean;
  onToggle: (id: string) => void;
}

function TaskCard({ task, accentClass, isAnimating, onToggle }: TaskCardProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(task.id)}
      className={[
        "w-full text-left flex items-center gap-3 p-3.5 rounded-2xl",
        "bg-white shadow-sm border-l-4",
        accentClass,
        "active:scale-[0.98] transition-all duration-150 no-select",
        task.completed ? "task-completed" : "",
      ].join(" ")}
      aria-pressed={task.completed}
    >
      {/* Checkbox circle */}
      <div
        className={[
          "flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center",
          "transition-all duration-200",
          isAnimating ? "check-pop" : "",
          task.completed
            ? "bg-green-500 border-green-500"
            : "border-stone-300 bg-white",
        ].join(" ")}
        aria-hidden="true"
      >
        {task.completed && (
          <Check size={14} strokeWidth={3} color="white" />
        )}
      </div>

      {/* Title */}
      <span
        className={[
          "flex-1 text-sm font-medium leading-snug transition-colors duration-200",
          task.completed ? "line-through text-stone-400" : "text-stone-700",
        ].join(" ")}
      >
        {task.title}
      </span>

      {/* Recurrence tag for non-daily tasks */}
      {task.recurrence !== "daily" && !task.completed && (
        <span className="flex-shrink-0 text-[10px] text-stone-400 font-medium max-w-[56px] text-right leading-tight">
          {formatRecurrenceBadge(task.recurrence)}
        </span>
      )}
    </button>
  );
}

function formatRecurrenceBadge(recurrence: string): string {
  if (recurrence === "every-other-day") return "every 2d";
  if (recurrence === "bimonthly") return "1st & 15th";
  if (recurrence === "weekly") return "weekly";
  const days = recurrence.split(",").map((d) => d.trim().slice(0, 3));
  return days.join(", ");
}
