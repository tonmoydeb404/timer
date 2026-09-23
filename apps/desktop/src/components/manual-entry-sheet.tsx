import { SessionFields } from "@/components/session-fields";
import type { EntryType, Task } from "@packages/domain/index";
import { Button } from "@packages/ui/components/button";
import { Input } from "@packages/ui/components/input";
import { Label } from "@packages/ui/components/label";
import { ResponsiveSheet } from "@packages/ui/components/responsive-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@packages/ui/components/select";
import { useEffect, useState } from "react";

const TYPES: EntryType[] = ["WORK", "BREAK"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onQuickAdd: (projectId: string, title: string) => Promise<Task>;
  onSubmit: (input: {
    projectId: string | null;
    taskId: string | null;
    type: EntryType;
    startedAt: string;
    endedAt: string;
  }) => Promise<void>;
};

// Manual "add time entry" sheet — project is required, task is optional,
// timestamps
// are edited directly (same rule as the web dashboard's log-time modal).
export function ManualEntrySheet({
  open,
  onOpenChange,
  busy,
  onQuickAdd,
  onSubmit,
}: Props) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [type, setType] = useState<EntryType>("WORK");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setProjectId(null);
    setTaskId(null);
    setType("WORK");
    setStart("");
    setEnd("");
    setError(null);
  }, [open]);

  async function handleSubmit() {
    if (!projectId) return setError("Pick a project to continue.");
    const startedAt = start ? new Date(start).toISOString() : null;
    const endedAt = end ? new Date(end).toISOString() : null;
    if (!startedAt) return setError("Start time is invalid.");
    if (!endedAt) return setError("End time is required.");
    if (new Date(endedAt).getTime() <= new Date(startedAt).getTime()) {
      return setError("End must be after start.");
    }
    setError(null);
    await onSubmit({ projectId, taskId, type, startedAt, endedAt });
    onOpenChange(false);
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add manual entry"
      description="A project is required — task is optional. Timestamps use your local time; duration is derived from them."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={busy}>
            Save entry
          </Button>
        </>
      }
    >
      <SessionFields
        projectId={projectId}
        taskId={taskId}
        onProjectChange={(id) => setProjectId(id)}
        onTaskChange={(id) => setTaskId(id)}
        onQuickAdd={onQuickAdd}
      />

      <div className="grid gap-1.5">
        <Label htmlFor="manual-entry-type">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
          <SelectTrigger id="manual-entry-type" className="w-full">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "WORK" ? "Work" : "Break"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="manual-entry-start">Start</Label>
          <Input
            id="manual-entry-start"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="manual-entry-end">End</Label>
          <Input
            id="manual-entry-end"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </ResponsiveSheet>
  );
}
