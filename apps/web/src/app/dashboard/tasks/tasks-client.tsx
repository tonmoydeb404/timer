"use client";

import { TaskList } from "@/components/tasks/task-list";
import { useProjects } from "@/contexts/app/app-context";
import { useAuth } from "@/lib/auth-context";

export function TasksClient() {
  const { user } = useAuth();
  const { projects, loading } = useProjects();
  const activeProjects = projects.filter((p) => !p.deletedAt);

  if (!user) return null;

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Everything across all projects.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <TaskList projects={activeProjects} />
      )}
    </div>
  );
}
