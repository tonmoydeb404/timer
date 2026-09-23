"use client";

import type { DayTotal } from "@packages/domain/index";
import { formatDuration, formatDurationShort } from "@packages/domain/index";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@packages/ui/components/chart";
import { DataState } from "@packages/ui/components/data-state";
import { Skeleton } from "@packages/ui/components/skeleton";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartConfig = {
  workMs: { label: "Worked", color: "var(--chart-1)" },
  breakMs: { label: "Break", color: "var(--chart-2)" },
} satisfies ChartConfig;

function formatDayTick(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : day;
}

type Props = {
  data: DayTotal[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
};

/** Stacked work/break bar chart, one bar per day — used on the dashboard and time overviews. */
export function WorkPerDayChart({ data, loading, error, onRetry }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Time worked per day</CardTitle>
      </CardHeader>
      <CardContent>
        <DataState
          loading={loading}
          error={error}
          data={data}
          onRetry={onRetry}
          emptyTitle="No time tracked in this range"
          loadingComponent={<Skeleton className="h-64 w-full" />}
        >
          {(rows) => (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={rows} margin={{ left: 0, right: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatDayTick}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={48}
                  tickFormatter={(v: number) => formatDurationShort(v)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => formatDayTick(String(value))}
                      formatter={(value, name) => [
                        formatDuration(Number(value)),
                        chartConfig[name as keyof typeof chartConfig]?.label ??
                          name,
                      ]}
                    />
                  }
                />
                <Bar
                  dataKey="workMs"
                  stackId="a"
                  fill="var(--color-workMs)"
                  radius={[0, 0, 4, 4]}
                  minPointSize={0}
                />
                <Bar
                  dataKey="breakMs"
                  stackId="a"
                  fill="var(--color-breakMs)"
                  radius={[4, 4, 0, 0]}
                  minPointSize={0}
                />
              </BarChart>
            </ChartContainer>
          )}
        </DataState>
      </CardContent>
    </Card>
  );
}
