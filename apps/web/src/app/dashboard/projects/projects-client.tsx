"use client";

import { ProjectDialog } from "@/components/projects/project-dialog";
import { appPaths } from "@/config/paths-config";
import { useProjects, useTasks } from "@/contexts/app/app-context";
import { useAuth } from "@/lib/auth-context";
import type { Project } from "@packages/domain/index";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@packages/ui/components/alert-dialog";
import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import { DataState } from "@packages/ui/components/data-state";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export function ProjectsClient() {
  const { user } = useAuth();
  const {
    projects: allProjects,
    loading,
    error,
    reload,
    update,
    remove,
  } = useProjects();
  const { tasks: allTasks } = useTasks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const actionError = update.error || remove.error;

  const projects = useMemo(
    () => allProjects.filter((p) => !p.deletedAt),
    [allProjects],
  );
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of allTasks) {
      if (t.deletedAt) continue;
      counts[t.projectId] = (counts[t.projectId] ?? 0) + 1;
    }
    return counts;
  }, [allTasks]);

  if (!user) return null;

  async function toggleArchive(project: Project) {
    const next = project.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";
    try {
      await update.run(project.$id, { status: next });
    } catch {
      // Surfaced via update.error from the hook.
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const id = deleting.$id;
    setDeleting(null);
    try {
      await remove.run(id);
    } catch {
      // Surfaced via remove.error from the hook.
    }
  }

  function renderRow(project: Project) {
    return (
      <li
        key={project.$id}
        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
      >
        <div className="grid min-w-0 flex-1 gap-0.5">
          <Link
            href={appPaths.projectDetails(project.$id)}
            className="truncate text-sm font-medium hover:underline"
          >
            {project.name}
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="outline">
              {taskCounts[project.$id] ?? 0} tasks
            </Badge>
            {project.status === "ARCHIVED" && (
              <Badge variant="secondary">Archived</Badge>
            )}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Rename project"
          onClick={() => {
            setEditing(project);
            setDialogOpen(true);
          }}
        >
          <Pencil size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={project.status === "ARCHIVED" ? "Unarchive" : "Archive"}
          onClick={() => void toggleArchive(project)}
        >
          {project.status === "ARCHIVED" ? (
            <ArchiveRestore size={14} />
          ) : (
            <Archive size={14} />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete project"
          onClick={() => setDeleting(project)}
        >
          <Trash2 size={14} />
        </Button>
      </li>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Containers for related work.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus size={14} />
          New project
        </Button>
      </div>

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <DataState
        loading={loading}
        error={error}
        data={projects}
        onRetry={() => void reload()}
        emptyTitle="No projects yet"
        emptyHint="Create the first one to get started."
      >
        {(rows) => (
          <>
            {rows.some((p) => p.status === "ACTIVE") && (
              <ul className="grid gap-2">
                {rows.filter((p) => p.status === "ACTIVE").map(renderRow)}
              </ul>
            )}
            {rows.some((p) => p.status === "ARCHIVED") && (
              <div className="grid gap-2">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Archived
                </h2>
                <ul className="grid gap-2">
                  {rows.filter((p) => p.status === "ARCHIVED").map(renderRow)}
                </ul>
              </div>
            )}
          </>
        )}
      </DataState>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editing}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The project will be hidden everywhere. Projects with active tasks
              can&apos;t be deleted — archive them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
