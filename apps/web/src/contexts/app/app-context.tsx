"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useProjectsData } from "./use-projects";
import { useTasksData } from "./use-tasks";
import { useTimeEntriesData } from "./use-time-entries";

type AppDataContextValue = {
  projects: ReturnType<typeof useProjectsData>;
  tasks: ReturnType<typeof useTasksData>;
  timeEntries: ReturnType<typeof useTimeEntriesData>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

/** Shared projects/tasks/time-entries state for the whole dashboard app. */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const projects = useProjectsData();
  const tasks = useTasksData();
  const timeEntries = useTimeEntriesData();

  const value = useMemo(
    () => ({ projects, tasks, timeEntries }),
    [projects, tasks, timeEntries],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

function useAppDataContext(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error(
      "useProjects/useTasks/useTimeEntries must be used within AppDataProvider",
    );
  }
  return ctx;
}

export function useProjects() {
  return useAppDataContext().projects;
}

export function useTasks() {
  return useAppDataContext().tasks;
}

export function useTimeEntries() {
  return useAppDataContext().timeEntries;
}
