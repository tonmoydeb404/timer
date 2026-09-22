"use client";

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
import type {
  EntryType,
  Task,
  TimeEntry,
} from "@packages/domain/index";
import { createTimeEntry, updateTimeEntry } from "@/lib/db";

const TYPES: EntryType[] = ["WORK", "BREAK"];

/** ISO UTC → "YYYY-MM-DDTHH:mm" in the browser's local timezone. */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "YYYY-MM-DDTHH:mm" (browser local) → ISO UTC. Empty → null. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  tasks: Task[];
  /** Edit target; null/undefined = log-time mode. */
  entry?: TimeEntry | null;
  onSaved: (entry: TimeEntry) => void;
};

export function TimeEntryDialog({
  open,
  onOpenChange,
  userId,
  tasks,
  entry,
  onSaved,
}: Props) {
  const [taskId, setTaskId] = useState("");
  const [type, setType] = useState<EntryType>("WORK");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTaskId(entry?.taskId ?? tasks[0]?.$id ?? "");
    setType(entry?.type ?? "WORK");
    setStart(isoToLocalInput(entry?.startedAt ?? null));
    setEnd(isoToLocalInput(entry?.endedAt ?? null));
  }, [open, entry, tasks]);

  async function handleSave() {
    if (!taskId) {
      setError("Pick a task for this entry.");
      return;
    }
    const startedAt = localInputToIso(start);
    if (!startedAt) {
      setError("Start time is invalid.");
      return;
    }
    const endedAt = localInputToIso(end);
    if (entry && !endedAt) {
      setError("End time is required — open entries can't sync yet.");
      return;
    }
    if (endedAt && new Date(endedAt).getTime() <= new Date(startedAt).getTime()) {
      setError("End must be after start.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = entry
        ? await updateTimeEntry(entry.$id, {
            taskId,
            type,
            startedAt,
            endedAt,
          })
        : await createTimeEntry(userId, {
            taskId,
            type,
            startedAt,
            endedAt,
          });
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? "Edit time entry" : "Log time"}
      description="Timestamps are edited — duration is always derived from them."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || tasks.length === 0}>
            {saving ? "Saving…" : entry ? "Save changes" : "Log time"}
          </Button>
        </>
      }
    >
      <div className="grid gap-1.5">
        <Label htmlFor="entry-task">Task</Label>
        <Select value={taskId} onValueChange={(v) => setTaskId(v ?? "")}>
          <SelectTrigger id="entry-task">
            <SelectValue placeholder="Pick a task" />
          </SelectTrigger>
          <SelectContent>
            {tasks.map((t) => (
              <SelectItem key={t.$id} value={t.$id}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="entry-type">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
          <SelectTrigger id="entry-type">
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
          <Label htmlFor="entry-start">Start</Label>
          <Input
            id="entry-start"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="entry-end">End</Label>
          <Input
            id="entry-end"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Times use your browser&apos;s timezone; day totals group by your profile
        timezone.
      </p>
      {tasks.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Create a task first — entries must belong to a task.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </ResponsiveSheet>
  );
}
