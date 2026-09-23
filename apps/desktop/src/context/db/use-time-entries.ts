import { useApp } from "@/context/app-context";
import { createManualTimeEntry, getProfile, listTimeEntries } from "@/lib/db";
import { useAsyncAction } from "@/lib/use-async-action";
import type { EntryType, Profile, TimeEntry } from "@packages/domain/index";
import { useCallback, useEffect, useState } from "react";

const LIMIT = 500;

/** Latest time entries + reporting profile (timezone) — consumers filter/aggregate locally. */
export function useTimeEntriesData() {
  const { auth } = useApp();
  const userId = auth?.user?.id ?? null;
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const {
    run: reload,
    isLoading: loading,
    error,
  } = useAsyncAction(
    useCallback(async () => {
      if (!userId) {
        setEntries([]);
        setProfile(null);
        return;
      }
      const [fetchedProfile, fetchedEntries] = await Promise.all([
        getProfile(userId),
        listTimeEntries(userId, LIMIT),
      ]);
      setProfile(fetchedProfile);
      setEntries(fetchedEntries);
    }, [userId]),
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const timeZone =
    profile?.timezone ||
    (typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC");

  const addManualEntry = useAsyncAction(
    async (input: {
      taskId: string | null;
      projectId: string | null;
      type: EntryType;
      startedAt: string;
      endedAt: string;
    }) => {
      if (!userId) throw new Error("You're signed out.");
      const created = await createManualTimeEntry(userId, input);
      setEntries((prev) => [created, ...prev]);
      return created;
    },
  );

  return {
    entries,
    profile,
    timeZone,
    loading,
    error,
    reload,
    addManualEntry: addManualEntry.run,
    addingManualEntry: addManualEntry.isLoading,
  };
}
