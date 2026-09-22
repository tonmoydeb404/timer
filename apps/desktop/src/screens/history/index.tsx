import { Badge } from "@packages/ui/components/badge";
import { DataState } from "@packages/ui/components/data-state";
import { useMemo } from "react";
import {
  aggregateDayTotals,
  entryDurationMs,
  formatDuration,
  formatDurationShort,
  groupEntriesByStartDay,
} from "@packages/domain/index";
import { useTimeEntries } from "@/hooks/use-time-entries";

// History tab: synced sessions grouped by day (midnight-split totals).
// Editing lives on the web dashboard; this view is read-only.
export function HistoryScreen() {
  const { entries, tasks, projects, timeZone, loading, error, refresh } =
    useTimeEntries(200);

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.$id, t])), [tasks]);
  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.$id, p])),
    [projects],
  );
  const perDay = useMemo(
    () => new Map(aggregateDayTotals(entries, timeZone).map((d) => [d.day, d])),
    [entries, timeZone],
  );
  const groups = useMemo(
    () => groupEntriesByStartDay(entries, timeZone).slice(0, 14),
    [entries, timeZone],
  );

  function formatTime(iso: string): string {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return d.toISOString().slice(11, 16);
    }
  }

  return (
    <section className="mx-auto grid h-full w-full max-w-[420px] content-start gap-3 overflow-y-auto scrollbar-thin px-3.5 pt-2 pb-4">
      <h1 className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        History
      </h1>
      <DataState
        loading={loading}
        error={error}
        data={groups}
        onRetry={() => void refresh()}
        emptyTitle="No history yet"
        emptyHint="Tracked sessions appear here once they sync. Full history and editing live on the web dashboard."
      >
        {(days) => (
          <div className="grid gap-4">
            {days.map(({ day, entries: rows }) => {
              const totals = perDay.get(day);
              return (
                <section key={day} className="grid gap-1.5">
                  <div className="flex items-baseline justify-between px-1">
                    <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                      {day}
                    </span>
                    {totals && (
                      <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                        {formatDurationShort(totals.workMs)}
                        {totals.breakMs > 0 &&
                          ` + ${formatDurationShort(totals.breakMs)} break`}
                      </span>
                    )}
                  </div>
                  <ul className="grid gap-1.5">
                    {rows.map((entry) => {
                      const task = taskById.get(entry.taskId);
                      const project = task
                        ? projectById.get(task.projectId)
                        : undefined;
                      return (
                        <li
                          key={entry.$id}
                          className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 shadow-sm"
                        >
                          <Badge
                            variant={
                              entry.type === "BREAK" ? "secondary" : "outline"
                            }
                            className="shrink-0 font-mono text-[9px]"
                          >
                            {entry.type === "BREAK" ? "BREAK" : "WORK"}
                          </Badge>
                          <div className="grid min-w-0 flex-1">
                            <span className="truncate text-xs font-semibold text-ink">
                              {task?.title ?? "Deleted task"}
                            </span>
                            <span className="truncate font-mono text-[10px] text-muted-foreground tabular-nums">
                              {project?.name ?? "Unknown"}
                              {" · "}
                              {formatTime(entry.startedAt)}
                              {" → "}
                              {entry.endedAt ? formatTime(entry.endedAt) : "open"}
                            </span>
                          </div>
                          <span className="shrink-0 font-mono text-[11px] font-semibold text-ink tabular-nums">
                            {entry.endedAt
                              ? formatDuration(
                                  entryDurationMs(entry.startedAt, entry.endedAt),
                                )
                              : "open"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </DataState>
    </section>
  );
}
