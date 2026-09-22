export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Exclusive upper bound: the day after `dateStr`, at UTC midnight. */
export function dayAfter(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

export function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 3600 * 1000);
  return { from: isoDate(from), to: isoDate(to) };
}

/** [ISO start, ISO exclusive end) bounds for one "YYYY-MM-DD" day key. */
export function dayBounds(day: string): { from: string; to: string } {
  return { from: `${day}T00:00:00.000Z`, to: dayAfter(day) };
}
