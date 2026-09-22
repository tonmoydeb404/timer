"use client";

import { useAuth } from "@/lib/auth-context";
import { getProfile, queryTimeEntryDays } from "@/lib/db";
import { useAsyncAction } from "@/lib/use-async-action";
import { useCallback, useEffect, useMemo, useState } from "react";
import { defaultRange } from "./lib/date-range";
import type { EntryTypeFilter } from "./types";

const PAGE_SIZE = 8;

/**
 * Top-level state for the time list: filters, pagination, and the list of
 * distinct day keys to render — each day group then fetches its own entries.
 */
export function useTimeDayGroups() {
  const { user } = useAuth();
  const [timeZone, setTimeZone] = useState("UTC");
  const [typeFilter, setTypeFilter] = useState<EntryTypeFilter>("ALL");
  const [projectFilter, setProjectFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const [range, setRange] = useState(defaultRange);
  const [page, setPage] = useState(1);
  const [days, setDays] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getProfile(user.$id).then((profile) => {
      if (cancelled) return;
      setTimeZone(
        profile?.timezone ||
          (typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : "UTC"),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, projectFilter, taskFilter, range.from, range.to]);

  const {
    run: reload,
    isLoading: loading,
    error,
  } = useAsyncAction(
    useCallback(async () => {
      if (!user) return;
      const { days: rows, total: count } = await queryTimeEntryDays(
        user.$id,
        timeZone,
        {
          type: typeFilter,
          taskId: taskFilter || undefined,
          projectId: taskFilter ? undefined : projectFilter || undefined,
          from: range.from ? `${range.from}T00:00:00.000Z` : undefined,
          to: range.to
            ? new Date(
                new Date(`${range.to}T00:00:00.000Z`).getTime() +
                  24 * 3600 * 1000,
              ).toISOString()
            : undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        },
      );
      setDays(rows);
      setTotal(count);
    }, [user, timeZone, typeFilter, taskFilter, projectFilter, range, page]),
  );

  useEffect(() => {
    void reload();
  }, [reload, refreshSignal]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const notifyChanged = useCallback(() => setRefreshSignal((n) => n + 1), []);

  return useMemo(
    () => ({
      days,
      total,
      loading,
      error,
      timeZone,
      typeFilter,
      setTypeFilter,
      projectFilter,
      setProjectFilter,
      taskFilter,
      setTaskFilter,
      range,
      setRange,
      page,
      setPage,
      pageCount,
      reload,
      refreshSignal,
      notifyChanged,
    }),
    [
      days,
      total,
      loading,
      error,
      timeZone,
      typeFilter,
      projectFilter,
      taskFilter,
      range,
      page,
      pageCount,
      reload,
      refreshSignal,
      notifyChanged,
    ],
  );
}
