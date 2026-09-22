"use client";

import { useAuth } from "@/lib/auth-context";
import { getTask, queryTimeEntries } from "@/lib/db";
import { useAsyncAction } from "@/lib/use-async-action";
import type { Task, TimeEntry } from "@packages/domain/index";
import { entryDurationMs, formatDurationShort } from "@packages/domain/index";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@packages/ui/components/accordion";
import { DataTable } from "@packages/ui/components/data-table";
import { Skeleton } from "@packages/ui/components/skeleton";
import { useCallback, useEffect, useMemo, useState } from "react";
import { dayBounds } from "../lib/date-range";
import type { EntryTypeFilter } from "../types";
import { buildTimeEntryColumns } from "./time-entry-columns";

type Props = {
  day: string;
  timeZone: string;
  typeFilter: EntryTypeFilter;
  taskFilter: string;
  projectFilter: string;
  projectName: (projectId: string) => string;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
  /** Bump to force this day group to refetch independently of the parent list. */
  refreshSignal: number;
};

/** One accordion day group — fetches and owns its own entries independently. */
export function TimeDayGroup({
  day,
  timeZone,
  typeFilter,
  taskFilter,
  projectFilter,
  projectName,
  onEdit,
  onDelete,
  refreshSignal,
}: Props) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [taskById, setTaskById] = useState<Record<string, Task | null>>({});

  const {
    run: reload,
    isLoading: loading,
    error,
  } = useAsyncAction(
    useCallback(async () => {
      if (!user) return;
      const { from, to } = dayBounds(day);
      const { entries: rows } = await queryTimeEntries(user.$id, {
        type: typeFilter,
        taskId: taskFilter || undefined,
        projectId: taskFilter ? undefined : projectFilter || undefined,
        from,
        to,
        limit: 50,
      });
      setEntries(rows);
      const uniqueTaskIds = Array.from(new Set(rows.map((e) => e.taskId)));
      const tasks = await Promise.all(uniqueTaskIds.map((id) => getTask(id)));
      setTaskById(
        Object.fromEntries(
          uniqueTaskIds.map((id, i) => [id, tasks[i] ?? null]),
        ),
      );
    }, [user, day, typeFilter, taskFilter, projectFilter]),
  );

  useEffect(() => {
    void reload();
    // Also refetch whenever the parent list signals a mutation happened.
  }, [reload, refreshSignal]);

  let workMs = 0;
  let breakMs = 0;
  for (const e of entries) {
    const ms = entryDurationMs(e.startedAt, e.endedAt);
    if (e.type === "BREAK") breakMs += ms;
    else workMs += ms;
  }

  const columns = useMemo(
    () =>
      buildTimeEntryColumns({
        timeZone,
        taskById,
        projectName,
        onEdit,
        onDelete,
      }),
    [timeZone, taskById, projectName, onEdit, onDelete],
  );

  return (
    <AccordionItem
      value={day}
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <AccordionTrigger className="px-3 py-2.5 hover:no-underline aria-expanded:border-b aria-expanded:border-border">
        <span className="flex flex-1 items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">{day}</span>
          {loading ? (
            <Skeleton className="h-3 w-24" />
          ) : error ? (
            <span className="text-xs text-destructive">Failed to load</span>
          ) : (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatDurationShort(workMs)} work
              {breakMs > 0 ? ` · ${formatDurationShort(breakMs)} break` : ""}
            </span>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-3 pb-3">
        <DataTable
          columns={columns}
          data={entries}
          loading={loading}
          error={error}
          onRetry={() => void reload()}
          emptyTitle="No entries"
          skeletonRows={2}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
