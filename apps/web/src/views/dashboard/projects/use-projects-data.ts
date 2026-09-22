"use client";

import { useAuth } from "@/lib/auth-context";
import { countActiveTasks, queryProjects } from "@/lib/db";
import { useAsyncAction } from "@/lib/use-async-action";
import type { Project } from "@packages/domain/index";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProjectStatusFilter } from "./types";

const PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 300;

/** Server-paginated project query state — mutations live in the modal components. */
export function useProjectsData() {
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const id = setTimeout(
      () => setDebouncedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const {
    run: reload,
    isLoading: loading,
    error,
  } = useAsyncAction(
    useCallback(async () => {
      if (!user) return;
      const { projects: rows, total: count } = await queryProjects(user.$id, {
        status: statusFilter,
        search: debouncedSearch || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setProjects(rows);
      setTotal(count);
      const counts = await Promise.all(
        rows.map((p) => countActiveTasks(user.$id, p.$id)),
      );
      setTaskCounts(
        Object.fromEntries(rows.map((p, i) => [p.$id, counts[i] ?? 0])),
      );
    }, [user, statusFilter, debouncedSearch, page]),
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return useMemo(
    () => ({
      projects,
      total,
      loading,
      error,
      taskCounts,
      search,
      setSearch,
      statusFilter,
      setStatusFilter,
      page,
      setPage,
      pageCount,
      reload,
    }),
    [
      projects,
      total,
      loading,
      error,
      taskCounts,
      search,
      statusFilter,
      page,
      pageCount,
      reload,
    ],
  );
}
