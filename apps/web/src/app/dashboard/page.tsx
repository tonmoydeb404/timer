"use client";

import { Badge } from "@packages/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { DataState } from "@packages/ui/components/data-state";
import {
  aggregateByProject,
  aggregateDayTotals,
  dayKey,
  entryDurationMs,
  formatDuration,
  formatDurationShort,
  lastNDayKeys,
  sumDayTotals,
  type Project,
  type Task,
  type TimeEntry,
} from "@packages/domain/index";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { appPaths } from "@/config/paths-config";
import { useAuth } from "@/lib/auth-context";
import {
  ensureUserSetup,
  getProfile,
  listProjects,
  listTasks,
  listTimeEntries,
} from "@/lib/db";

type OverviewData = {
  timeZone: string;
  projects: Project[];
  tasks: Task[];
  entries: TimeEntry[];
};

// Phase 5 overview: real analytics derived from closed time entries.
// Midnight-split day totals come from @packages/domain; duration is always
// derived from timestamps (never stored).
export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const setupRan = useRef(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(appPaths.login);
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !user || setupRan.current) return;
    setupRan.current = true;
    ensureUserSetup({
      userId: user.$id,
      name: user.name,
      email: user.email,
    }).catch((err) => {
      setSetupError(err instanceof Error ? err.message : String(err));
    });
  }, [loading, user]);

  const load = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    setDataError(null);
    try {
      const [profile, projects, tasks, entries] = await Promise.all([
        getProfile(user.$id),
        listProjects(user.$id, true, true),
        listTasks(user.$id, { includeDeleted: true }),
        listTimeEntries(user.$id, { limit: 500 }),
      ]);
      const timeZone =
        profile?.timezone ||
        (typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "UTC");
      setData({ timeZone, projects, tasks, entries });
    } catch (err) {
      setDataError(err instanceof Error ? err.message : "Couldn't load overview.");
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && user) void load();
  }, [loading, user, load]);

  const analytics = useMemo(() => {
    if (!data) return null;
    const { timeZone, entries, tasks, projects } = data;
    const today = dayKey(Date.now(), timeZone);
    const perDay = aggregateDayTotals(entries, timeZone);
    const byDayMap = new Map(perDay.map((d) => [d.day, d]));
    const last7 = lastNDayKeys(timeZone, 7);
    const last7Totals = last7.map(
      (day) => byDayMap.get(day) ?? { day, workMs: 0, breakMs: 0, totalMs: 0 },
    );
    const todayTotal = byDayMap.get(today) ?? {
      day: today,
      workMs: 0,
      breakMs: 0,
      totalMs: 0,
    };
    const week = sumDayTotals(last7Totals);
    const all = sumDayTotals(perDay);
    const taskToProject: Record<string, string> = {};
    for (const t of tasks) taskToProject[t.$id] = t.projectId;
    const byProject = aggregateByProject(entries, taskToProject).slice(0, 5);
    const projectName = (id: string) =>
      id === "unknown"
        ? "Deleted tasks"
        : (projects.find((p) => p.$id === id)?.name ?? "Unknown project");
    const taskName = (id: string) =>
      tasks.find((t) => t.$id === id)?.title ?? "Deleted task";
    const maxDay = Math.max(1, ...last7Totals.map((d) => d.totalMs));
    const recent = [...entries]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 5);
    return {
      timeZone,
      today,
      todayTotal,
      week,
      all,
      last7Totals,
      maxDay,
      byProject,
      projectName,
      taskName,
      recent,
      entryCount: entries.length,
    };
  }, [data]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!user) return null;

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {user?.name ? `Good to see you, ${user.name.split(" ")[0]}` : "Overview"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your time at a glance — start tracking from the desktop app.
        </p>
        {setupError && (
          <p className="text-sm text-destructive">
            Couldn&apos;t finish account setup: {setupError}
          </p>
        )}
      </div>

      <DataState
        loading={dataLoading}
        error={dataError}
        data={analytics ? [analytics] : []}
        onRetry={() => void load()}
        emptyTitle="No tracked time yet"
        emptyHint="Start the timer in the desktop app — sessions show up here once they sync."
        emptyAction={
          <Link
            href={appPaths.time}
            className="text-sm text-primary hover:underline"
          >
            Review time →
          </Link>
        }
      >
        {(rows) => {
          const a = rows[0];
          if (!a) return null;
          return (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Today</CardTitle>
                  <CardDescription>
                    {a.today} · {a.timeZone}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatDurationShort(a.todayTotal.workMs)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.todayTotal.breakMs > 0
                      ? `${formatDurationShort(a.todayTotal.breakMs)} on break · ${formatDurationShort(a.todayTotal.totalMs)} total`
                      : a.todayTotal.totalMs > 0
                        ? `${formatDurationShort(a.todayTotal.totalMs)} total`
                        : "Nothing tracked yet today."}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Last 7 days</CardTitle>
                  <CardDescription>Work vs break, midnight-split</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatDurationShort(a.week.workMs)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.week.breakMs > 0
                      ? `${formatDurationShort(a.week.breakMs)} on break`
                      : "No breaks logged."}{" "}
                    · {a.entryCount} sessions all-time
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">All time</CardTitle>
                  <CardDescription>Every synced session</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatDurationShort(a.all.workMs)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(a.all.totalMs)} total incl. breaks
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Daily totals
                  </CardTitle>
                  <CardDescription>Last 7 days in {a.timeZone}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex h-32 items-end gap-2" aria-hidden="true">
                    {a.last7Totals.map((d) => (
                      <div
                        key={d.day}
                        className="grid flex-1 content-end gap-1"
                        title={`${d.day}: ${formatDurationShort(d.workMs)} work, ${formatDurationShort(d.breakMs)} break`}
                      >
                        <div className="grid content-end gap-0.5">
                          <div
                            className="rounded-sm bg-primary/80"
                            style={{
                              height: `${Math.max(2, (d.workMs / a.maxDay) * 96)}px`,
                            }}
                          />
                          {d.breakMs > 0 && (
                            <div
                              className="rounded-sm bg-amber-500/70"
                              style={{
                                height: `${Math.max(2, (d.breakMs / a.maxDay) * 96)}px`,
                              }}
                            />
                          )}
                        </div>
                        <span className="truncate text-center text-[10px] text-muted-foreground">
                          {d.day.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm bg-primary/80" /> Work
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm bg-amber-500/70" /> Break
                    </span>
                    <Link
                      href={appPaths.time}
                      className="ms-auto text-primary hover:underline"
                    >
                      Review time →
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Top projects
                  </CardTitle>
                  <CardDescription>By tracked time</CardDescription>
                </CardHeader>
                <CardContent>
                  {a.byProject.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nothing yet — tracked time will rank projects here.
                    </p>
                  ) : (
                    <ul className="grid gap-2">
                      {a.byProject.map((p) => (
                        <li
                          key={p.projectId}
                          className="flex items-center gap-3 rounded-lg border border-border p-2.5"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {a.projectName(p.projectId)}
                          </span>
                          <Badge variant="outline" className="tabular-nums">
                            {formatDurationShort(p.workMs)}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Recent sessions
                </CardTitle>
                <CardDescription>Latest synced entries</CardDescription>
              </CardHeader>
              <CardContent>
                {a.recent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No sessions yet.
                  </p>
                ) : (
                  <ul className="grid gap-2">
                    {a.recent.map((e) => (
                      <li
                        key={e.$id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2.5 text-sm"
                      >
                        <Badge
                          variant={e.type === "BREAK" ? "secondary" : "outline"}
                        >
                          {e.type === "BREAK" ? "Break" : "Work"}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {a.taskName(e.taskId)}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatDuration(
                            entryDurationMs(e.startedAt, e.endedAt),
                          )}{" "}
                          · {e.startedAt.slice(0, 16).replace("T", " ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
          );
        }}
      </DataState>
    </div>
  );
}
