import { entryDurationMs, formatDuration } from "@packages/domain/index";
import { Badge } from "@packages/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { DataState } from "@packages/ui/components/data-state";
import { Skeleton } from "@packages/ui/components/skeleton";
import type { DashboardAnalytics } from "../types";

type Props = {
  analytics: DashboardAnalytics | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function RecentSessionsSection({
  analytics,
  loading,
  error,
  onRetry,
}: Props) {
  return (
    <DataState
      loading={loading}
      error={error}
      data={analytics ? [analytics] : []}
      onRetry={onRetry}
      emptyTitle="No tracked time yet"
      loadingComponent={() => (
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-28" />
          </CardHeader>
          <CardContent className="grid gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      )}
    >
      {([a]) => a && <RecentSessionsSectionContent analytics={a} />}
    </DataState>
  );
}

function RecentSessionsSectionContent({
  analytics: a,
}: {
  analytics: DashboardAnalytics;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent sessions</CardTitle>
        <CardDescription>Latest synced entries</CardDescription>
      </CardHeader>
      <CardContent>
        {a.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
        ) : (
          <ul className="grid gap-2">
            {a.recent.map((e) => (
              <li
                key={e.$id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2.5 text-sm"
              >
                <Badge variant={e.type === "BREAK" ? "secondary" : "outline"}>
                  {e.type === "BREAK" ? "Break" : "Work"}
                </Badge>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {a.taskName(e.taskId)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatDuration(entryDurationMs(e.startedAt, e.endedAt))} ·{" "}
                  {e.startedAt.slice(0, 16).replace("T", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
