import { useAuth } from "@/lib/auth-context";
import {
  createTimeEntry,
  deleteTimeEntry,
  listTimeEntries,
  updateTimeEntry,
  type TimeEntryInput,
} from "@/lib/db";
import { useAsyncAction } from "@/lib/use-async-action";
import type { TimeEntry } from "@packages/domain/index";
import { useCallback, useEffect, useState } from "react";

/** Latest 500 time entries — consumers filter/aggregate locally. */
export function useTimeEntriesData() {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  const {
    run: reload,
    isLoading: loading,
    error,
  } = useAsyncAction(
    useCallback(async () => {
      if (!user) return;
      setTimeEntries(await listTimeEntries(user.$id, { limit: 500 }));
    }, [user]),
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const upsert = (saved: TimeEntry) => {
    setTimeEntries((prev) => {
      const exists = prev.some((e) => e.$id === saved.$id);
      const next = exists
        ? prev.map((e) => (e.$id === saved.$id ? saved : e))
        : [saved, ...prev];
      return next.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    });
  };

  const create = useAsyncAction(async (input: TimeEntryInput) => {
    if (!user) throw new Error("Not signed in.");
    const saved = await createTimeEntry(user.$id, input);
    upsert(saved);
    return saved;
  });

  const update = useAsyncAction(
    async (
      entryId: string,
      patch: Partial<
        Pick<TimeEntry, "taskId" | "type" | "startedAt" | "endedAt">
      >,
    ) => {
      const saved = await updateTimeEntry(entryId, patch);
      upsert(saved);
      return saved;
    },
  );

  const remove = useAsyncAction(async (entryId: string) => {
    await deleteTimeEntry(entryId);
    setTimeEntries((prev) => prev.filter((e) => e.$id !== entryId));
  });

  return {
    timeEntries,
    setTimeEntries,
    loading,
    error,
    reload,
    create,
    update,
    remove,
  };
}
