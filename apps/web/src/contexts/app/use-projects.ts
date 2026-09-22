import { useAuth } from "@/lib/auth-context";
import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
  type ProjectInput,
} from "@/lib/db";
import { useAsyncAction } from "@/lib/use-async-action";
import type { Project, ProjectStatus } from "@packages/domain/index";
import { useCallback, useEffect, useState } from "react";

/** Full project set (all statuses, incl. soft-deleted) — consumers filter locally. */
export function useProjectsData() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);

  const {
    run: reload,
    isLoading: loading,
    error,
  } = useAsyncAction(
    useCallback(async () => {
      if (!user) return;
      setProjects(await listProjects(user.$id, true, true));
    }, [user]),
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useAsyncAction(async (input: ProjectInput) => {
    if (!user) throw new Error("Not signed in.");
    const saved = await createProject(user.$id, input);
    setProjects((prev) => [saved, ...prev]);
    return saved;
  });

  const update = useAsyncAction(
    async (
      projectId: string,
      patch: Partial<ProjectInput & { status: ProjectStatus }>,
    ) => {
      const saved = await updateProject(projectId, patch);
      setProjects((prev) => prev.map((p) => (p.$id === saved.$id ? saved : p)));
      return saved;
    },
  );

  const remove = useAsyncAction(async (projectId: string) => {
    if (!user) throw new Error("Not signed in.");
    await deleteProject(user.$id, projectId);
    setProjects((prev) => prev.filter((p) => p.$id !== projectId));
  });

  return {
    projects,
    setProjects,
    loading,
    error,
    reload,
    create,
    update,
    remove,
  };
}
