import { useAuth } from "@/lib/auth-context";
import { GreetingSection } from "./sections/greeting-section";
import { TimeStatsSection } from "./sections/time-stats-section";
import { useTimeStats } from "./use-time-stats";

type Props = {};

export function DashboardHomeView(props: Props) {
  const { user } = useAuth();
  const { range, setRange, stats, loading, error, reload } = useTimeStats();

  return (
    <div className="grid gap-6">
      <GreetingSection name={user?.name} />

      <TimeStatsSection
        range={range}
        onRangeChange={setRange}
        stats={stats}
        loading={loading}
        error={error}
        onRetry={reload}
      />
    </div>
  );
}
