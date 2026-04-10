"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  LogOut,
  Plus,
  Trash2,
  Check,
  X,
  ChevronDown,
  Delete,
} from "lucide-react";
import Link from "next/link";
import {
  isManagerAuthenticated,
  setManagerAuthenticated,
  getCustomTasks,
  addCustomTask,
  removeCustomTask,
  getCompletions,
} from "@/lib/storage";
import { getTasksForDate, TIME_BLOCK_ORDER, TIME_BLOCK_LABELS, TIME_BLOCK_EMOJIS, TimeBlockKey } from "@/lib/schedule";
import { Task, TimeBlock, Recurrence } from "@/lib/types";

const MANAGER_PIN = "1234";
const TODAY = format(new Date(), "yyyy-MM-dd");
const DISPLAY_DATE = format(new Date(), "EEEE, MMMM d, yyyy");

// ---------------------------------------------------------------------------
// Root: decides whether to show PIN screen or dashboard
// ---------------------------------------------------------------------------

export default function ManagerPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAuthed(isManagerAuthenticated());
    setChecked(true);
  }, []);

  function handleAuth() {
    setManagerAuthenticated(true);
    setAuthed(true);
  }

  function handleLogout() {
    setManagerAuthenticated(false);
    setAuthed(false);
  }

  if (!checked) return null; // hydration guard

  if (!authed) {
    return <PinScreen onSuccess={handleAuth} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

// ---------------------------------------------------------------------------
// PIN screen
// ---------------------------------------------------------------------------

interface PinScreenProps {
  onSuccess: () => void;
}

function PinScreen({ onSuccess }: PinScreenProps) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  function handleDigit(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setErrorMsg("");
    if (next.length === 4) {
      validatePin(next);
    }
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1));
    setErrorMsg("");
  }

  function validatePin(value: string) {
    if (value === MANAGER_PIN) {
      onSuccess();
    } else {
      setShake(true);
      setErrorMsg("Incorrect PIN. Try again.");
      setTimeout(() => {
        setPin("");
        setShake(false);
      }, 600);
    }
  }

  const DIGITS = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "del"],
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#1c1917" }}>
      {/* Back */}
      <Link
        href="/"
        className="absolute top-5 left-5 flex items-center gap-1 text-stone-400 text-sm font-medium active:text-stone-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <div className="w-full max-w-xs">
        {/* Title */}
        <div className="text-center mb-10">
          <p className="text-3xl mb-2" aria-hidden="true">🔒</p>
          <h1 className="text-xl font-bold text-stone-100">Manager View</h1>
          <p className="text-sm text-stone-400 mt-1">Enter your PIN to continue</p>
        </div>

        {/* PIN dots */}
        <div
          className={`flex justify-center gap-4 mb-8 ${shake ? "animate-[wiggle_0.4s_ease-in-out]" : ""}`}
          style={shake ? { animation: "wiggle 0.4s ease-in-out" } : {}}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={[
                "w-4 h-4 rounded-full border-2 transition-all duration-150",
                pin.length > i
                  ? "bg-amber-400 border-amber-400 scale-110"
                  : "bg-transparent border-stone-600",
              ].join(" ")}
            />
          ))}
        </div>

        {/* Error */}
        {errorMsg && (
          <p className="text-center text-sm text-red-400 mb-6 font-medium">
            {errorMsg}
          </p>
        )}

        {/* PIN pad */}
        <div className="grid grid-cols-3 gap-3">
          {DIGITS.flat().map((key, idx) => {
            if (key === "") {
              return <div key={idx} />;
            }
            if (key === "del") {
              return (
                <button
                  key="del"
                  type="button"
                  onClick={handleDelete}
                  className="pin-btn flex items-center justify-center h-16 rounded-2xl bg-stone-800 text-stone-300 active:bg-stone-700 transition-colors"
                  aria-label="Delete"
                >
                  <Delete size={20} />
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleDigit(key)}
                className="pin-btn h-16 rounded-2xl bg-stone-800 text-stone-100 text-xl font-semibold active:bg-stone-700 transition-colors"
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard (authenticated)
// ---------------------------------------------------------------------------

interface DashboardProps {
  onLogout: () => void;
}

type DashboardTab = "overview" | "add-task" | "custom-tasks";

function Dashboard({ onLogout }: DashboardProps) {
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customTasks, setCustomTasks] = useState<Task[]>([]);

  const refresh = useCallback(() => {
    setTasks(getTasksForDate(TODAY));
    setCustomTasks(getCustomTasks());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const completedTasks = tasks.filter((t) => t.completed);
  const pendingTasks = tasks.filter((t) => !t.completed);
  const progressPct =
    tasks.length === 0
      ? 0
      : Math.round((completedTasks.length / tasks.length) * 100);

  function handleDeleteCustom(id: string) {
    removeCustomTask(id);
    refresh();
  }

  function handleTaskAdded() {
    refresh();
    setTab("custom-tasks");
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#292524" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 shadow-sm" style={{ background: "#292524" }}>
        <div className="px-4 pt-5 pb-3 max-w-lg mx-auto flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
              Manager View
            </p>
            <h1 className="text-lg font-bold text-stone-100 leading-tight">
              {DISPLAY_DATE}
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Link
              href="/"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-700 text-stone-300 text-xs font-medium active:bg-stone-600 transition-colors"
            >
              <ArrowLeft size={13} />
              Helper
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-700 text-stone-300 text-xs font-medium active:bg-stone-600 transition-colors"
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-stone-700 px-4 max-w-lg mx-auto">
          {(
            [
              { key: "overview", label: "Overview" },
              { key: "add-task", label: "Add Task" },
              { key: "custom-tasks", label: "Custom Tasks" },
            ] as { key: DashboardTab; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                tab === key
                  ? "border-amber-400 text-amber-400"
                  : "border-transparent text-stone-400 active:text-stone-200",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-10 max-w-lg mx-auto w-full">
        {tab === "overview" && (
          <OverviewTab
            tasks={tasks}
            completedTasks={completedTasks}
            pendingTasks={pendingTasks}
            progressPct={progressPct}
          />
        )}
        {tab === "add-task" && <AddTaskTab onAdded={handleTaskAdded} />}
        {tab === "custom-tasks" && (
          <CustomTasksTab
            customTasks={customTasks}
            onDelete={handleDeleteCustom}
            completions={getCompletions(TODAY)}
          />
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

interface OverviewTabProps {
  tasks: Task[];
  completedTasks: Task[];
  pendingTasks: Task[];
  progressPct: number;
}

function OverviewTab({ tasks, completedTasks, pendingTasks, progressPct }: OverviewTabProps) {
  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={tasks.length} color="text-stone-200" />
        <StatCard label="Done" value={completedTasks.length} color="text-green-400" />
        <StatCard label="Remaining" value={pendingTasks.length} color="text-amber-400" />
      </div>

      {/* Progress */}
      <div className="bg-stone-800 rounded-2xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-stone-300">Today&apos;s Progress</span>
          <span className="text-sm font-bold text-amber-400">{progressPct}%</span>
        </div>
        <div className="h-3 bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full progress-gradient transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Task status grouped by time block */}
      {TIME_BLOCK_ORDER.map((block) => {
        const blockKey = block as TimeBlockKey;
        const blockTasks = tasks.filter((t) => t.timeBlock === block);
        if (blockTasks.length === 0) return null;

        return (
          <div key={block} className="bg-stone-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base" aria-hidden="true">{TIME_BLOCK_EMOJIS[blockKey]}</span>
              <span className="text-sm font-semibold text-stone-200">
                {TIME_BLOCK_LABELS[blockKey]}
              </span>
              <span className="ml-auto text-xs text-stone-500">
                {blockTasks.filter((t) => t.completed).length}/{blockTasks.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {blockTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2.5 py-1"
                >
                  {task.completed ? (
                    <Check size={14} className="text-green-400 flex-shrink-0" />
                  ) : (
                    <X size={14} className="text-stone-600 flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm leading-snug ${
                      task.completed
                        ? "line-through text-stone-500"
                        : "text-stone-300"
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.completedAt && (
                    <span className="ml-auto text-[10px] text-stone-600 flex-shrink-0">
                      {format(new Date(task.completedAt), "h:mm a")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-stone-800 rounded-2xl p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-stone-500 mt-0.5 font-medium">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Task tab
// ---------------------------------------------------------------------------

interface AddTaskTabProps {
  onAdded: () => void;
}

const TIME_BLOCK_OPTIONS: { value: TimeBlock; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "after-breakfast", label: "After Breakfast" },
  { value: "after-lunch", label: "After Lunch" },
  { value: "after-dinner", label: "After Dinner" },
  { value: "anytime", label: "Anytime" },
];

const RECURRENCE_PRESETS: { value: Recurrence; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "every-other-day", label: "Every other day" },
  { value: "monday,tuesday,wednesday,thursday,friday", label: "Weekdays (Mon–Fri)" },
  { value: "saturday,sunday", label: "Weekends" },
  { value: "monday", label: "Every Monday" },
  { value: "tuesday", label: "Every Tuesday" },
  { value: "wednesday", label: "Every Wednesday" },
  { value: "thursday", label: "Every Thursday" },
  { value: "friday", label: "Every Friday" },
  { value: "saturday", label: "Every Saturday" },
  { value: "sunday", label: "Every Sunday" },
  { value: "monday,thursday", label: "Mon & Thu" },
  { value: "tuesday,saturday", label: "Tue & Sat" },
  { value: "wednesday,sunday", label: "Wed & Sun" },
  { value: "bimonthly", label: "Twice a month (1st & 15th)" },
];

function AddTaskTab({ onAdded }: AddTaskTabProps) {
  const [title, setTitle] = useState("");
  const [timeBlock, setTimeBlock] = useState<TimeBlock>("morning");
  const [recurrence, setRecurrence] = useState<Recurrence>("daily");
  const [isOneTime, setIsOneTime] = useState(true);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Task = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      timeBlock,
      recurrence: isOneTime ? "daily" : recurrence,
      isRoutine: false,
      completed: false,
      completedAt: null,
    };

    addCustomTask(newTask);
    setSuccess(true);
    setTitle("");
    setTimeBlock("morning");
    setRecurrence("daily");
    setIsOneTime(true);
    setTimeout(() => {
      setSuccess(false);
      onAdded();
    }, 1200);
  }

  const inputClass =
    "w-full bg-stone-700 text-stone-100 rounded-xl px-4 py-3 text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-shadow";
  const labelClass = "block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={labelClass}>Task Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Water the plants"
          className={inputClass}
          required
        />
      </div>

      <div>
        <label className={labelClass}>Time Block</label>
        <div className="relative">
          <select
            value={timeBlock}
            onChange={(e) => setTimeBlock(e.target.value as TimeBlock)}
            className={`${inputClass} appearance-none pr-10 cursor-pointer`}
          >
            {TIME_BLOCK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Task Type</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsOneTime(true)}
            className={[
              "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors",
              isOneTime
                ? "bg-amber-400 text-stone-900"
                : "bg-stone-700 text-stone-400 active:bg-stone-600",
            ].join(" ")}
          >
            One-time (today)
          </button>
          <button
            type="button"
            onClick={() => setIsOneTime(false)}
            className={[
              "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors",
              !isOneTime
                ? "bg-amber-400 text-stone-900"
                : "bg-stone-700 text-stone-400 active:bg-stone-600",
            ].join(" ")}
          >
            Recurring
          </button>
        </div>
      </div>

      {!isOneTime && (
        <div>
          <label className={labelClass}>Recurrence</label>
          <div className="relative">
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as Recurrence)}
              className={`${inputClass} appearance-none pr-10 cursor-pointer`}
            >
              {RECURRENCE_PRESETS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
          </div>
        </div>
      )}

      {isOneTime && (
        <p className="text-xs text-stone-500 -mt-2">
          This task will appear every day until you delete it. Mark it done today.
        </p>
      )}

      <button
        type="submit"
        disabled={!title.trim()}
        className={[
          "w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all",
          success
            ? "bg-green-500 text-white"
            : title.trim()
            ? "bg-amber-400 text-stone-900 active:scale-[0.98]"
            : "bg-stone-700 text-stone-500 cursor-not-allowed",
        ].join(" ")}
      >
        {success ? (
          <>
            <Check size={16} />
            Task Added!
          </>
        ) : (
          <>
            <Plus size={16} />
            Add Task
          </>
        )}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Custom Tasks tab
// ---------------------------------------------------------------------------

interface CustomTasksTabProps {
  customTasks: Task[];
  onDelete: (id: string) => void;
  completions: Record<string, { taskId: string; completedAt: string }>;
}

function CustomTasksTab({ customTasks, onDelete, completions }: CustomTasksTabProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (customTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-stone-500">
        <p className="text-4xl mb-3" aria-hidden="true">📝</p>
        <p className="text-sm font-semibold">No custom tasks yet.</p>
        <p className="text-xs mt-1">Use the &quot;Add Task&quot; tab to create one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500 font-medium">
        {customTasks.length} custom task{customTasks.length !== 1 ? "s" : ""}
      </p>
      {customTasks.map((task) => {
        const isDone = !!completions[task.id];
        const isConfirming = confirmId === task.id;

        return (
          <div
            key={task.id}
            className="bg-stone-800 rounded-2xl p-4 flex items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium leading-snug ${isDone ? "line-through text-stone-500" : "text-stone-200"}`}>
                {task.title}
              </p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <span className="text-[10px] text-stone-500 bg-stone-700 rounded-full px-2 py-0.5">
                  {TIME_BLOCK_LABELS[task.timeBlock as TimeBlockKey]}
                </span>
                <span className="text-[10px] text-stone-500 bg-stone-700 rounded-full px-2 py-0.5">
                  {formatRecurrenceLong(task.recurrence)}
                </span>
                {isDone && (
                  <span className="text-[10px] text-green-500 bg-green-500/10 rounded-full px-2 py-0.5">
                    Done today
                  </span>
                )}
              </div>
            </div>

            {isConfirming ? (
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(task.id);
                    setConfirmId(null);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold active:bg-red-600 transition-colors"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-700 text-stone-400 text-xs font-semibold active:bg-stone-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmId(task.id)}
                className="flex-shrink-0 p-2 rounded-xl bg-stone-700 text-stone-400 active:bg-stone-600 transition-colors"
                aria-label={`Delete ${task.title}`}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatRecurrenceLong(recurrence: string): string {
  if (recurrence === "daily") return "Every day";
  if (recurrence === "every-other-day") return "Every other day";
  if (recurrence === "bimonthly") return "1st & 15th";
  if (recurrence === "weekly") return "Weekly";
  const days = recurrence.split(",").map((d) => {
    const s = d.trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
  return days.join(", ");
}
