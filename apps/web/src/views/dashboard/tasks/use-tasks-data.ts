"use client";

import { useAuth } from "@/lib/auth-context";
import { queryTasks } from "@/lib/db";
import { useAsyncAction } from "@/lib/use-async-action";
import type { Task } from "@packages/domain/index";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TaskStatusFilter } from "./types";

const PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 300;

/** Server-paginated task query state — mutations live in the modal components. */
export function useTasksData() {
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const id = setTimeout(
      () => setDebouncedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, projectFilter]);

  const {
    run: reload,
    isLoading: loading,
    error,
  } = useAsyncAction(
    useCallback(async () => {
      if (!user) return;
      const { tasks: rows, total: count } = await queryTasks(user.$id, {
        status: statusFilter,
        projectId: projectFilter !== "ALL" ? projectFilter : undefined,
        search: debouncedSearch || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setTasks(rows);
      setTotal(count);
    }, [user, statusFilter, projectFilter, debouncedSearch, page]),
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
      tasks,
      total,
      loading,
      error,
      search,
      setSearch,
      statusFilter,
      setStatusFilter,
      projectFilter,
      setProjectFilter,
      page,
      setPage,
      pageCount,
      reload,
    }),
    [
      tasks,
      total,
      loading,
      error,
      search,
      statusFilter,
      projectFilter,
      page,
      pageCount,
      reload,
    ],
  );
}
