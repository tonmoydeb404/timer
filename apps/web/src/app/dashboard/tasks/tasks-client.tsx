"use client";

import { useEffect, useState } from "react";
import type { Project } from "@packages/domain/index";
import { useAuth } from "@/lib/auth-context";
import { listProjects } from "@/lib/db";
import { TaskList } from "@/components/tasks/task-list";

export function TasksClient() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    listProjects(user.$id)
      .then(setProjects)
      .finally(() => setLoading(false));
  }, [user]);

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
        <TaskList userId={user.$id} projects={projects} />
      )}
    </div>
  );
}
