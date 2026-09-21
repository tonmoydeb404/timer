"use client";

import { Badge } from "@packages/ui/components/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Project } from "@packages/domain/index";
import { appPaths } from "@/config/paths-config";
import { useAuth } from "@/lib/auth-context";
import { getProject, listProjects } from "@/lib/db";
import { TaskList } from "@/components/tasks/task-list";

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getProject(projectId), listProjects(user.$id)])
      .then(([p, all]) => {
        setProject(p);
        setProjects(all);
      })
      .finally(() => setLoading(false));
  }, [user, projectId]);

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
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.status === "ARCHIVED" && (
            <Badge variant="secondary">Archived</Badge>
          )}
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      <TaskList userId={user.$id} projects={projects} presetProjectId={project.$id} />
    </div>
  );
}
