import type { TimeStats } from "@/lib/db";
import { formatDuration, formatDurationShort } from "@packages/domain/index";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { DataState } from "@packages/ui/components/data-state";
import { Input } from "@packages/ui/components/input";
import { Skeleton } from "@packages/ui/components/skeleton";

type Range = { from: string; to: string };

type Props = {
  range: Range;
  onRangeChange: (range: Range) => void;
  stats: TimeStats | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function TimeStatsSection({
  range,
  onRangeChange,
  stats,
  loading,
  error,
  onRetry,
}: Props) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          From
          <Input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => onRangeChange({ ...range, from: e.target.value })}
            className="h-9 w-40"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          To
          <Input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => onRangeChange({ ...range, to: e.target.value })}
            className="h-9 w-40"
          />
        </label>
      </div>

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
