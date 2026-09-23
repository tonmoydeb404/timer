import { Coffee, Square, TimerIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type AppScreenshotView = "timer" | "projects" | "history";

type AppScreenshotProps = {
  view: AppScreenshotView;
  priority?: boolean;
  className?: string;
  hideTitleBar?: boolean;
};

const entries = [
  { task: "Homepage redesign", project: "Client Website", time: "1h 32m" },
  { task: "API integration", project: "Client Website", time: "45m" },
  { task: "Weekly review", project: "Admin", time: "20m" },
];

function TimerMock() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-6">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Client Website / Homepage redesign
      </div>
      <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-foreground">
        01:24:37
      </p>
      <div className="flex gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground">
          <Coffee className="size-3.5" aria-hidden="true" />
          Break
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white">
          <Square className="size-3.5" aria-hidden="true" />
          Stop
        </span>
      </div>
    </div>
  );
}

function ProjectsMock() {
  return (
    <div className="h-full w-full bg-background p-5 text-left">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        Projects
      </p>
      <div className="mt-3 space-y-2">
        {[
          { name: "Client Website", tasks: 4, time: "18h 12m" },
          { name: "Tymar", tasks: 7, time: "42h 05m" },
          { name: "Admin", tasks: 2, time: "3h 40m" },
        ].map((project) => (
          <div
            key={project.name}
            className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
          >
            <div>
              <p className="text-xs font-medium text-foreground">
                {project.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {project.tasks} tasks
              </p>
            </div>
            <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {project.time}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryMock() {
  return (
    <div className="h-full w-full bg-background p-5 text-left">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          Today
        </p>
        <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
          2h 37m
        </p>
      </div>
      <div className="mt-3 space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.task}
            className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {entry.task}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {entry.project}
              </p>
            </div>
            <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {entry.time}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const viewMock: Record<AppScreenshotView, () => React.JSX.Element> = {
  timer: TimerMock,
  projects: ProjectsMock,
  history: HistoryMock,
};

/** A stylized mock of the Tymar desktop UI, framed in window chrome. */
export function AppScreenshot({
  view,
  className,
  hideTitleBar = false,
}: AppScreenshotProps) {
  const Mock = viewMock[view];

  return (
    <div
      className={cn("overflow-hidden rounded-lg border shadow-xl", className)}
    >
      {!hideTitleBar && (
        <div className="flex items-center gap-1.5 border-b bg-muted/60 px-3 py-1.5">
          <span className="size-2.5 rounded-full bg-red-500/70" />
          <span className="size-2.5 rounded-full bg-yellow-500/70" />
          <span className="size-2.5 rounded-full bg-green-500/70" />
          <TimerIcon
            className="ml-auto size-3 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      )}
      <div className="flex aspect-[16/10] items-stretch bg-muted/20">
        <Mock />
      </div>
    </div>
  );
}
