"use client";

import { useProjects } from "@/contexts/app/app-context";
import type { Project } from "@packages/domain/index";
import { Button } from "@packages/ui/components/button";
import { Input } from "@packages/ui/components/input";
import { ResponsiveSheet } from "@packages/ui/components/responsive-sheet";
import { Textarea } from "@packages/ui/components/textarea";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit target; null/undefined = create mode. */
  project?: Project | null;
  onSaved?: (project: Project) => void;
};

export function ProjectDialog({ open, onOpenChange, project, onSaved }: Props) {
  const { create, update } = useProjects();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const saving = create.isLoading || update.isLoading;
  const error = validationError || create.error || update.error;

  useEffect(() => {
    if (!open) return;
    setValidationError(null);
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
  }, [open, project]);

  async function handleSave() {
    if (!name.trim()) {
      setValidationError("A project name is required.");
      return;
    }
    setValidationError(null);
    try {
      const saved = project
        ? await update.run(project.$id, {
            name: name.trim(),
            description: description.trim() || null,
          })
        : await create.run({
            name: name.trim(),
            description: description.trim() || null,
          });
      onSaved?.(saved);
      onOpenChange(false);
    } catch {
      // Surfaced via create.error/update.error from the hook.
    }
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={project ? "Rename project" : "New project"}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : project ? "Save changes" : "Create project"}
          </Button>
        </>
      }
    >
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
    </ResponsiveSheet>
  );
}
