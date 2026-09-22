import type { Task } from "@packages/domain/index";
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
import { Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: "bg-destructive/10 text-destructive border-destructive/20",
  MEDIUM: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  LOW: "bg-muted text-muted-foreground",
};

type TaskColumnsOptions = {
  projectName: (projectId: string) => string;
  onToggleDone: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function buildTaskColumns({
  projectName,
  onToggleDone,
  onEdit,
  onDelete,
}: TaskColumnsOptions): ColumnDef<DataTableFeatures, Task>[] {
  return [
    {
      id: "done",
      header: "",
      cell: ({ row }) => {
        const task = row.original;
        return (
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              task.status === "DONE" ? "Reopen task" : "Complete task"
            }
            onClick={() => onToggleDone(task)}
            className={
              task.status === "DONE"
                ? "size-7 rounded-full border border-primary bg-primary text-primary-foreground"
                : "size-7 rounded-full border"
            }
          >
            {task.status === "DONE" && <Check size={14} />}
          </Button>
        );
      },
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <span
          className={
            row.original.status === "DONE"
              ? "text-muted-foreground line-through"
              : "font-medium"
          }
        >
          {row.original.title}
        </span>
      ),
    },
    {
      id: "project",
      header: "Project",
      cell: ({ row }) => (
        <Badge variant="outline">{projectName(row.original.projectId)}</Badge>
      ),
    },
    {
      id: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const priority = row.original.priority;
        return (
          <Badge variant="outline" className={PRIORITY_STYLES[priority]}>
            {priority.charAt(0) + priority.slice(1).toLowerCase()}
          </Badge>
        );
      },
    },
    {
      id: "dueDate",
      header: "Due",
      cell: ({ row }) =>
        row.original.dueDate ? (
          <span className="text-xs text-muted-foreground">
            {row.original.dueDate.slice(0, 10)}
          </span>
        ) : null,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const task = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Task actions">
                  <MoreHorizontal size={14} />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil size={14} />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(task)}
              >
                <Trash2 size={14} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
