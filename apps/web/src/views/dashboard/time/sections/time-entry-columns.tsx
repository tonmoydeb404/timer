import type { Task, TimeEntry } from "@packages/domain/index";
import { entryDurationMs, formatDuration } from "@packages/domain/index";
import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import type { DataTableFeatures } from "@packages/ui/components/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@packages/ui/components/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

type TimeEntryColumnsOptions = {
  timeZone: string;
  taskById: Record<string, Task | null>;
  projectName: (projectId: string) => string;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
};

export function buildTimeEntryColumns({
  timeZone,
  taskById,
  projectName,
  onEdit,
  onDelete,
}: TimeEntryColumnsOptions): ColumnDef<DataTableFeatures, TimeEntry>[] {
  function formatInstant(iso: string) {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return d.toISOString().slice(11, 16);
    }
  }

  return [
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge
          variant={row.original.type === "BREAK" ? "secondary" : "outline"}
        >
          {row.original.type === "BREAK" ? "Break" : "Work"}
        </Badge>
      ),
    },
    {
      id: "task",
      header: "Task",
      cell: ({ row }) => {
        const task = taskById[row.original.taskId];
        return (
          <span className="font-medium">{task?.title ?? "Deleted task"}</span>
        );
      },
    },
    {
      id: "project",
      header: "Project",
      cell: ({ row }) => {
        const task = taskById[row.original.taskId];
        return task ? (
          <Badge variant="outline">{projectName(task.projectId)}</Badge>
        ) : null;
      },
    },
    {
      id: "when",
      header: "Start → End",
      cell: ({ row }) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatInstant(row.original.startedAt)}
          {" → "}
          {row.original.endedAt ? formatInstant(row.original.endedAt) : "open"}
        </span>
      ),
    },
    {
      id: "duration",
      header: "Duration",
      cell: ({ row }) =>
        row.original.endedAt ? (
          <span className="font-medium tabular-nums">
            {formatDuration(
              entryDurationMs(row.original.startedAt, row.original.endedAt),
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">open</span>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Entry actions"
                  >
                    <MoreHorizontal size={14} />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(entry)}>
                  <Pencil size={14} />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(entry)}
                >
                  <Trash2 size={14} />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
