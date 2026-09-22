"use client";

import { TimeEntryDialog } from "@/components/time/time-entry-dialog";
import {
  useProjects,
  useTasks,
  useTimeEntries,
} from "@/contexts/app/app-context";
import { useAuth } from "@/lib/auth-context";
import { getProfile } from "@/lib/db";
import {
  aggregateDayTotals,
  entryDurationMs,
  formatDuration,
  formatDurationShort,
  groupEntriesByStartDay,
  type EntryType,
  type TimeEntry,
} from "@packages/domain/index";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@packages/ui/components/alert-dialog";
import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import { DataState } from "@packages/ui/components/data-state";
import { Input } from "@packages/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@packages/ui/components/select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const TYPE_FILTERS: { value: EntryType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "WORK", label: "Work" },
  { value: "BREAK", label: "Break" },
];

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 3600 * 1000);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return { from: day(from), to: day(to) };
}

export function TimeClient() {
  const { user } = useAuth();
  const [timeZone, setTimeZone] = useState("UTC");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const { projects } = useProjects();
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks();
  const {
    timeEntries: entries,
    loading: entriesLoading,
    error: entriesError,
    reload: reloadEntries,
    remove,
  } = useTimeEntries();
  const loading = profileLoading || tasksLoading || entriesLoading;
  const error = profileError || tasksError || entriesError;
  const actionError = remove.error;

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<EntryType | "ALL">("ALL");
  const [range, setRange] = useState(defaultRange);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [deleting, setDeleting] = useState<TimeEntry | null>(null);

  const taskById = useMemo(
    () => new Map(tasks.map((t) => [t.$id, t])),
    [tasks],
  );
  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.$id, p])),
    [projects],
  );

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setProfileLoading(true);
    setProfileError(null);
    try {
      const profile = await getProfile(user.$id);
      setTimeZone(
        profile?.timezone ||
          (typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : "UTC"),
      );
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Couldn't load history.",
      );
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const refresh = useCallback(() => {
    void loadProfile();
    void reloadEntries();
  }, [loadProfile, reloadEntries]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = range.from
      ? new Date(`${range.from}T00:00:00`).getTime()
      : NaN;
    const toMs = range.to
      ? new Date(`${range.to}T00:00:00`).getTime() + 24 * 3600 * 1000
      : NaN;
    return entries.filter((e) => {
      if (typeFilter !== "ALL" && e.type !== typeFilter) return false;
      if (projectFilter !== "ALL") {
        const task = taskById.get(e.taskId);
        if (!task || task.projectId !== projectFilter) return false;
      }
      const startMs = new Date(e.startedAt).getTime();
      if (Number.isFinite(fromMs) && startMs < fromMs) return false;
      if (Number.isFinite(toMs) && startMs >= toMs) return false;
      if (q) {
        const title = taskById.get(e.taskId)?.title.toLowerCase() ?? "";
        if (!title.includes(q)) return false;
      }
      return true;
    });
  }, [entries, search, projectFilter, typeFilter, range, taskById]);

  const perDay = useMemo(
    () => new Map(aggregateDayTotals(visible, timeZone).map((d) => [d.day, d])),
    [visible, timeZone],
  );
  const groups = useMemo(
    () => groupEntriesByStartDay(visible, timeZone),
    [visible, timeZone],
  );

  const formatInstant = useCallback(
    (iso: string) => {
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
    },
    [timeZone],
  );

  async function confirmDelete() {
    if (!deleting) return;
    const id = deleting.$id;
    setDeleting(null);
    try {
      await remove.run(id);
    } catch {
      // Surfaced via remove.error from the hook.
    }
  }

  if (!user) return null;

  const activeTasks = tasks.filter((t) => !t.deletedAt);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Time</h1>
          <p className="text-sm text-muted-foreground">
            Every tracked session, grouped by day in {timeZone}.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus size={14} />
          Log time
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks…"
          className="h-9 max-w-56"
        />
        <Select
          value={projectFilter}
          onValueChange={(v) => setProjectFilter(v ?? "ALL")}
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All projects</SelectItem>
            {projects
              .filter((p) => !p.deletedAt)
              .map((p) => (
                <SelectItem key={p.$id} value={p.$id}>
                  {p.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          {TYPE_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={typeFilter === f.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Input
            type="date"
            aria-label="From date"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className="h-9 w-36"
          />
          <span>→</span>
          <Input
            type="date"
            aria-label="To date"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className="h-9 w-36"
          />
        </span>
      </div>

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <DataState
        loading={loading}
        error={error}
        data={groups}
        onRetry={() => void refresh()}
        emptyTitle={
          entries.length === 0 ? "No time tracked yet" : "No matching entries"
        }
        emptyHint={
          entries.length === 0
            ? "Start the timer in the desktop app — sessions sync here for review."
            : "Try a different search, project, or date range."
        }
        emptyAction={
          entries.length === 0 ? (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus size={14} />
              Log time
            </Button>
          ) : undefined
        }
      >
        {(days) => (
          <div className="grid gap-5">
            {days.map(({ day, entries: rows }) => {
              const totals = perDay.get(day);
              return (
                <section key={day} className="grid gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-semibold">{day}</h2>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {totals
                        ? `${formatDurationShort(totals.workMs)} work${totals.breakMs > 0 ? ` · ${formatDurationShort(totals.breakMs)} break` : ""}`
                        : ""}
                    </span>
                  </div>
                  <ul className="grid gap-2">
                    {rows.map((entry) => {
                      const task = taskById.get(entry.taskId);
                      const project = task
                        ? projectById.get(task.projectId)
                        : undefined;
                      const duration = entryDurationMs(
                        entry.startedAt,
                        entry.endedAt,
                      );
                      return (
                        <li
                          key={entry.$id}
                          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                        >
                          <Badge
                            variant={
                              entry.type === "BREAK" ? "secondary" : "outline"
                            }
                          >
                            {entry.type === "BREAK" ? "Break" : "Work"}
                          </Badge>
                          <div className="grid min-w-0 flex-1 gap-0.5">
                            <span className="truncate text-sm font-medium">
                              {task?.title ?? "Deleted task"}
                            </span>
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                              {project && <span>{project.name}</span>}
                              <span className="tabular-nums">
                                {formatInstant(entry.startedAt)}
                                {" → "}
                                {entry.endedAt
                                  ? formatInstant(entry.endedAt)
                                  : "open"}
                              </span>
                              <span className="font-medium text-foreground tabular-nums">
                                {entry.endedAt
                                  ? formatDuration(duration)
                                  : "open"}
                              </span>
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit entry"
                            onClick={() => {
                              setEditing(entry);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete entry"
                            onClick={() => setDeleting(entry)}
                          >
                            <Trash2 size={14} />
                          </Button>
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

      <TimeEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tasks={activeTasks}
        entry={editing}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the session from totals and history. This can&apos;t
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
