import { useAuth } from "@/lib/auth-context";
import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
  type TaskInput,
} from "@/lib/db";
import { useAsyncAction } from "@/lib/use-async-action";
import type { Task, TaskStatus } from "@packages/domain/index";
import { useCallback, useEffect, useState } from "react";

/** Full task set (all statuses, incl. soft-deleted) — consumers filter locally. */
export function useTasksData() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);

  const {
    run: reload,
    isLoading: loading,
    error,
  } = useAsyncAction(
    useCallback(async () => {
      if (!user) return;
      setTasks(await listTasks(user.$id, { includeDeleted: true }));
    }, [user]),
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useAsyncAction(async (input: TaskInput) => {
    if (!user) throw new Error("Not signed in.");
    const saved = await createTask(user.$id, input);
    setTasks((prev) => [saved, ...prev]);
    return saved;
  });

  const update = useAsyncAction(
    async (
      taskId: string,
      patch: Partial<
        Pick<
          Task,
          "title" | "description" | "priority" | "dueDate" | "projectId"
        >
      > & { status?: TaskStatus },
    ) => {
      const saved = await updateTask(taskId, patch);
      setTasks((prev) => prev.map((t) => (t.$id === saved.$id ? saved : t)));
      return saved;
    },
  );

  const remove = useAsyncAction(async (taskId: string) => {
    await deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.$id !== taskId));
  });

  return {
    tasks,
    setTasks,
    loading,
    error,
    reload,
    create,
    update,
    remove,
  };
}
