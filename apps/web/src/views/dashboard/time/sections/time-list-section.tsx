"use client";

import { ProjectSelect } from "@/components/selectors/project-select";
import { TaskSelect } from "@/components/selectors/task-select";
import { useProjects } from "@/contexts/app/app-context";
import type { TimeEntry } from "@packages/domain/index";
import { Accordion } from "@packages/ui/components/accordion";
import { Button } from "@packages/ui/components/button";
import { DataState } from "@packages/ui/components/data-state";
import { PaginationControl } from "@packages/ui/components/pagination-control";
import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import type { EntryTypeFilter } from "../types";
import type { useTimeDayGroups } from "../use-time-day-groups";
import { CreateTimeEntryModal } from "./create-time-entry-modal";
import { DeleteTimeEntryModal } from "./delete-time-entry-modal";
import { TimeDayGroup } from "./time-day-group";
import { UpdateTimeEntryModal } from "./update-time-entry-modal";

const TYPE_FILTERS: { value: EntryTypeFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "WORK", label: "Work" },
  { value: "BREAK", label: "Break" },
];

export type TimeListSectionHandle = {
  openCreate: () => void;
};

type Props = ReturnType<typeof useTimeDayGroups>;

export const TimeListSection = forwardRef<TimeListSectionHandle, Props>(
  function TimeListSection(
    {
      days,
      total,
      loading,
      error,
      timeZone,
      typeFilter,
      setTypeFilter,
      projectFilter,
      setProjectFilter,
      taskFilter,
      setTaskFilter,
      page,
      setPage,
      pageCount,
      reload,
      refreshSignal,
      notifyChanged,
    },
    ref,
  ) {
    const { projects: allProjects } = useProjects();

    const projectName = useCallback(
      (projectId: string) =>
        allProjects.find((p) => p.$id === projectId)?.name ?? "Unknown",
      [allProjects],
    );

    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<TimeEntry | null>(null);
    const [deleting, setDeleting] = useState<TimeEntry | null>(null);

    useImperativeHandle(ref, () => ({
      openCreate: () => setCreateOpen(true),
    }));

    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <TaskSelect
            value={taskFilter}
            onValueChange={setTaskFilter}
            placeholder="All tasks"
            extraOption={{ value: "", label: "All tasks" }}
            className="h-9 w-44"
          />
          <ProjectSelect
            value={projectFilter}
            onValueChange={setProjectFilter}
            placeholder="All projects"
            extraOption={{ value: "", label: "All projects" }}
            disabled={Boolean(taskFilter)}
            className="h-9 w-44"
          />
          <div className="flex gap-1">
            {TYPE_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={typeFilter === f.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTypeFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        <DataState
          loading={loading}
          error={error}
          data={days}
          onRetry={() => void reload()}
          emptyTitle={
            total === 0 ? "No time tracked yet" : "No matching entries"
          }
          emptyHint={
            total === 0
              ? "Start the timer in the desktop app — sessions sync here for review."
              : "Try a different task, project, type, or date range."
          }
        >
          {(dayKeys) => (
            <Accordion key={page} defaultValue={dayKeys} className="grid gap-2">
              {dayKeys.map((day) => (
                <TimeDayGroup
                  key={day}
                  day={day}
                  timeZone={timeZone}
                  typeFilter={typeFilter}
                  taskFilter={taskFilter}
                  projectFilter={projectFilter}
                  projectName={projectName}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                  refreshSignal={refreshSignal}
                />
              ))}
            </Accordion>
          )}
        </DataState>

        <PaginationControl
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
        />

        <CreateTimeEntryModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={notifyChanged}
        />
        <UpdateTimeEntryModal
          entry={editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onUpdated={notifyChanged}
        />
        <DeleteTimeEntryModal
          entry={deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          onDeleted={notifyChanged}
        />
      </div>
    );
  },
);
