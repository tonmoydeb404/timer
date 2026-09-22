"use client";

import { TaskList } from "@/components/tasks/task-list";
import { appPaths } from "@/config/paths-config";
import { useProjects } from "@/contexts/app/app-context";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@packages/ui/components/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { projects: allProjects, loading } = useProjects();
  const projects = allProjects.filter((p) => !p.deletedAt);
  const project = projects.find((p) => p.$id === projectId) ?? null;

  if (!user) return null;
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!project) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          This project doesn&apos;t exist or was deleted.
        </p>
        <Link
          href={appPaths.projects}
          className="text-sm text-primary hover:underline"
        >
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Link
          href={appPaths.projects}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Projects
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          {project.status === "ARCHIVED" && (
            <Badge variant="secondary">Archived</Badge>
          )}
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      <TaskList projects={projects} presetProjectId={project.$id} />
    </div>
  );
}
