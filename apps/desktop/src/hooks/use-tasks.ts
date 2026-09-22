import { useCallback, useEffect, useState } from "react";
import type { Project, Task } from "@packages/domain/index";
import { useApp } from "@/context/app-context";
import { createTask as createTaskDoc, listProjects, listTasks } from "@/lib/db";

// Shared project/task reads for the tab screens. All Appwrite I/O goes
// through the webview SDK (same mechanism as the web app).
export function useTasks() {
  const { auth } = useApp();
  const userId = auth?.user?.id ?? null;
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProjects([]);
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [fetchedProjects, fetchedTasks] = await Promise.all([
        listProjects(userId),
        listTasks(userId),
      ]);
      setProjects(fetchedProjects.filter((p) => p.status === "ACTIVE"));
      setTasks(fetchedTasks.filter((t) => t.status !== "DONE"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const quickAdd = useCallback(
    async (projectId: string, title: string) => {
      if (!userId) throw new Error("You're signed out.");
      const created = await createTaskDoc(userId, projectId, title);
      setTasks((prev) => [created, ...prev]);
      return created;
    },
    [userId],
  );

  return { projects, tasks, loading, error, refresh, quickAdd };
}
