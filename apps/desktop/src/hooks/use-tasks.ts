import { useCallback, useEffect, useState } from "react";
import type { Project, Task } from "@packages/domain/index";
import { api } from "@/lib/api";

// Shared project/task fetching for the tab screens. Reads are live from
// Appwrite through Rust; the timer (Phase 3) will add local state on top.
export function useTasks() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedProjects, fetchedTasks] = await Promise.all([
        api.listProjects(),
        api.listTasks(),
      ]);
      setProjects(fetchedProjects.filter((p) => p.status === "ACTIVE"));
      setTasks(fetchedTasks.filter((t) => t.status !== "DONE"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const quickAdd = useCallback(async (projectId: string, title: string) => {
    const created = await api.createTask(projectId, title);
    setTasks((prev) => [created, ...prev]);
    return created;
  }, []);

  return { projects, tasks, loading, error, refresh, quickAdd };
}
