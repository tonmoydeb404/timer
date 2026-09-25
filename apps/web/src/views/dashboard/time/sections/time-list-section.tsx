"use client";

import { ProjectSelect } from "@/components/selectors/project-select";
import { TaskSelect } from "@/components/selectors/task-select";
import { useProjects } from "@/contexts/app/app-context";
import type { TimeEntry } from "@packages/domain/index";
import { Button } from "@packages/ui/components/button";
import { PaginationControl } from "@packages/ui/components/pagination-control";
import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import type { EntryTypeFilter } from "../types";
import type { useTimeDayGroups } from "../use-time-day-groups";
import { CreateTimeEntryModal } from "./create-time-entry-modal";
import { DeleteTimeEntryModal } from "./delete-time-entry-modal";
import { TimeGroupedTable } from "./time-grouped-table";
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
      visible,
      taskById,
      totalEntries,
      truncated,
      loading,
      isFetching,
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

        <TimeGroupedTable
          visible={visible}
          totalEntries={totalEntries}
          timeZone={timeZone}
          taskById={taskById}
          projectName={projectName}
          onEdit={setEditing}
          onDelete={setDeleting}
          loading={loading}
          isFetching={isFetching}
          error={error}
          onRetry={() => void reload()}
          truncated={truncated}
        />

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
