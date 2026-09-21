import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import { DataState } from "@packages/ui/components/data-state";
import { Input } from "@packages/ui/components/input";
import { ResponsiveSheet } from "@packages/ui/components/responsive-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@packages/ui/components/select";
import {
  ArrowLeftRight,
  CalendarDays,
  Check,
  Clock,
  CloudCheck,
  CloudOff,
  Coffee,
  ListPlus,
  NotebookPen,
  Pause,
  Play,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDuration, formatDurationShort } from "@packages/domain/time";
import { useApp } from "@/context/app-context";
import { useTimer } from "@/context/timer-context";
import { useTasks } from "@/hooks/use-tasks";
import { api, onOpenSwitcher } from "@/lib/api";
import { cn } from "@/lib/utils";

// Today tab: project strip, live timer card, summaries, task queue.
// Elapsed time derives from stored timestamps; the display ticks locally.
export function TodayScreen() {
  const { auth } = useApp();
  const { projects, tasks, loading, error, refresh } = useTasks();
  const {
    view,
    busy,
    fetchedAt,
    focusId,
    setFocusId,
    start,
    takeBreak,
    resume,
    stop,
    switchTo,
  } = useTimer();
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuickTitle, setPickerQuickTitle] = useState("");
  const [pickerAdding, setPickerAdding] = useState(false);
  const [, setTick] = useState(0);

  const online = auth?.status === "active";
  const status = view?.status ?? "IDLE";
  const running = status !== "IDLE";

  // Tray "Switch Task" opens this picker's sheet.
  useEffect(() => {
    const unlisten = onOpenSwitcher(() => setPickerOpen(true));
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Tick the display while a session is open.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const visible = useMemo(
    () =>
      projectFilter === "ALL"
        ? tasks
        : tasks.filter((t) => t.projectId === projectFilter),
    [tasks, projectFilter],
  );

  useEffect(() => {
    if (focusId === null && visible.length > 0) {
      setFocusId(visible[0]?.$id ?? null);
    }
  }, [focusId, visible, setFocusId]);

  useEffect(() => {
    if (focusId !== null && !visible.some((t) => t.$id === focusId)) {
      setFocusId(visible[0]?.$id ?? null);
    }
  }, [focusId, visible, setFocusId]);

  // Live totals: snapshot from Rust plus time since the snapshot.
  const elapsed = running ? Math.max(0, Date.now() - fetchedAt) : 0;
  const openKind = view?.segments.find((s) => s.ended_at_ms === null)?.type;
  const totalMs = (view?.total_ms ?? 0) + elapsed;
  const workMs = (view?.work_ms ?? 0) + (openKind === "WORK" ? elapsed : 0);
  const breakMs = (view?.break_ms ?? 0) + (openKind === "BREAK" ? elapsed : 0);

  const focus = visible.find((t) => t.$id === focusId) ?? null;
  const runningTaskId = view?.task_id ?? null;
  const displayTask = running
    ? (tasks.find((t) => t.$id === runningTaskId) ?? null)
    : focus;
  const displayProject = projects.find(
    (p) => p.$id === displayTask?.projectId,
  )?.name;

  const activeRowId = running ? runningTaskId : focusId;

  function handleToggle() {
    if (busy) return;
    if (status === "IDLE") {
      if (focus) void start(focus.$id, focus.title);
    } else {
      void stop();
    }
  }

  function handleTaskTap(taskId: string, taskTitle: string) {
    if (busy) return;
    if (!running) {
      setFocusId(taskId);
    } else if (taskId !== runningTaskId) {
      void switchTo(taskId, taskTitle);
    }
  }

  const runningProjectId =
    tasks.find((t) => t.$id === runningTaskId)?.projectId ?? null;

  async function handlePickerQuickAdd() {
    const title = pickerQuickTitle.trim();
    if (!title || !runningProjectId || pickerAdding) return;
    setPickerAdding(true);
    try {
      const created = await api.createTask(runningProjectId, title);
      setPickerQuickTitle("");
      setPickerOpen(false);
      await switchTo(created.$id, created.title);
    } catch (err) {
      toast.error("Quick-add failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setPickerAdding(false);
    }
  }

  const toggleOn = status !== "IDLE";
  const onBreak = status === "BREAK";

  return (
    <section className="mx-auto grid h-full w-full max-w-[420px] gap-4 overflow-y-auto scrollbar-thin px-3.5 pt-2 pb-4">
      {/* Project strip */}
      <div className="grid gap-2.5 rounded-xl border border-border bg-card p-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                running ? "animate-pulse bg-emerald-500" : "bg-emerald-500",
              )}
            />
            <Select
              value={projectFilter}
              onValueChange={(v) => setProjectFilter(v ?? "ALL")}
            >
              <SelectTrigger className="h-7 flex-1 border-0 px-1 text-xs font-semibold shadow-none">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.$id} value={p.$id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge className="shrink-0 border-emerald-600/30 bg-emerald-500/10 font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            {tasks.length} active
          </Badge>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
          <NotebookPen size={16} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
            {displayTask ? displayTask.title : "Pick a task below to focus"}
          </span>
          {displayProject && (
            <span className="shrink-0 font-mono text-[10px] font-medium text-muted-foreground">
              {displayProject}
            </span>
          )}
        </div>
      </div>

      {/* Timer card */}
      <section className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="grid">
            <span className="mb-1 flex items-center gap-1.5">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  status === "WORKING" && "animate-pulse bg-emerald-500",
                  status === "BREAK" && "animate-pulse bg-amber-500",
                  status === "IDLE" && "bg-slate-300 dark:bg-slate-600",
                )}
              />
              <span
                className={cn(
                  "font-mono text-[10px] font-semibold tracking-wider uppercase",
                  status === "WORKING" &&
                    "text-emerald-700 dark:text-emerald-400",
                  status === "BREAK" && "text-amber-700 dark:text-amber-400",
                  status === "IDLE" && "text-muted-foreground",
                )}
              >
                {status === "WORKING"
                  ? "Logging time"
                  : status === "BREAK"
                    ? "On break"
                    : "Ready"}
              </span>
            </span>
            <span className="font-mono text-[38px] leading-none font-bold tracking-tight tabular-nums text-ink">
              {formatDuration(totalMs)}
            </span>
            <span className="mt-1 font-mono text-[11px] font-medium text-muted-foreground">
              {running ? "Session elapsed" : "No active session"}
            </span>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggle}
              disabled={busy || (status === "IDLE" && !focus)}
              title={
                status === "IDLE"
                  ? "Start tracking the focused task"
                  : "Stop timer"
              }
              aria-label={toggleOn ? "Stop timer" : "Start timer"}
              className={cn(
                "flex h-9 w-16 items-center rounded-full px-1 shadow-inner transition-colors",
                toggleOn
                  ? onBreak
                    ? "bg-amber-500"
                    : "bg-emerald-600"
                  : "bg-slate-300 dark:bg-slate-700",
                "not-disabled:cursor-pointer disabled:opacity-70",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-transform",
                  toggleOn ? "translate-x-7" : "translate-x-0",
                )}
              >
                {toggleOn ? (
                  <Pause
                    size={18}
                    className={cn(
                      "font-bold",
                      onBreak ? "text-amber-700" : "text-emerald-700",
                    )}
                  />
                ) : (
                  <Play size={18} className="text-slate-500" />
                )}
              </span>
            </button>
            <span
              className={cn(
                "font-mono text-[11px] font-bold tracking-wide uppercase",
                status === "WORKING" &&
                  "text-emerald-700 dark:text-emerald-400",
                status === "BREAK" && "text-amber-700 dark:text-amber-400",
                status === "IDLE" && "text-muted-foreground",
              )}
            >
              {toggleOn ? "On" : "Off"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
          {onBreak ? (
            <Button
              onClick={() => void resume()}
              disabled={busy}
              className="bg-emerald-600 text-white hover:bg-emerald-600/90"
            >
              <Play size={16} />
              Resume
            </Button>
          ) : (
            <Button
              onClick={() => void takeBreak()}
              disabled={busy || !running}
              className="bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-400"
            >
              <Coffee size={16} />
              Break
            </Button>
          )}
          <Button
            onClick={() => setPickerOpen(true)}
            disabled={busy || !running}
            variant="secondary"
          >
            <ArrowLeftRight size={16} />
            Switch
          </Button>
        </div>
      </section>

      {/* Summaries */}
      <div className="grid grid-cols-2 gap-3">
        <div className="grid content-between rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Today
            </span>
            <Clock
              size={16}
              className="text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <span className="font-mono text-xl font-bold tabular-nums text-ink">
            {formatDurationShort(workMs)}
          </span>
          <span className="mt-1 font-mono text-[10px] text-muted-foreground">
            {breakMs > 0
              ? `${formatDurationShort(breakMs)} rest taken`
              : "No time logged yet"}
          </span>
        </div>
        <div className="grid content-between rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              This week
            </span>
            <CalendarDays
              size={16}
              className="text-blue-600 dark:text-blue-400"
            />
          </div>
          <span className="font-mono text-xl font-bold tabular-nums text-ink">
            {formatDurationShort(0)}
          </span>
          <span className="mt-1 font-mono text-[10px] text-muted-foreground">
            Weekly totals in Phase 5
          </span>
        </div>
      </div>

      {/* Task queue */}
      <section className="grid gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Today&apos;s tasks &amp; recent
          </span>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            {visible.length} items
          </span>
        </div>

        <DataState
          loading={loading}
          error={error}
          data={visible}
          onRetry={() => void refresh()}
          skeletonCount={3}
          emptyTitle="No tasks here"
          emptyHint="Add tasks from the Tasks tab to get started."
        >
          {(rows) => (
            <ul className="grid gap-2">
              {rows.map((task) => {
                const isActive = task.$id === activeRowId;
                const isRunningTask = running && task.$id === runningTaskId;
                return (
                  <li
                    key={task.$id}
                    className={cn(
                      "flex items-center justify-between rounded-xl border bg-card p-3.5 shadow-sm transition-colors",
                      isActive ? "border-emerald-600/40" : "border-border",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3 pr-2">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          isActive
                            ? "bg-emerald-500"
                            : "bg-slate-300 dark:bg-slate-600",
                        )}
                      />
                      <div className="grid min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold text-ink">
                            {task.title}
                          </span>
                          {isActive && (
                            <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-px font-mono text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                              ACTIVE
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {projects.find((p) => p.$id === task.projectId)
                            ?.name ?? "Unknown"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy || isRunningTask}
                      title={
                        isRunningTask
                          ? "Currently tracking"
                          : running
                            ? "Switch to this task"
                            : "Focus this task"
                      }
                      aria-label={
                        isRunningTask
                          ? "Currently tracking"
                          : running
                            ? `Switch to ${task.title}`
                            : `Focus ${task.title}`
                      }
                      onClick={() => handleTaskTap(task.$id, task.title)}
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm transition-all active:scale-95",
                        isActive
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground hover:bg-emerald-600 hover:text-white",
                        "disabled:opacity-70",
                      )}
                    >
                      {isRunningTask ? (
                        <Check size={18} />
                      ) : isActive && running ? (
                        <Pause size={18} />
                      ) : (
                        <Play size={18} />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </DataState>
      </section>

      {/* Sync footer */}
      <div className="flex items-center justify-between px-1 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {online ? (
            <CloudCheck
              size={15}
              className="text-emerald-600 dark:text-emerald-400"
            />
          ) : (
            <CloudOff size={15} className="text-amber-600" />
          )}
          <span className="font-mono text-[11px] font-medium">
            {!online
              ? "Offline"
              : (view?.pending_count ?? 0) > 0
                ? `Sync pending (${view?.pending_count})`
                : "Auto-sync active"}
          </span>
        </span>
        {displayTask && (
          <span className="max-w-40 truncate font-mono text-[11px] text-faint">
            Focus: {displayTask.title}
          </span>
        )}
      </div>

      {/* Switch-task picker */}
      <ResponsiveSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Switch task"
        description="Ends the current interval and starts tracking the selected task."
        footer={
          <Button variant="ghost" onClick={() => setPickerOpen(false)}>
            Cancel
          </Button>
        }
      >
        <div className="flex gap-2">
          <Input
            value={pickerQuickTitle}
            onChange={(e) => setPickerQuickTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handlePickerQuickAdd()}
            placeholder={`Quick-add in ${projects.find((p) => p.$id === runningProjectId)?.name ?? "current project"}…`}
            className="h-9"
          />
          <Button
            onClick={() => void handlePickerQuickAdd()}
            disabled={
              pickerAdding || !pickerQuickTitle.trim() || !runningProjectId
            }
            className="h-9 shrink-0"
          >
            <ListPlus size={14} />
            Add
          </Button>
        </div>
        <ul className="grid max-h-80 gap-2 overflow-y-auto scrollbar-thin">
          {visible
            .filter((t) => t.$id !== runningTaskId)
            .map((task) => (
              <li key={task.$id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPickerOpen(false);
                    void switchTo(task.$id, task.title);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:border-emerald-600/40 hover:bg-muted/60 disabled:opacity-60"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                    {task.title}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {projects.find((p) => p.$id === task.projectId)?.name ??
                      "Unknown"}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </ResponsiveSheet>
    </section>
  );
}
