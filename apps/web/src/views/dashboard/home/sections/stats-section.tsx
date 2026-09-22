import { formatDuration, formatDurationShort } from "@packages/domain/index";
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

export function StatsSection({ analytics, loading, error, onRetry }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <DataState
        loading={loading}
        error={error}
        data={analytics ? [analytics] : []}
        onRetry={onRetry}
        emptyTitle="No tracked time yet"
        loadingComponent={(i) => (
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="mt-2 h-3 w-40" />
            </CardContent>
          </Card>
        )}
        skeletonCount={3}
      >
        {([a]) => {
          if (!a) return null;

          return (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Today</CardTitle>
                  <CardDescription>
                    {a.today} · {a.timeZone}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatDurationShort(a.todayTotal.workMs)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.todayTotal.breakMs > 0
                      ? `${formatDurationShort(a.todayTotal.breakMs)} on break · ${formatDurationShort(a.todayTotal.totalMs)} total`
                      : a.todayTotal.totalMs > 0
                        ? `${formatDurationShort(a.todayTotal.totalMs)} total`
                        : "Nothing tracked yet today."}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Last 7 days
                  </CardTitle>
                  <CardDescription>
                    Work vs break, midnight-split
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatDurationShort(a.week.workMs)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.week.breakMs > 0
                      ? `${formatDurationShort(a.week.breakMs)} on break`
                      : "No breaks logged."}{" "}
                    · {a.entryCount} sessions all-time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    All time
                  </CardTitle>
                  <CardDescription>Every synced session</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatDurationShort(a.all.workMs)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(a.all.totalMs)} total incl. breaks
                  </p>
                </CardContent>
              </Card>
            </>
          );
        }}
      </DataState>
    </div>
  );
}
