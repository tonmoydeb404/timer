"use client";

import { TaskSelect } from "@/components/selectors/task-select";
import { useTimeEntries } from "@/contexts/app/app-context";
import type { EntryType } from "@packages/domain/index";
import { findOverlap } from "@packages/domain/index";
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
import { localInputToIso } from "../lib/time-input";

const TYPES: EntryType[] = ["WORK", "BREAK"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function CreateTimeEntryModal({ open, onOpenChange, onCreated }: Props) {
  const { create, timeEntries } = useTimeEntries();
  const [taskId, setTaskId] = useState("");
  const [type, setType] = useState<EntryType>("WORK");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValidationError(null);
    setTaskId("");
    setType("WORK");
    setStart("");
    setEnd("");
  }, [open]);

  const error = validationError || create.error;

  async function handleSave() {
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
    if (end && !endedAt) {
      setValidationError("End time is invalid.");
      return;
    }
    if (
      endedAt &&
      new Date(endedAt).getTime() <= new Date(startedAt).getTime()
    ) {
      setValidationError("End must be after start.");
      return;
    }
    if (!endedAt && timeEntries.some((e) => e.endedAt === null)) {
      setValidationError(
        "An entry is already running — stop it before adding another open entry.",
      );
      return;
    }
    if (findOverlap({ startedAt, endedAt }, timeEntries)) {
      setValidationError("This overlaps another entry.");
      return;
    }
    setValidationError(null);
    try {
      await create.run({ taskId, type, startedAt, endedAt });
      onOpenChange(false);
      onCreated();
    } catch {
      // Surfaced via create.error from the hook.
    }
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      variant="dialog"
      title="Log time"
      description="Timestamps are edited — duration is always derived from them. Leave end blank to log an open (still running) entry."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={create.isLoading}>
            {create.isLoading ? "Saving…" : "Log time"}
          </Button>
        </>
      }
    >
      <div className="grid gap-1.5">
        <Label htmlFor="entry-task">Task</Label>
        <TaskSelect id="entry-task" value={taskId} onValueChange={setTaskId} />
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
          <Label htmlFor="entry-end">End (optional)</Label>
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
      {error && <p className="text-sm text-destructive">{error}</p>}
    </ResponsiveSheet>
  );
}
