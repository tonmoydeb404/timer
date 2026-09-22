"use client";

import { useAuth } from "@/lib/auth-context";
import { getProfile, queryTimeEntryDays } from "@/lib/db";
import { useAsyncAction } from "@/lib/use-async-action";
import { useQueryParams } from "@/lib/use-query-params";
import { useCallback, useEffect, useMemo, useState } from "react";
import { defaultRange } from "./lib/date-range";
import type { EntryTypeFilter } from "./types";

const PAGE_SIZE = 8;

function isEntryTypeFilter(value: string): value is EntryTypeFilter {
  return value === "ALL" || value === "WORK" || value === "BREAK";
}

/**
 * Top-level state for the time list: filters, pagination, and the list of
 * distinct day keys to render — each day group then fetches its own entries.
 * Every filter is read from/written to URL search params so the list stays
 * shareable and survives refreshes.
 */
export function useTimeDayGroups() {
  const { user } = useAuth();
  const { get, set } = useQueryParams();
  const [timeZone, setTimeZone] = useState("UTC");
  const [days, setDays] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const fallbackRange = useMemo(defaultRange, []);

  const typeParam = get("type") ?? "ALL";
  const typeFilter: EntryTypeFilter = isEntryTypeFilter(typeParam)
    ? typeParam
    : "ALL";
  const projectFilter = get("project") ?? "";
  const taskFilter = get("task") ?? "";
  const range = useMemo(
    () => ({
      from: get("from") ?? fallbackRange.from,
      to: get("to") ?? fallbackRange.to,
    }),
    [get, fallbackRange],
  );
  const page = Number(get("page") ?? "1") || 1;

  const setTypeFilter = useCallback(
    (value: EntryTypeFilter) =>
      set({ type: value === "ALL" ? undefined : value, page: undefined }),
    [set],
  );
  const setProjectFilter = useCallback(
    (value: string) => set({ project: value || undefined, page: undefined }),
    [set],
  );
  const setTaskFilter = useCallback(
    (value: string) => set({ task: value || undefined, page: undefined }),
    [set],
  );
  const setRange = useCallback(
    (next: { from?: string; to?: string }) =>
      set({ from: next.from, to: next.to, page: undefined }),
    [set],
  );
  const setPage = useCallback(
    (value: number) => set({ page: value > 1 ? String(value) : undefined }),
    [set],
  );

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
  }, [page, pageCount, setPage]);

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
    ],
  );
}
