// Analytics over closed time entries. All splitting is timezone-aware via
// `splitEntryAcrossDays` — a session crossing midnight attributes hours to
// the correct calendar days. Duration is always derived from timestamps.

import { dayKey, splitEntryAcrossDays, toEpochMs } from "./time";
import type { EntryType, TimeEntry } from "./types";

export type EntryLike = Pick<TimeEntry, "startedAt" | "endedAt" | "type">;

export type DayTotal = {
  day: string;
  workMs: number;
  breakMs: number;
  totalMs: number;
};

export type ProjectTotal = {
  projectId: string;
  workMs: number;
  breakMs: number;
  totalMs: number;
};

/** Derived duration of one entry; 0 when open/invalid. */
export function entryDurationMs(
  startedAt: string,
  endedAt: string | null,
): number {
  if (!endedAt) return 0;
  const start = toEpochMs(startedAt);
  const end = toEpochMs(endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return end - start;
}

function isWork(type: EntryType): boolean {
  return type === "WORK";
}

/**
 * Per-day work/break/total totals across entries, midnight-split in
 * `timeZone`. Open or invalid entries are skipped. Sorted ascending by day.
 */
export function aggregateDayTotals(
  entries: EntryLike[],
  timeZone: string,
): DayTotal[] {
  const byDay = new Map<string, DayTotal>();
  for (const entry of entries) {
    if (!entry.endedAt) continue;
    const slices = splitEntryAcrossDays(
      entry.startedAt,
      entry.endedAt,
      timeZone,
    );
    for (const slice of slices) {
      const row =
        byDay.get(slice.day) ??
        ({ day: slice.day, workMs: 0, breakMs: 0, totalMs: 0 } as DayTotal);
      if (isWork(entry.type)) row.workMs += slice.durationMs;
      else row.breakMs += slice.durationMs;
      row.totalMs += slice.durationMs;
      byDay.set(slice.day, row);
    }
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** Totals for a single calendar day key (midnight-split aware). */
export function totalsForDay(
  entries: EntryLike[],
  timeZone: string,
  day: string,
): DayTotal {
  const totals = aggregateDayTotals(entries, timeZone).find((d) => d.day === day);
  return totals ?? { day, workMs: 0, breakMs: 0, totalMs: 0 };
}

/** Sum a set of day totals into one work/break/total triple. */
export function sumDayTotals(days: DayTotal[]): {
  workMs: number;
  breakMs: number;
  totalMs: number;
} {
  let workMs = 0;
  let breakMs = 0;
  let totalMs = 0;
  for (const d of days) {
    workMs += d.workMs;
    breakMs += d.breakMs;
    totalMs += d.totalMs;
  }
  return { workMs, breakMs, totalMs };
}

/**
 * Last `n` calendar day keys in `timeZone`, ending today (ascending).
 * `nowMs` is injectable for tests.
 */
export function lastNDayKeys(
  timeZone: string,
  n: number,
  nowMs: number = Date.now(),
): string[] {
  const keys: string[] = [];
  // Walk back day-by-day from "today" using noon anchors to avoid DST edges.
  const today = dayKey(nowMs, timeZone);
  keys.push(today);
  let cursor = nowMs;
  for (let i = 1; i < n; i++) {
    // Step back 20h from the current cursor's local noon, then take that day.
    cursor -= 24 * 3600 * 1000;
    const k = dayKey(cursor, timeZone);
    // De-dupe in case a DST fallback repeats an instant's day (rare, safe).
    if (k !== keys[keys.length - 1]) keys.push(k);
    else {
      cursor -= 2 * 3600 * 1000;
      keys.push(dayKey(cursor, timeZone));
    }
  }
  return keys.reverse();
}

/**
 * Per-project totals (no midnight splitting needed — attribution is by entry,
 * not by day). `taskToProject` maps taskId → projectId; entries whose task is
 * unknown land under "unknown".
 */
export function aggregateByProject(
  entries: (EntryLike & { taskId: string })[],
  taskToProject: Map<string, string> | Record<string, string>,
): ProjectTotal[] {
  const lookup =
    taskToProject instanceof Map
      ? (id: string) => taskToProject.get(id) ?? "unknown"
      : (id: string) => taskToProject[id] ?? "unknown";
  const byProject = new Map<string, ProjectTotal>();
  for (const entry of entries) {
    const duration = entryDurationMs(entry.startedAt, entry.endedAt);
    if (duration <= 0) continue;
    const projectId = lookup(entry.taskId);
    const row =
      byProject.get(projectId) ??
      ({ projectId, workMs: 0, breakMs: 0, totalMs: 0 } as ProjectTotal);
    if (isWork(entry.type)) row.workMs += duration;
    else row.breakMs += duration;
    row.totalMs += duration;
    byProject.set(projectId, row);
  }
  return [...byProject.values()].sort((a, b) => b.totalMs - a.totalMs);
}

/** Group entries by the calendar day of their start (descending day order). */
export function groupEntriesByStartDay<T extends EntryLike>(
  entries: T[],
  timeZone: string,
): { day: string; entries: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const start = toEpochMs(entry.startedAt);
    if (!Number.isFinite(start)) continue;
    const day = dayKey(start, timeZone);
    const list = groups.get(day) ?? [];
    list.push(entry);
    groups.set(day, list);
  }
  return [...groups.entries()]
    .map(([day, list]) => ({
      day,
      entries: list.sort((a, b) =>
        b.startedAt.localeCompare(a.startedAt),
      ),
    }))
    .sort((a, b) => b.day.localeCompare(a.day));
}
