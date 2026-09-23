import { ProjectSelect } from "@/components/selectors/project-select";
import { TaskSelect } from "@/components/selectors/task-select";
import { webUrl } from "@/lib/config";
import type { Task } from "@packages/domain/index";
import { Button } from "@packages/ui/components/button";
import { Input } from "@packages/ui/components/input";
import { Label } from "@packages/ui/components/label";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, ListPlus } from "lucide-react";
import { useState } from "react";

type Props = {
  projectId: string | null;
  taskId: string | null;
  onProjectChange: (id: string | null, name: string | null) => void;
  onTaskChange: (id: string | null, title: string | null) => void;
  onQuickAdd: (projectId: string, title: string) => Promise<Task>;
};

// Project + task pickers shared by the "start timer" and "manual entry"
// sheets. Project is required (managed on the web dashboard); task is
// optional and can be quick-added here once a project is chosen. Options are
// searched server-side (async comboboxes) rather than preloaded in full.
export function SessionFields({
  projectId,
  taskId,
  onProjectChange,
  onTaskChange,
  onQuickAdd,
}: Props) {
  const [quickTitle, setQuickTitle] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleQuickAdd() {
    const title = quickTitle.trim();
    if (!title || !projectId || adding) return;
    setAdding(true);
    try {
      const created = await onQuickAdd(projectId, title);
      onTaskChange(created.$id, created.title);
      setQuickTitle("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="session-project">
          Project <span className="text-danger">*</span>
        </Label>
        <ProjectSelect
          id="session-project"
          value={projectId ?? ""}
          onValueChange={(id, name) => {
            onProjectChange(id || null, name);
            onTaskChange(null, null);
          }}
          placeholder="Pick a project"
          className="w-full"
        />
        <p className="text-[11px] text-muted-foreground">
          Don&apos;t see a project?{" "}
          <button
            type="button"
            onClick={() =>
              openUrl(`${webUrl}/dashboard/projects`).catch(() => {})
            }
            className="inline-flex items-center gap-0.5 text-primary underline-offset-2 hover:underline"
          >
            Create one
            <ExternalLink size={10} />
          </button>
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="session-task">Task</Label>
        <TaskSelect
          id="session-task"
          value={taskId ?? ""}
          projectId={projectId ?? undefined}
          onValueChange={(id, title) => onTaskChange(id || null, title)}
          placeholder={projectId ? "No task" : "Pick a project first"}
          className="w-full"
        />
        {projectId && (
          <div className="flex gap-2">
            <Input
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleQuickAdd()}
              placeholder="Quick-add a task…"
              className="h-9"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleQuickAdd()}
              disabled={adding || !quickTitle.trim()}
              className="h-9 shrink-0"
            >
              <ListPlus size={14} />
              Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
