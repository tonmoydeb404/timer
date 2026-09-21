import { Button } from "@packages/ui/components/button";
import { DataState } from "@packages/ui/components/data-state";
import { Input } from "@packages/ui/components/input";
import { Badge } from "@packages/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@packages/ui/components/select";
import { ListPlus, LogOut, RotateCw, Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Project, Task } from "@packages/domain/index";
import { useApp } from "@/context/app-context";
import { api } from "@/lib/api";

// Phase 2: today's tasks (live from Appwrite) + quick-add. Timer UI lands
// in Phase 3; full task management stays on the web dashboard.
export function HomeScreen() {
  const { auth, signOut } = useApp();
  const user = auth?.user;
  const offline = auth?.status === "unknown";

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickProject, setQuickProject] = useState("");
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedProjects, fetchedTasks] = await Promise.all([
        api.listProjects(),
        api.listTasks(),
      ]);
      setProjects(fetchedProjects.filter((p) => p.status === "ACTIVE"));
      setTasks(fetchedTasks.filter((t) => t.status !== "DONE"));
      setQuickProject((prev) => {
        if (prev) return prev;
        return fetchedProjects.find((p) => p.status === "ACTIVE")?.$id ?? "";
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [tasks, search]);

  const projectName = useCallback(
    (projectId: string) =>
      projects.find((p) => p.$id === projectId)?.name ?? "Unknown",
    [projects],
  );

  async function handleQuickAdd() {
    const title = quickTitle.trim();
    if (!title || !quickProject || adding) return;
    setAdding(true);
    try {
      const created = await api.createTask(quickProject, title);
      setTasks((prev) => [created, ...prev]);
      setQuickTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="min-h-0 flex-1 overflow-auto scrollbar-thin p-4">
      <div className="mx-auto grid max-w-md gap-5">
        <div className="grid gap-1 text-center">
          <h1 className="text-xl font-[760] text-ink">Today</h1>
          <p className="text-[0.82rem] text-muted-foreground">
            {user ? `Tracking as ${user.name || user.email}` : "Today's work"}
          </p>
        </div>

        {offline && (
          <p className="rounded-lg bg-inset p-3 text-center text-[0.78rem] text-muted-foreground">
            Couldn&apos;t reach Appwrite — showing the last known session.
          </p>
        )}

        <div className="grid justify-items-center gap-3 rounded-xl border border-border bg-surface p-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-inset text-muted-foreground">
            <Timer size={22} />
          </span>
          <p className="text-[0.84rem] font-medium text-ink">
            No timer running
          </p>
          <p className="max-w-xs text-[0.78rem] text-muted-foreground">
            Time tracking arrives in Phase 3 — pick a task below when it does.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[0.84rem] font-semibold text-ink">
              Today&apos;s tasks
            </h2>
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
            emptyTitle={
              tasks.length === 0 ? "No active tasks" : "No matching tasks"
            }
            emptyHint={
              tasks.length === 0
                ? "Add one below, or manage tasks on the web dashboard."
                : "Try a different search."
            }
          >
            {(rows) => (
              <ul className="grid gap-2">
                {rows.map((task) => (
                  <li
                    key={task.$id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-[0.82rem] text-ink">
                      {task.title}
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {projectName(task.projectId)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </DataState>

          <div className="grid gap-2 rounded-xl border border-border bg-surface p-3">
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
            {projects.length === 0 && !loading && (
              <p className="text-[0.76rem] text-muted-foreground">
                No projects yet — create one on the web dashboard first.
              </p>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={signOut}
          className="mx-auto h-8 text-muted-foreground"
        >
          <LogOut size={14} />
          Sign out
        </Button>
      </div>
    </section>
  );
}
