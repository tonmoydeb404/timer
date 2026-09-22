import type { TimeStats } from "@/lib/db";
import { formatDuration, formatDurationShort } from "@packages/domain/index";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { DataState } from "@packages/ui/components/data-state";
import { Skeleton } from "@packages/ui/components/skeleton";

type Props = {
  stats: TimeStats | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function TimeStatsSection({
  stats,
  loading,
  error,
  onRetry,
}: Props) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <DataState
          loading={loading}
          error={error}
          data={stats ? [stats] : []}
          onRetry={onRetry}
          emptyTitle="No tracked time in this range"
          loadingComponent={(i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          )}
          skeletonCount={3}
        >
          {([s]) => {
            if (!s) return null;
            return (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      Worked
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatDurationShort(s.workedMs)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(s.workedMs)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Break</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatDurationShort(s.breakMs)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(s.breakMs)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tabular-nums">
                      {s.entryCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Closed entries in range
                    </p>
                  </CardContent>
                </Card>
              </>
            );
          }}
        </DataState>
      </div>
    </div>
  );
}
