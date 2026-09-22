"use client";

import { useTasks } from "@/contexts/app/app-context";
import type { Project, Task, TaskPriority } from "@packages/domain/index";
import { Button } from "@packages/ui/components/button";
import { Input } from "@packages/ui/components/input";
import { ResponsiveSheet } from "@packages/ui/components/responsive-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@packages/ui/components/select";
import { Textarea } from "@packages/ui/components/textarea";
import { useEffect, useState } from "react";

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  /** Edit target; null/undefined = create mode. */
  task?: Task | null;
  /** Lock the project picker (e.g. quick-add inside a project). */
  fixedProjectId?: string;
  onSaved?: (task: Task) => void;
};

export function TaskFormDialog({
  open,
  onOpenChange,
  projects,
  task,
  fixedProjectId,
  onSaved,
}: Props) {
  const { create, update } = useTasks();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const saving = create.isLoading || update.isLoading;
  const error = validationError || create.error || update.error;

  useEffect(() => {
    if (!open) return;
    setValidationError(null);
    setTitle(task?.title ?? "");
    setProjectId(task?.projectId ?? fixedProjectId ?? projects[0]?.$id ?? "");
    setPriority(task?.priority ?? "MEDIUM");
    setDueDate(task?.dueDate ? task.dueDate.slice(0, 10) : "");
    setDescription(task?.description ?? "");
  }, [open, task, fixedProjectId, projects]);

  async function handleSave() {
    if (!title.trim() || !projectId) {
      setValidationError("A title and a project are required.");
      return;
    }
    setValidationError(null);
    try {
      const saved = task
        ? await update.run(task.$id, {
            title: title.trim(),
            projectId,
            priority,
            dueDate: dueDate || null,
            description: description.trim() || null,
          })
        : await create.run({
            title: title.trim(),
            projectId,
            priority,
            dueDate: dueDate || null,
            description: description.trim() || null,
          });
      onSaved?.(saved);
      onOpenChange(false);
    } catch {
      // Surfaced via createError/updateError from the hook.
    }
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={task ? "Edit task" : "New task"}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : task ? "Save changes" : "Create task"}
          </Button>
        </>
      }
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs doing?"
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3">
        <Select
          value={projectId}
          onValueChange={(v) => setProjectId(v ?? "")}
          disabled={Boolean(fixedProjectId)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.$id} value={p.$id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priority}
          onValueChange={(v) => setPriority(v as TaskPriority)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Details (optional)"
        rows={3}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </ResponsiveSheet>
  );
}
