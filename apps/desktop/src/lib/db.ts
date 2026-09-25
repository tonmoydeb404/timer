import {
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  type EntryType,
  type Profile,
  type Project,
  type ProjectStatus,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TimeEntry,
} from "@packages/domain/index";
import type { Models } from "appwrite";
import { ID, Permission, Query, Role } from "appwrite";
import { getDatabases } from "./appwrite";

function requireDatabases() {
  const db = getDatabases();
  if (!db) throw new Error("Appwrite is not configured.");
  return db;
}

const ownerPermissions = (userId: string) => [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

export type Doc = Models.Document & Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function toProject(doc: Doc): Project {
  return {
    $id: doc.$id,
    $createdAt: doc.$createdAt,
    $updatedAt: doc.$updatedAt,
    $permissions: doc.$permissions,
    userId: String(doc.userId ?? ""),
    name: String(doc.name ?? ""),
    description: str(doc.description),
    status: (doc.status as ProjectStatus) ?? "ACTIVE",
    deletedAt: str(doc.deletedAt),
  };
}

export function toTask(doc: Doc): Task {
  return {
    $id: doc.$id,
    $createdAt: doc.$createdAt,
    $updatedAt: doc.$updatedAt,
    $permissions: doc.$permissions,
    userId: String(doc.userId ?? ""),
    projectId: String(doc.projectId ?? ""),
    title: String(doc.title ?? ""),
    description: str(doc.description),
    status: (doc.status as TaskStatus) ?? "TODO",
    priority: (doc.priority as TaskPriority) ?? "MEDIUM",
    dueDate: str(doc.dueDate),
    completedAt: str(doc.completedAt),
    deletedAt: str(doc.deletedAt),
  };
}

export function toProfile(doc: Doc): Profile {
  return {
    $id: doc.$id,
    $createdAt: doc.$createdAt,
    $updatedAt: doc.$updatedAt,
    $permissions: doc.$permissions,
    userId: String(doc.userId ?? ""),
    name: String(doc.name ?? ""),
    email: String(doc.email ?? ""),
    avatarUrl: str(doc.avatarUrl),
    timezone: String(doc.timezone ?? "UTC"),
  };
}

export function toTimeEntry(doc: Doc): TimeEntry {
  return {
    $id: doc.$id,
    $createdAt: doc.$createdAt,
    $updatedAt: doc.$updatedAt,
    $permissions: doc.$permissions,
    userId: String(doc.userId ?? ""),
    taskId: str(doc.taskId),
    projectId: str(doc.projectId),
    type: (doc.type as EntryType) ?? "WORK",
    startedAt: String(doc.startedAt ?? ""),
    endedAt: str(doc.endedAt),
  };
}

const DB = APPWRITE_DATABASE_ID;

export async function listProjects(userId: string): Promise<Project[]> {
  const res = await requireDatabases().listDocuments(DB, COLLECTIONS.projects, [
    Query.equal("userId", userId),
    Query.isNull("deletedAt"),
    Query.orderDesc("$updatedAt"),
    Query.limit(100),
  ]);
  return (res.documents as unknown as Doc[]).map(toProject);
}

export async function listTasks(userId: string): Promise<Task[]> {
  const res = await requireDatabases().listDocuments(DB, COLLECTIONS.tasks, [
    Query.equal("userId", userId),
    Query.isNull("deletedAt"),
    Query.orderDesc("$updatedAt"),
    Query.limit(200),
  ]);
  return (res.documents as unknown as Doc[]).map(toTask);
}

/** Server-side search for the "start timer"/"manual entry" project pickers. */
export async function queryProjects(
  userId: string,
  opts: { search?: string; limit?: number } = {},
): Promise<Project[]> {
  const queries = [
    Query.equal("userId", userId),
    Query.isNull("deletedAt"),
    Query.equal("status", "ACTIVE" satisfies ProjectStatus),
    Query.orderDesc("$updatedAt"),
    Query.limit(opts.limit ?? 20),
  ];
  if (opts.search?.trim())
    queries.push(Query.search("name", opts.search.trim()));
  const res = await requireDatabases().listDocuments(
    DB,
    COLLECTIONS.projects,
    queries,
  );
  return (res.documents as unknown as Doc[]).map(toProject);
}

export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const doc = (await requireDatabases().getDocument(
      DB,
      COLLECTIONS.projects,
      projectId,
    )) as unknown as Doc;
    return doc.deletedAt ? null : toProject(doc);
  } catch {
    return null;
  }
}

/** Server-side search for the "start timer"/"manual entry" task pickers. */
export async function queryTasks(
  userId: string,
  opts: { projectId?: string; search?: string; limit?: number } = {},
): Promise<Task[]> {
  const queries = [
    Query.equal("userId", userId),
    Query.isNull("deletedAt"),
    Query.notEqual("status", "DONE" satisfies TaskStatus),
    Query.orderDesc("$updatedAt"),
    Query.limit(opts.limit ?? 20),
  ];
  if (opts.projectId) queries.push(Query.equal("projectId", opts.projectId));
  if (opts.search?.trim())
    queries.push(Query.search("title", opts.search.trim()));
  const res = await requireDatabases().listDocuments(
    DB,
    COLLECTIONS.tasks,
    queries,
  );
  return (res.documents as unknown as Doc[]).map(toTask);
}

export async function getTask(taskId: string): Promise<Task | null> {
  try {
    const doc = (await requireDatabases().getDocument(
      DB,
      COLLECTIONS.tasks,
      taskId,
    )) as unknown as Doc;
    return doc.deletedAt ? null : toTask(doc);
  } catch {
    return null;
  }
}

export async function createTask(
  userId: string,
  projectId: string,
  title: string,
): Promise<Task> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("A task title is required.");
  const doc = (await requireDatabases().createDocument(
    DB,
    COLLECTIONS.tasks,
    ID.unique(),
    {
      userId,
      projectId,
      title: trimmed,
      description: null,
      status: "TODO",
      priority: "MEDIUM",
      dueDate: null,
      completedAt: null,
      deletedAt: null,
    },
    ownerPermissions(userId),
  )) as unknown as Doc;
  return toTask(doc);
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const res = await requireDatabases().listDocuments(DB, COLLECTIONS.profiles, [
    Query.equal("userId", userId),
    Query.limit(1),
  ]);
  const doc = res.documents[0] as unknown as Doc | undefined;
  return doc ? toProfile(doc) : null;
}

/** The currently running entry (endedAt is null while a timer is open),
 * or null when nothing is running — for this user, on any device. */
export async function getActiveTimeEntry(
  userId: string,
): Promise<TimeEntry | null> {
  const res = await requireDatabases().listDocuments(
    DB,
    COLLECTIONS.timeEntries,
    [
      Query.equal("userId", userId),
      Query.isNull("endedAt"),
      Query.orderDesc("startedAt"),
      Query.limit(1),
    ],
  );
  const doc = res.documents[0] as unknown as Doc | undefined;
  return doc ? toTimeEntry(doc) : null;
}

/** Closes an open entry (timer stop / break / switch). */
export async function closeTimeEntry(
  entryId: string,
  endedAtIso: string,
): Promise<TimeEntry> {
  const doc = (await requireDatabases().updateDocument(
    DB,
    COLLECTIONS.timeEntries,
    entryId,
    { endedAt: endedAtIso },
  )) as unknown as Doc;
  return toTimeEntry(doc);
}

/** Recent entries, newest first (history + weekly totals). */
export async function listTimeEntries(
  userId: string,
  limit = 200,
): Promise<TimeEntry[]> {
  const res = await requireDatabases().listDocuments(
    DB,
    COLLECTIONS.timeEntries,
    [
      Query.equal("userId", userId),
      Query.orderDesc("startedAt"),
      Query.limit(Math.min(Math.max(limit, 1), 500)),
    ],
  );
  return (res.documents as unknown as Doc[]).map(toTimeEntry);
}

export type PendingUpload = {
  local_id: string;
  task_id: string | null;
  project_id: string | null;
  type: "WORK" | "BREAK";
  started_at: string;
  ended_at: string;
  remote_id: string | null;
};

/** Creates the live (open-ended) record for a segment right as it starts, so
 * other devices can see (and eventually control) the running timer. */
export async function createOpenTimeEntry(
  userId: string,
  entry: {
    task_id: string | null;
    project_id: string | null;
    type: EntryType;
    started_at: string;
  },
): Promise<TimeEntry> {
  const doc = (await requireDatabases().createDocument(
    DB,
    COLLECTIONS.timeEntries,
    ID.unique(),
    {
      userId,
      taskId: entry.task_id,
      projectId: entry.project_id,
      type: entry.type,
      startedAt: entry.started_at,
      endedAt: null,
    },
    ownerPermissions(userId),
  )) as unknown as Doc;
  return toTimeEntry(doc);
}

/** Uploads closed timer segments as time entries. Segments that already have
 * a live doc (created at start via `createOpenTimeEntry`) are closed in
 * place; others (e.g. created while offline) are created as closed entries.
 * Returns uploaded local ids. */
export async function uploadTimeEntries(
  userId: string,
  entries: PendingUpload[],
): Promise<string[]> {
  const uploaded: string[] = [];
  for (const entry of entries) {
    if (entry.remote_id) {
      await requireDatabases().updateDocument(
        DB,
        COLLECTIONS.timeEntries,
        entry.remote_id,
        { endedAt: entry.ended_at },
      );
    } else {
      await requireDatabases().createDocument(
        DB,
        COLLECTIONS.timeEntries,
        ID.unique(),
        {
          userId,
          taskId: entry.task_id,
          projectId: entry.project_id,
          type: entry.type,
          startedAt: entry.started_at,
          endedAt: entry.ended_at,
        },
        ownerPermissions(userId),
      );
    }
    uploaded.push(entry.local_id);
  }
  return uploaded;
}

/** Creates a manual time entry, e.g. from the desktop "Add manual entry"
 * sheet. Project is required; task and end time are optional (an entry
 * without an end time is "open", same as a running timer). */
export async function createManualTimeEntry(
  userId: string,
  input: {
    taskId: string | null;
    projectId: string | null;
    type: EntryType;
    startedAt: string;
    endedAt: string | null;
  },
): Promise<TimeEntry> {
  if (!input.projectId) throw new Error("A project is required.");
  const doc = (await requireDatabases().createDocument(
    DB,
    COLLECTIONS.timeEntries,
    ID.unique(),
    {
      userId,
      taskId: input.taskId,
      projectId: input.projectId,
      type: input.type,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
    },
    ownerPermissions(userId),
  )) as unknown as Doc;
  return toTimeEntry(doc);
}

/** Patches an existing (manual) time entry, e.g. a future "edit entry" sheet. */
export async function updateManualTimeEntry(
  entryId: string,
  patch: Partial<
    Pick<TimeEntry, "taskId" | "projectId" | "type" | "startedAt" | "endedAt">
  >,
): Promise<TimeEntry> {
  const data: Record<string, unknown> = {};
  if (patch.taskId !== undefined) data.taskId = patch.taskId;
  if (patch.projectId !== undefined) {
    if (!patch.projectId) throw new Error("A project is required.");
    data.projectId = patch.projectId;
  }
  if (patch.type !== undefined) data.type = patch.type;
  if (patch.startedAt !== undefined) data.startedAt = patch.startedAt;
  if (patch.endedAt !== undefined) data.endedAt = patch.endedAt;
  const doc = (await requireDatabases().updateDocument(
    DB,
    COLLECTIONS.timeEntries,
    entryId,
    data,
  )) as unknown as Doc;
  return toTimeEntry(doc);
}
