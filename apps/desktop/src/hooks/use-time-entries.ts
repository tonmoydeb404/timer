import { useCallback, useEffect, useState } from "react";
import type { Profile, Project, Task, TimeEntry } from "@packages/domain/index";
import { useApp } from "@/context/app-context";
import { getProfile, listProjects, listTasks, listTimeEntries } from "@/lib/db";

// Phase 5 reads: synced entries + names + reporting timezone for the Today
// weekly card and the History tab. Editing lives on the web dashboard.
export function useTimeEntries(limit = 200) {
  const { auth } = useApp();
  const userId = auth?.user?.id ?? null;
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      setTasks([]);
      setProjects([]);
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [fetchedProfile, fetchedProjects, fetchedTasks, fetchedEntries] =
        await Promise.all([
          getProfile(userId),
          listProjects(userId),
          listTasks(userId),
          listTimeEntries(userId, limit),
        ]);
      setProfile(fetchedProfile);
      setProjects(fetchedProjects);
      setTasks(fetchedTasks);
      setEntries(fetchedEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const timeZone =
    profile?.timezone ||
    (typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC");

  return { entries, tasks, projects, profile, timeZone, loading, error, refresh };
}
