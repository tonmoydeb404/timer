import { appPaths } from "@/config/paths-config";
import { formatDurationShort } from "@packages/domain/index";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { DataState } from "@packages/ui/components/data-state";
import { Skeleton } from "@packages/ui/components/skeleton";
import Link from "next/link";
import type { DashboardAnalytics } from "../types";

type Props = {
  analytics: DashboardAnalytics | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function DailyTotalsSection({
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
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      )}
    >
      {([a]) => a && <DailyTotalsSectionContent analytics={a} />}
    </DataState>
  );
}

function DailyTotalsSectionContent({
  analytics: a,
}: {
  analytics: DashboardAnalytics;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Daily totals</CardTitle>
        <CardDescription>Last 7 days in {a.timeZone}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-32 items-end gap-2" aria-hidden="true">
          {a.last7Totals.map((d) => (
            <div
              key={d.day}
              className="grid flex-1 content-end gap-1"
              title={`${d.day}: ${formatDurationShort(d.workMs)} work, ${formatDurationShort(d.breakMs)} break`}
            >
              <div className="grid content-end gap-0.5">
                <div
                  className="rounded-sm bg-primary/80"
                  style={{
                    height: `${Math.max(2, (d.workMs / a.maxDay) * 96)}px`,
                  }}
                />
                {d.breakMs > 0 && (
                  <div
                    className="rounded-sm bg-amber-500/70"
                    style={{
                      height: `${Math.max(2, (d.breakMs / a.maxDay) * 96)}px`,
                    }}
                  />
                )}
              </div>
              <span className="truncate text-center text-[10px] text-muted-foreground">
                {d.day.slice(5)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-primary/80" /> Work
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-amber-500/70" /> Break
          </span>
          <Link
            href={appPaths.time}
            className="ms-auto text-primary hover:underline"
          >
            Review time →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
