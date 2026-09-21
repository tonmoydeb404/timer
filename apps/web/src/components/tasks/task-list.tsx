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
import { Input } from "@packages/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@packages/ui/components/select";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Project,
  Task,
  TaskStatus,
} from "@packages/domain/index";
import { cn } from "@/lib/utils";
import { deleteTask, listTasks, updateTask } from "@/lib/db";
import { TaskFormDialog } from "./task-form-dialog";

const STATUS_FILTERS: { value: TaskStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DONE", label: "Done" },
];

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: "bg-destructive/10 text-destructive border-destructive/20",
  MEDIUM: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  LOW: "bg-muted text-muted-foreground",
};

type Props = {
  userId: string;
  projects: Project[];
  /** When set, the list is scoped to one project (filter UI hidden). */
  presetProjectId?: string;
  /** Extra header actions (e.g. a New-task button owned by the page). */
  actions?: React.ReactNode;
};

export function TaskList({ userId, projects, presetProjectId, actions }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const projectName = useCallback(
    (projectId: string) =>
      projects.find((p) => p.$id === projectId)?.name ?? "Unknown",
    [projects],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTasks(
        await listTasks(userId, presetProjectId ? { projectId: presetProjectId } : {}),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load tasks.");
    } finally {
      setLoading(false);
    }
  }, [userId, presetProjectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (!presetProjectId && projectFilter !== "ALL" && t.projectId !== projectFilter)
        return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, search, statusFilter, projectFilter, presetProjectId]);

  async function toggleDone(task: Task) {
    const next: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";
    setTasks((prev) => prev.map((t) => (t.$id === task.$id ? { ...t, status: next } : t)));
    try {
      const saved = await updateTask(task.$id, { status: next });
      setTasks((prev) => prev.map((t) => (t.$id === task.$id ? saved : t)));
    } catch {
      void refresh();
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const id = deleting.$id;
    setDeleting(null);
    setTasks((prev) => prev.filter((t) => t.$id !== id));
    try {
      await deleteTask(id);
    } catch {
      void refresh();
    }
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks…"
          className="h-9 max-w-56"
        />
        {!presetProjectId && (
          <Select value={projectFilter} onValueChange={(v) => setProjectFilter(v ?? "ALL")}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.$id} value={p.$id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <span className="ms-auto flex gap-2">
          {actions}
          {!actions && (
            <Button size="sm" onClick={openCreate}>
              <Plus size={14} />
              New task
            </Button>
          )}
        </span>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading tasks…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && !error && visible.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {tasks.length === 0
            ? "No tasks yet — create the first one."
            : "No tasks match these filters."}
        </p>
      )}

      <ul className="grid gap-2">
        {visible.map((task) => (
          <li
            key={task.$id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <Button
              variant="ghost"
              size="icon"
              aria-label={task.status === "DONE" ? "Reopen task" : "Complete task"}
              onClick={() => void toggleDone(task)}
              className={cn(
                "h-7 w-7 shrink-0 rounded-full border",
                task.status === "DONE" &&
                  "border-primary bg-primary text-primary-foreground",
              )}
            >
              {task.status === "DONE" && <Check size={14} />}
            </Button>
            <div className="grid min-w-0 flex-1 gap-0.5">
              <span
                className={cn(
                  "truncate text-sm font-medium",
                  task.status === "DONE" && "text-muted-foreground line-through",
                )}
              >
                {task.title}
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                {!presetProjectId && (
                  <Badge variant="outline">{projectName(task.projectId)}</Badge>
                )}
                <Badge variant="outline" className={PRIORITY_STYLES[task.priority]}>
                  {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                </Badge>
                {task.status === "IN_PROGRESS" && (
                  <Badge variant="secondary">In progress</Badge>
                )}
                {task.dueDate && (
                  <span className="text-xs text-muted-foreground">
                    Due {task.dueDate.slice(0, 10)}
                  </span>
                )}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit task"
              onClick={() => {
                setEditing(task);
                setDialogOpen(true);
              }}
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete task"
              onClick={() => setDeleting(task)}
            >
              <Trash2 size={14} />
            </Button>
          </li>
        ))}
      </ul>

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={userId}
        projects={projects}
        task={editing}
        fixedProjectId={presetProjectId}
        onSaved={(saved) => {
          setTasks((prev) => {
            const exists = prev.some((t) => t.$id === saved.$id);
            const next = exists
              ? prev.map((t) => (t.$id === saved.$id ? saved : t))
              : [saved, ...prev];
            return next.sort((a, b) => b.$updatedAt.localeCompare(a.$updatedAt));
          });
        }}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” will be hidden everywhere. Tracked time is
              kept and can still be reviewed later.
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
