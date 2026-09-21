"use client";

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
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Project, Task } from "@packages/domain/index";
import { appPaths } from "@/config/paths-config";
import { useAuth } from "@/lib/auth-context";
import { deleteProject, listProjects, listTasks, updateProject } from "@/lib/db";
import { ProjectDialog } from "@/components/projects/project-dialog";

export function ProjectsClient() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listProjects(user.$id)
      .then(async (list) => {
        setProjects(list);
        const tasks: Task[] = await listTasks(user.$id);
        const counts: Record<string, number> = {};
        for (const t of tasks) counts[t.projectId] = (counts[t.projectId] ?? 0) + 1;
        setTaskCounts(counts);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load projects."),
      )
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  async function toggleArchive(project: Project) {
    setActionError(null);
    const next = project.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";
    setProjects((prev) =>
      prev.map((p) => (p.$id === project.$id ? { ...p, status: next } : p)),
    );
    try {
      const saved = await updateProject(project.$id, { status: next });
      setProjects((prev) => prev.map((p) => (p.$id === saved.$id ? saved : p)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update the project.");
    }
  }

  async function confirmDelete() {
    if (!deleting || !user) return;
    const id = deleting.$id;
    setDeleting(null);
    setActionError(null);
    try {
      await deleteProject(user.$id, id);
      setProjects((prev) => prev.filter((p) => p.$id !== id));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Couldn't delete the project.",
      );
    }
  }

  const active = projects.filter((p) => p.status === "ACTIVE");
  const archived = projects.filter((p) => p.status === "ARCHIVED");

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

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {!loading && !error && projects.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No projects yet — create the first one.
        </p>
      )}

      {active.length > 0 && (
        <ul className="grid gap-2">{active.map(renderRow)}</ul>
      )}

      {archived.length > 0 && (
        <div className="grid gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Archived</h2>
          <ul className="grid gap-2">{archived.map(renderRow)}</ul>
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={user.$id}
        project={editing}
        onSaved={(saved) => {
          setProjects((prev) => {
            const exists = prev.some((p) => p.$id === saved.$id);
            return exists
              ? prev.map((p) => (p.$id === saved.$id ? saved : p))
              : [saved, ...prev];
          });
        }}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The project will be hidden everywhere. Projects with active
              tasks can&apos;t be deleted — archive them instead.
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
