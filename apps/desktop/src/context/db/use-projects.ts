import { useApp } from "@/context/app-context";
import { listProjects } from "@/lib/db";
import { useAsyncAction } from "@/lib/use-async-action";
import type { Project } from "@packages/domain/index";
import { useCallback, useEffect, useState } from "react";

/** Full project set (all statuses, non-deleted) — consumers filter locally. */
export function useProjectsData() {
  const { auth } = useApp();
  const userId = auth?.user?.id ?? null;
  const [projects, setProjects] = useState<Project[]>([]);

  const {
    run: reload,
    isLoading: loading,
    error,
  } = useAsyncAction(
    useCallback(async () => {
      if (!userId) {
        setProjects([]);
        return;
      }
      setProjects(await listProjects(userId));
    }, [userId]),
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return { projects, loading, error, reload };
}
