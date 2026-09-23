import { useApp } from "@/context/app-context";
import { getTask, queryTasks } from "@/lib/db";
import { useCallback } from "react";
import { AsyncCombobox, type ComboboxOption } from "./async-combobox";

type Props = {
  /** Selected task id, empty string means nothing selected. */
  value: string;
  onValueChange: (taskId: string, title: string | null) => void;
  /** Restrict results to a single project. */
  projectId?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
};

/** Async, debounced task picker backed by `queryTasks`. */
export function TaskSelect({
  value,
  onValueChange,
  projectId,
  disabled,
  placeholder = "Search tasks…",
  className,
  id,
}: Props) {
  const { auth } = useApp();
  const userId = auth?.user?.id ?? null;

  const search = useCallback(
    async (query: string): Promise<ComboboxOption[]> => {
      if (!userId) return [];
      const tasks = await queryTasks(userId, { search: query, projectId });
      return tasks.map((t) => ({ value: t.$id, label: t.title }));
    },
    [userId, projectId],
  );

  const resolveLabel = useCallback(
    async (taskId: string): Promise<ComboboxOption | null> => {
      const task = await getTask(taskId);
      return task ? { value: task.$id, label: task.title } : null;
    },
    [],
  );

  return (
    <AsyncCombobox
      id={id}
      value={value}
      onValueChange={(v, option) => onValueChange(v, option?.label ?? null)}
      search={search}
      resolveLabel={resolveLabel}
      placeholder={placeholder}
      emptyText="No tasks found."
      disabled={disabled || !userId || !projectId}
      className={className}
    />
  );
}
