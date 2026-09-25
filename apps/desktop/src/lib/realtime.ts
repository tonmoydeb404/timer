import { Channel } from "appwrite";
import { Query } from "appwrite";
import { APPWRITE_DATABASE_ID, COLLECTIONS, type TimeEntry } from "@packages/domain/index";
import { getClient } from "./appwrite";
import { toTimeEntry, type Doc } from "./db";

// Appwrite Realtime bridge. A single subscription per user delivers every
// create/update/delete on their `time_entries` rows — this is what makes a
// timer started on another device appear (and disappear) here live.

export type TimeEntryEvent = {
  /** Raw event names, e.g. `...rows.*.create` — suffix drives the action. */
  events: string[];
  entry: TimeEntry;
};

type RealtimeCallback = (event: TimeEntryEvent) => void;

function lastSegment(event: string): string {
  const parts = event.split(".");
  return parts[parts.length - 1] ?? "";
}

/** Subscribes to this user's time_entries realtime events. Returns an
 * unsubscribe function (idempotent). Callback errors are swallowed — a
 * bad handler must never kill the socket. */
export function subscribeToTimeEntries(
  userId: string,
  callback: RealtimeCallback,
): () => void {
  const client = getClient();
  if (!client) return () => {};

  const channel = Channel.tablesdb(APPWRITE_DATABASE_ID)
    .table(COLLECTIONS.timeEntries)
    .row();

  const unsubscribe = client.subscribe<Doc>(
    channel,
    (payload) => {
      try {
        callback({
          events: payload.events,
          entry: toTimeEntry(payload.payload),
        });
      } catch {
        // Malformed payload — ignore, the next refetch reconciles state.
      }
    },
    [Query.equal("userId", userId)],
  );

  let done = false;
  return () => {
    if (done) return;
    done = true;
    unsubscribe();
  };
}

export { lastSegment };
