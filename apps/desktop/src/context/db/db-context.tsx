import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useProjectsData } from "./use-projects";
import { useTasksData } from "./use-tasks";
import { useTimeEntriesData } from "./use-time-entries";

type DbContextValue = {
  projects: ReturnType<typeof useProjectsData>;
  tasks: ReturnType<typeof useTasksData>;
  timeEntries: ReturnType<typeof useTimeEntriesData>;
};

const DbContext = createContext<DbContextValue | null>(null);

/** Shared projects/tasks/time-entries cache for the whole desktop app — one
 * fetch per entity regardless of how many screens read it. */
export function DbProvider({ children }: { children: ReactNode }) {
  const projects = useProjectsData();
  const tasks = useTasksData();
  const timeEntries = useTimeEntriesData();

  const value = useMemo(
    () => ({ projects, tasks, timeEntries }),
    [projects, tasks, timeEntries],
  );

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

function useDbContext(): DbContextValue {
  const ctx = useContext(DbContext);
  if (!ctx) {
    throw new Error(
      "useProjects/useTasks/useTimeEntries must be used within DbProvider",
    );
  }
  return ctx;
}

export function useProjects() {
  return useDbContext().projects;
}

export function useTasks() {
  return useDbContext().tasks;
}

export function useTimeEntries() {
  return useDbContext().timeEntries;
}
