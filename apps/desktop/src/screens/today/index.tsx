import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import { DataState } from "@packages/ui/components/data-state";
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
  Clock,
  CloudCheck,
  CloudOff,
  Coffee,
  NotebookPen,
  Pause,
  Play,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatDuration, formatDurationShort } from "@packages/domain/time";
import { useApp } from "@/context/app-context";
import { useTasks } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";

// Today tab: project strip, timer card, summaries, task queue.
// Timer controls are Phase 3 — rendered disabled until the state machine
// lands, so the layout is final but nothing pretends to track.
export function TodayScreen() {
  const { auth } = useApp();
  const { projects, tasks, loading, error, refresh } = useTasks();
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [focusId, setFocusId] = useState<string | null>(null);

  const online = auth?.status === "active";

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
  }, [focusId, visible]);

  useEffect(() => {
    if (focusId !== null && !visible.some((t) => t.$id === focusId)) {
      setFocusId(visible[0]?.$id ?? null);
    }
  }, [focusId, visible]);

  const focus = visible.find((t) => t.$id === focusId) ?? null;
  const focusProject = projects.find((p) => p.$id === focus?.projectId)?.name;

  return (
    <section className="mx-auto grid h-full w-full max-w-[420px] gap-4 overflow-y-auto scrollbar-thin px-3.5 pt-2 pb-4">
      {/* Project strip */}
      <div className="grid gap-2.5 rounded-xl border border-border bg-card p-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
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
            {focus ? focus.title : "Pick a task below to focus"}
          </span>
          {focusProject && (
            <span className="shrink-0 font-mono text-[10px] font-medium text-muted-foreground">
              {focusProject}
            </span>
          )}
        </div>
      </div>

      {/* Timer card */}
      <section className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="grid">
            <span className="mb-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Ready
              </span>
            </span>
            <span className="font-mono text-[38px] leading-none font-bold tracking-tight tabular-nums text-ink">
              {formatDuration(0)}
            </span>
            <span className="mt-1 font-mono text-[11px] font-medium text-muted-foreground">
              No active session
            </span>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <button
              type="button"
              disabled
              title="Timer arrives in Phase 3"
              aria-label="Start timer (coming in Phase 3)"
              className="flex h-9 w-16 cursor-not-allowed items-center rounded-full bg-slate-300 px-1 shadow-inner dark:bg-slate-700"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md">
                <Play size={18} className="text-slate-500" />
              </span>
            </button>
            <span className="font-mono text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              Off
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
          <Button
            disabled
            title="Timer arrives in Phase 3"
            className="bg-amber-500/10 text-amber-800 hover:bg-amber-500/10 dark:text-amber-400"
          >
            <Coffee size={16} />
            Break
          </Button>
          <Button disabled title="Timer arrives in Phase 3" variant="secondary">
            <ArrowLeftRight size={16} />
            Switch
          </Button>
        </div>
        <p className="-mt-2 text-center font-mono text-[10px] text-muted-foreground">
          Live tracking arrives in Phase 3
        </p>
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
            {formatDurationShort(0)}
          </span>
          <span className="mt-1 font-mono text-[10px] text-muted-foreground">
            No time logged yet
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
                const isFocus = task.$id === focusId;
                return (
                  <li
                    key={task.$id}
                    className={cn(
                      "flex items-center justify-between rounded-xl border bg-card p-3.5 shadow-sm transition-colors",
                      isFocus ? "border-emerald-600/40" : "border-border",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3 pr-2">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          isFocus
                            ? "bg-emerald-500"
                            : "bg-slate-300 dark:bg-slate-600",
                        )}
                      />
                      <div className="grid min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold text-ink">
                            {task.title}
                          </span>
                          {isFocus && (
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
                      title={isFocus ? "Focused task" : "Focus this task"}
                      aria-label={
                        isFocus ? "Focused task" : `Focus ${task.title}`
                      }
                      onClick={() => setFocusId(task.$id)}
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm transition-all active:scale-95",
                        isFocus
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground hover:bg-emerald-600 hover:text-white",
                      )}
                    >
                      {isFocus ? <Pause size={18} /> : <Play size={18} />}
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
            {online ? "Auto-sync active" : "Offline"}
          </span>
        </span>
        {focus && (
          <span className="max-w-40 truncate font-mono text-[11px] text-faint">
            Focus: {focus.title}
          </span>
        )}
      </div>
    </section>
  );
}
