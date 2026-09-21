import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import { DataState } from "@packages/ui/components/data-state";
import { Input } from "@packages/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@packages/ui/components/select";
import { ListPlus, RotateCw, Crosshair } from "lucide-react";
import { useMemo, useState } from "react";
import { useTimer } from "@/context/timer-context";
import { useTasks } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";

// Tasks tab: search, full active-task list, quick-add. Management
// (edit/delete) stays on the web dashboard.
export function TasksScreen() {
  const { projects, tasks, loading, error, refresh, quickAdd } = useTasks();
  const { focusId, setFocusId } = useTimer();
  const [search, setSearch] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickProject, setQuickProject] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [tasks, search]);

  const projectName = (projectId: string) =>
    projects.find((p) => p.$id === projectId)?.name ?? "Unknown";

  async function handleQuickAdd() {
    const title = quickTitle.trim();
    if (!title || !quickProject || adding) return;
    setAdding(true);
    setAddError(null);
    try {
      await quickAdd(quickProject, title);
      setQuickTitle("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="mx-auto grid h-full w-full max-w-[420px] content-start gap-3 overflow-y-auto scrollbar-thin px-3.5 pt-2 pb-4">
      <div className="flex items-center gap-2">
        <h1 className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Tasks
        </h1>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh tasks"
          onClick={() => void refresh()}
          className="h-7 w-7"
        >
          <RotateCw size={13} />
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search tasks…"
        className="h-9"
      />

      <DataState
        loading={loading}
        error={error}
        data={visible}
        onRetry={() => void refresh()}
        skeletonCount={4}
        emptyTitle={tasks.length === 0 ? "No tasks yet" : "No matching tasks"}
        emptyHint={
          tasks.length === 0
            ? "Quick-add below, or manage tasks on the web dashboard."
            : "Try a different search."
        }
      >
        {(rows) => (
          <ul className="grid gap-2">
            {rows.map((task) => (
              <li
                key={task.$id}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm"
              >
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                  {task.title}
                </span>
                <Badge variant="outline" className="shrink-0">
                  {projectName(task.projectId)}
                </Badge>
                <button
                  type="button"
                  title={
                    task.$id === focusId ? "Focused task" : "Focus this task"
                  }
                  aria-label={
                    task.$id === focusId
                      ? "Focused task"
                      : `Focus ${task.title}`
                  }
                  onClick={() => setFocusId(task.$id)}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
                    task.$id === focusId
                      ? "bg-emerald-600 text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-ink",
                  )}
                >
                  <Crosshair size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DataState>

      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <Select
          value={quickProject}
          onValueChange={(v) => setQuickProject(v ?? "")}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.$id} value={p.$id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleQuickAdd()}
            placeholder="Quick-add a task…"
            className="h-9"
          />
          <Button
            onClick={() => void handleQuickAdd()}
            disabled={adding || !quickTitle.trim() || !quickProject}
            className="h-9 shrink-0"
          >
            <ListPlus size={14} />
            Add
          </Button>
        </div>
        {addError && <p className="text-xs text-danger">{addError}</p>}
        {projects.length === 0 && !loading && (
          <p className="text-[11px] text-muted-foreground">
            No projects yet — create one on the web dashboard first.
          </p>
        )}
      </div>
    </section>
  );
}
