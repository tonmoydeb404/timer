"use client";

import { useAuth } from "@/lib/auth-context";
import { getTimeStats, type TimeStats } from "@/lib/db";
import { useAsyncAction } from "@/lib/use-async-action";
import { useCallback, useEffect, useState } from "react";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Exclusive upper bound: the day after `dateStr`, at UTC midnight. */
function dayAfter(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 6);
  return { from: isoDate(from), to: isoDate(to) };
}

/** Worked/break stats for a user-selected date range, queried server-side. */
export function useTimeStats() {
  const { user } = useAuth();
  const [range, setRange] = useState(defaultRange);
  const [stats, setStats] = useState<TimeStats | null>(null);

  const {
    run: reload,
    isLoading: loading,
    error,
  } = useAsyncAction(
    useCallback(async () => {
      if (!user) return;
      const result = await getTimeStats(user.$id, {
        from: `${range.from}T00:00:00.000Z`,
        to: dayAfter(range.to),
      });
      setStats(result);
    }, [user, range]),
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    range,
    setRange,
    stats,
    loading,
    error,
    reload,
  };
}
