import {
  useProjects,
  useTasks,
  useTimeEntries,
} from "@/contexts/app/app-context";
import { useAuth } from "@/lib/auth-context";
import { getProfile } from "@/lib/db";
import {
  aggregateByProject,
  aggregateDayTotals,
  dayKey,
  lastNDayKeys,
  sumDayTotals,
} from "@packages/domain/index";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardAnalytics } from "./types";

export function useDashboardData() {
  const { user } = useAuth();
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    reload: reloadProjects,
  } = useProjects();
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    reload: reloadTasks,
  } = useTasks();
  const {
    timeEntries: entries,
    loading: entriesLoading,
    error: entriesError,
    reload: reloadEntries,
  } = useTimeEntries();
  const [timeZone, setTimeZone] = useState("UTC");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

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
        err instanceof Error ? err.message : "Couldn't load overview.",
      );
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  // Refetches everything the overview depends on (profile + shared app data).
  const reload = useCallback(() => {
    void loadProfile();
    void reloadProjects();
    void reloadTasks();
    void reloadEntries();
  }, [loadProfile, reloadProjects, reloadTasks, reloadEntries]);

  const loading =
    profileLoading || projectsLoading || tasksLoading || entriesLoading;
  const error = profileError || projectsError || tasksError || entriesError;

  const analytics: DashboardAnalytics | null = useMemo(() => {
    if (!user) return null;
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
  }, [user, timeZone, entries, tasks, projects]);

  return { loading, error, analytics, reload };
}
