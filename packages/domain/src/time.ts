// Pure date/time helpers. All timestamps are exchanged as UTC ISO-8601
// strings; display/reporting converts into the user's timezone.

export function toEpochMs(iso: string): number {
  return new Date(iso).getTime();
}

export function toIso8601(epochMs: number): string {
  return new Date(epochMs).toISOString();
}

/** 3723000 -> "01:02:03". Negative values clamp to zero. */
export function formatDuration(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** 8100000 -> "2h 15m". Used for compact totals. */
export function formatDurationShort(totalMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(totalMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** "YYYY-MM-DD" key of an instant in the given IANA timezone. */
export function dayKey(epochMs: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(epochMs));

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Split a "YYYY-MM-DD" key into numeric parts (falls back to epoch day). */
function parseDayKey(key: string): [number, number, number] {
  const parts = key.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return [y, m, d];
}

/** Wall-clock offset of `timeZone` at `instant` (ms, local − UTC). */
function tzOffsetMs(instant: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(instant));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  // hour12:false can render midnight as "24".
  const hour = get("hour") % 24;
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
  return asUtc - instant;
}

/** Convert a wall-clock time in `timeZone` to a UTC instant (DST-safe). */
function zonedTimeToUtc(
  y: number,
  month: number,
  d: number,
  h: number,
  min: number,
  timeZone: string,
): number {
  const asIfUtc = Date.UTC(y, month - 1, d, h, min);
  let guess = asIfUtc;
  for (let i = 0; i < 3; i++) {
    guess = asIfUtc - tzOffsetMs(guess, timeZone);
  }
  return guess;
}

/** Midnight boundaries [startMs, endMs) of the day containing `epochMs`. */
export function dayBounds(
  epochMs: number,
  timeZone: string,
): { startMs: number; endMs: number } {
  const [y, m, d] = parseDayKey(dayKey(epochMs, timeZone));
  const startMs = zonedTimeToUtc(y, m, d, 0, 0, timeZone);
  const next = new Date(Date.UTC(y, m - 1, d) + 24 * 3600 * 1000);
  const endMs = zonedTimeToUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    0,
    0,
    timeZone,
  );
  return { startMs, endMs };
}

export type DaySlice = { day: string; durationMs: number };

/**
 * Split an entry across calendar days in the user's timezone so a session
 * crossing midnight attributes hours to the correct days (PRD §25).
 */
export function splitEntryAcrossDays(
  startedAt: string,
  endedAt: string,
  timeZone: string,
): DaySlice[] {
  const start = toEpochMs(startedAt);
  const end = toEpochMs(endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return [];
  }

  const slices: DaySlice[] = [];
  let cursor = start;
  while (cursor < end) {
    const { endMs } = dayBounds(cursor, timeZone);
    const sliceEnd = Math.min(end, endMs);
    slices.push({ day: dayKey(cursor, timeZone), durationMs: sliceEnd - cursor });
    cursor = sliceEnd;
  }
  return slices;
}
