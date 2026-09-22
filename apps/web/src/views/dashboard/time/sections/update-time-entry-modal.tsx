"use client";

import { TaskSelect } from "@/components/selectors/task-select";
import { useTimeEntries } from "@/contexts/app/app-context";
import type { EntryType, TimeEntry } from "@packages/domain/index";
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
import { isoToLocalInput, localInputToIso } from "../lib/time-input";

const TYPES: EntryType[] = ["WORK", "BREAK"];

type Props = {
  /** Edit target; modal is open whenever this is non-null. */
  entry: TimeEntry | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
};

export function UpdateTimeEntryModal({
  entry,
  onOpenChange,
  onUpdated,
}: Props) {
  const { update } = useTimeEntries();
  const [taskId, setTaskId] = useState("");
  const [type, setType] = useState<EntryType>("WORK");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    setValidationError(null);
    setTaskId(entry.taskId);
    setType(entry.type);
    setStart(isoToLocalInput(entry.startedAt));
    setEnd(isoToLocalInput(entry.endedAt));
  }, [entry]);

  const error = validationError || update.error;

  async function handleSave() {
    if (!entry) return;
    if (!taskId) {
      setValidationError("Pick a task for this entry.");
      return;
    }
    const startedAt = localInputToIso(start);
    if (!startedAt) {
      setValidationError("Start time is invalid.");
      return;
    }
    const endedAt = localInputToIso(end);
    if (!endedAt) {
      setValidationError("End time is required — open entries can't sync yet.");
      return;
    }
    if (new Date(endedAt).getTime() <= new Date(startedAt).getTime()) {
      setValidationError("End must be after start.");
      return;
    }
    setValidationError(null);
    try {
      await update.run(entry.$id, { taskId, type, startedAt, endedAt });
      onOpenChange(false);
      onUpdated();
    } catch {
      // Surfaced via update.error from the hook.
    }
  }

  return (
    <ResponsiveSheet
      open={entry !== null}
      onOpenChange={onOpenChange}
      title="Edit time entry"
      description="Timestamps are edited — duration is always derived from them."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={update.isLoading}>
            {update.isLoading ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="grid gap-1.5">
        <Label htmlFor="edit-entry-task">Task</Label>
        <TaskSelect
          id="edit-entry-task"
          value={taskId}
          onValueChange={setTaskId}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="edit-entry-type">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
          <SelectTrigger id="edit-entry-type">
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
          <Label htmlFor="edit-entry-start">Start</Label>
          <Input
            id="edit-entry-start"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-entry-end">End</Label>
          <Input
            id="edit-entry-end"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </ResponsiveSheet>
  );
}
