"use client";

import { Button } from "@packages/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@packages/ui/components/dialog";
import { Input } from "@packages/ui/components/input";
import { Textarea } from "@packages/ui/components/textarea";
import { useEffect, useState } from "react";
import type { Project } from "@packages/domain/index";
import { createProject, updateProject } from "@/lib/db";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  /** Edit target; null/undefined = create mode. */
  project?: Project | null;
  onSaved: (project: Project) => void;
};

export function ProjectDialog({ open, onOpenChange, userId, project, onSaved }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
  }, [open, project]);

  async function handleSave() {
    if (!name.trim()) {
      setError("A project name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = project
        ? await updateProject(project.$id, {
            name: name.trim(),
            description: description.trim() || null,
          })
        : await createProject(userId, {
            name: name.trim(),
            description: description.trim() || null,
          });
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{project ? "Rename project" : "New project"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Client Website"
            autoFocus
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this about? (optional)"
            rows={3}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : project ? "Save changes" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
