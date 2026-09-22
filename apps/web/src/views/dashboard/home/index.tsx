import { useAuth } from "@/lib/auth-context";
import { DailyTotalsSection } from "./sections/daily-totals-section";
import { GreetingSection } from "./sections/greeting-section";
import { RecentSessionsSection } from "./sections/recent-sessions-section";
import { StatsSection } from "./sections/stats-section";
import { useDashboardData } from "./use-dashboard-data";

type Props = {};

export function DashboardHomeView(props: Props) {
  const { user } = useAuth();
  const { loading, error, analytics, reload } = useDashboardData();

  return (
    <div className="grid gap-6">
      <GreetingSection name={user?.name} />

      <StatsSection
        analytics={analytics}
        loading={loading}
        error={error}
        onRetry={reload}
      />
      <DailyTotalsSection
        analytics={analytics}
        loading={loading}
        error={error}
        onRetry={reload}
      />
      <RecentSessionsSection
        analytics={analytics}
        loading={loading}
        error={error}
        onRetry={reload}
      />
    </div>
  );
}
