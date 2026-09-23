import {
  aggregateDayTotals,
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  dayKey,
  entryDurationMs,
  type DayTotal,
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
import { Client, Databases, ID, Permission, Query, Role } from "appwrite";

let databases: Databases | null | undefined;

function getDatabases(): Databases | null {
  if (databases !== undefined) return databases;
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  // The browser attaches the Appwrite session (cookie or fallback header)
  // per request, so a standalone client authenticates the same way.
  databases =
    endpoint && project
      ? new Databases(new Client().setEndpoint(endpoint).setProject(project))
      : null;
  return databases;
}

function requireDatabases(): Databases {
  const db = getDatabases();
  if (!db) throw new Error("Appwrite is not configured.");
  return db;
}

const ownerPermissions = (userId: string) => [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

type Doc = Models.Document & Record<string, unknown>;

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
const NOT_DELETED = Query.isNull("deletedAt");
const byUser = (userId: string) => Query.equal("userId", userId);

// ---- Profiles ----

export async function getProfile(userId: string): Promise<Profile | null> {
  const res = await requireDatabases().listDocuments(DB, COLLECTIONS.profiles, [
    byUser(userId),
    Query.limit(1),
  ]);
  const doc = res.documents[0] as Doc | undefined;
  return doc ? toProfile(doc) : null;
}

export async function ensureProfile(input: {
  userId: string;
  name: string;
  email: string;
}): Promise<Profile> {
  const existing = await getProfile(input.userId);
  if (existing) return existing;
  const timezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";
  const doc = (await requireDatabases().createDocument(
    DB,
    COLLECTIONS.profiles,
    ID.unique(),
    { ...input, avatarUrl: null, timezone },
    ownerPermissions(input.userId),
  )) as unknown as Doc;
  return toProfile(doc);
}

// ---- Projects ----

export type ProjectInput = {
  name: string;
  description?: string | null;
};

export async function listProjects(
  userId: string,
  includeArchived = true,
  includeDeleted = false,
): Promise<Project[]> {
  const queries = [
    byUser(userId),
    Query.orderDesc("$updatedAt"),
    Query.limit(100),
  ];
  if (!includeDeleted) queries.push(NOT_DELETED);
  if (!includeArchived) queries.push(Query.equal("status", "ACTIVE"));
  const res = await requireDatabases().listDocuments(
    DB,
    COLLECTIONS.projects,
    queries,
  );
  return (res.documents as unknown as Doc[]).map(toProject);
}

export type ProjectQuery = {
  status?: ProjectStatus | "ALL";
  search?: string;
  limit?: number;
  offset?: number;
};

/** Server-side search + status filter + pagination for the projects list view. */
export async function queryProjects(
  userId: string,
  query: ProjectQuery = {},
): Promise<{ projects: Project[]; total: number }> {
  const { status = "ALL", search, limit = 8, offset = 0 } = query;
  const queries = [
    byUser(userId),
    NOT_DELETED,
    Query.orderDesc("$updatedAt"),
    Query.limit(limit),
    Query.offset(offset),
  ];
  if (status !== "ALL") queries.push(Query.equal("status", status));
  if (search?.trim()) queries.push(Query.search("name", search.trim()));
  const res = await requireDatabases().listDocuments(
    DB,
    COLLECTIONS.projects,
    queries,
  );
  return {
    projects: (res.documents as unknown as Doc[]).map(toProject),
    total: res.total,
  };
}

export async function createProject(
  userId: string,
  input: ProjectInput,
): Promise<Project> {
  const doc = (await requireDatabases().createDocument(
    DB,
    COLLECTIONS.projects,
    ID.unique(),
    {
      userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: "ACTIVE",
      deletedAt: null,
    },
    ownerPermissions(userId),
  )) as unknown as Doc;
  return toProject(doc);
}

export async function updateProject(
  projectId: string,
  patch: Partial<ProjectInput & { status: ProjectStatus }>,
): Promise<Project> {
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name.trim();
  if (patch.description !== undefined)
    data.description = patch.description?.trim() || null;
  if (patch.status !== undefined) data.status = patch.status;
  const doc = (await requireDatabases().updateDocument(
    DB,
    COLLECTIONS.projects,
    projectId,
    data,
  )) as unknown as Doc;
  return toProject(doc);
}

/** Soft delete. Throws when the project still has active tasks. */
export async function deleteProject(
  userId: string,
  projectId: string,
): Promise<void> {
  const active = await requireDatabases().listDocuments(DB, COLLECTIONS.tasks, [
    byUser(userId),
    Query.equal("projectId", projectId),
    NOT_DELETED,
    Query.limit(1),
  ]);
  if (active.total > 0) {
    throw new Error(
      "This project still has active tasks. Delete or move them first.",
    );
  }
  await requireDatabases().updateDocument(DB, COLLECTIONS.projects, projectId, {
    deletedAt: new Date().toISOString(),
  });
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

/** Server-computed count — reads Appwrite's match total, no client filtering. */
export async function countActiveTasks(
  userId: string,
  projectId: string,
): Promise<number> {
  const res = await requireDatabases().listDocuments(DB, COLLECTIONS.tasks, [
    byUser(userId),
    Query.equal("projectId", projectId),
    NOT_DELETED,
    Query.limit(1),
  ]);
  return res.total;
}

// ---- Tasks ----

export type TaskInput = {
  projectId: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
};

export async function listTasks(
  userId: string,
  opts: {
    projectId?: string;
    status?: TaskStatus;
    includeDeleted?: boolean;
  } = {},
): Promise<Task[]> {
  const queries = [
    byUser(userId),
    Query.orderDesc("$updatedAt"),
    Query.limit(200),
  ];
  if (!opts.includeDeleted) queries.push(NOT_DELETED);
  if (opts.projectId) queries.push(Query.equal("projectId", opts.projectId));
  if (opts.status) queries.push(Query.equal("status", opts.status));
  const res = await requireDatabases().listDocuments(
    DB,
    COLLECTIONS.tasks,
    queries,
  );
  return (res.documents as unknown as Doc[]).map(toTask);
}

export type TaskQuery = {
  status?: TaskStatus | "ALL";
  projectId?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

/** Server-side search + status/project filter + pagination for the tasks list view. */
export async function queryTasks(
  userId: string,
  query: TaskQuery = {},
): Promise<{ tasks: Task[]; total: number }> {
  const { status = "ALL", projectId, search, limit = 8, offset = 0 } = query;
  const queries = [
    byUser(userId),
    NOT_DELETED,
    Query.orderDesc("$updatedAt"),
    Query.limit(limit),
    Query.offset(offset),
  ];
  if (status !== "ALL") queries.push(Query.equal("status", status));
  if (projectId) queries.push(Query.equal("projectId", projectId));
  if (search?.trim()) queries.push(Query.search("title", search.trim()));
  const res = await requireDatabases().listDocuments(
    DB,
    COLLECTIONS.tasks,
    queries,
  );
  return {
    tasks: (res.documents as unknown as Doc[]).map(toTask),
    total: res.total,
  };
}

export async function createTask(
  userId: string,
  input: TaskInput,
): Promise<Task> {
  const doc = (await requireDatabases().createDocument(
    DB,
    COLLECTIONS.tasks,
    ID.unique(),
    {
      userId,
      projectId: input.projectId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: "TODO",
      priority: input.priority ?? "MEDIUM",
      dueDate: input.dueDate ?? null,
      completedAt: null,
      deletedAt: null,
    },
    ownerPermissions(userId),
  )) as unknown as Doc;
  return toTask(doc);
}

export async function updateTask(
  taskId: string,
  patch: Partial<
    Pick<Task, "title" | "description" | "priority" | "dueDate" | "projectId">
  > & { status?: TaskStatus },
): Promise<Task> {
  const data: Record<string, unknown> = {};
  if (patch.title !== undefined) data.title = patch.title.trim();
  if (patch.description !== undefined)
    data.description = patch.description?.trim() || null;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (patch.dueDate !== undefined) data.dueDate = patch.dueDate;
  if (patch.projectId !== undefined) data.projectId = patch.projectId;
  if (patch.status !== undefined) {
    data.status = patch.status;
    data.completedAt =
      patch.status === "DONE" ? new Date().toISOString() : null;
  }
  const doc = (await requireDatabases().updateDocument(
    DB,
    COLLECTIONS.tasks,
    taskId,
    data,
  )) as unknown as Doc;
  return toTask(doc);
}

/** Soft delete — history (Phase 5) keeps working. */
export async function deleteTask(taskId: string): Promise<void> {
  await requireDatabases().updateDocument(DB, COLLECTIONS.tasks, taskId, {
    deletedAt: new Date().toISOString(),
  });
}

export async function getTask(taskId: string): Promise<Task | null> {
  try {
    const doc = (await requireDatabases().getDocument(
      DB,
      COLLECTIONS.tasks,
      taskId,
    )) as unknown as Doc;
    return toTask(doc);
  } catch {
    return null;
  }
}

// ---- Time entries (Phase 5) ----

export type TimeEntryInput = {
  taskId: string;
  /** Denormalized alongside taskId; defaults to the task's project when omitted. */
  projectId?: string | null;
  type?: EntryType;
  startedAt: string;
  endedAt: string | null;
};

function validateEntryRange(startedAt: string, endedAt: string | null): void {
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) throw new Error("Start time is invalid.");
  if (endedAt !== null) {
    const end = new Date(endedAt).getTime();
    if (!Number.isFinite(end)) throw new Error("End time is invalid.");
    if (end <= start) throw new Error("End must be after start.");
  }
}

export async function listTimeEntries(
  userId: string,
  opts: {
    taskId?: string;
    taskIds?: string[];
    type?: EntryType;
    /** ISO lower bound (inclusive) on startedAt. */
    from?: string;
    /** ISO upper bound (exclusive) on startedAt. */
    to?: string;
    limit?: number;
  } = {},
): Promise<TimeEntry[]> {
  const queries = [
    byUser(userId),
    Query.orderDesc("startedAt"),
    Query.limit(Math.min(Math.max(opts.limit ?? 200, 1), 500)),
  ];
  // NB: Appwrite combines equality filters with AND; multiple taskIds need
  // separate queries, so fetch per-task only when a small set is given.
  if (opts.taskId) queries.push(Query.equal("taskId", opts.taskId));
  if (opts.type) queries.push(Query.equal("type", opts.type));
  if (opts.from) queries.push(Query.greaterThanEqual("startedAt", opts.from));
  if (opts.to) queries.push(Query.lessThan("startedAt", opts.to));
  const res = await requireDatabases().listDocuments(
    DB,
    COLLECTIONS.timeEntries,
    queries,
  );
  let rows = (res.documents as unknown as Doc[]).map(toTimeEntry);
  if (opts.taskIds && opts.taskIds.length > 0) {
    const set = new Set(opts.taskIds);
    rows = rows.filter((e) => e.taskId !== null && set.has(e.taskId));
  }
  return rows;
}

export type TimeEntryQuery = {
  type?: EntryType | "ALL";
  /** Scope to one task; takes priority over `projectId`. */
  taskId?: string;
  /** Scope to one project — resolved via that project's task ids (time
   * entries only reference a task, not a project, in the schema). */
  projectId?: string;
  /** ISO lower bound (inclusive) on startedAt. */
  from?: string;
  /** ISO upper bound (exclusive) on startedAt. */
  to?: string;
  limit?: number;
  offset?: number;
};

/** Server-side type/task/project/date filter + pagination for the time list view. */
export async function queryTimeEntries(
  userId: string,
  query: TimeEntryQuery = {},
): Promise<{ entries: TimeEntry[]; total: number }> {
  const {
    type = "ALL",
    taskId,
    projectId,
    from,
    to,
    limit = 8,
    offset = 0,
  } = query;

  let taskIdFilter: string | string[] | undefined = taskId;
  if (!taskIdFilter && projectId) {
    const { tasks } = await queryTasks(userId, { projectId, limit: 200 });
    if (tasks.length === 0) return { entries: [], total: 0 };
    taskIdFilter = tasks.map((t) => t.$id);
  }

  const queries = [
    byUser(userId),
    Query.orderDesc("startedAt"),
    Query.limit(limit),
    Query.offset(offset),
  ];
  if (type !== "ALL") queries.push(Query.equal("type", type));
  if (taskIdFilter) queries.push(Query.equal("taskId", taskIdFilter));
  if (from) queries.push(Query.greaterThanEqual("startedAt", from));
  if (to) queries.push(Query.lessThan("startedAt", to));

  const res = await requireDatabases().listDocuments(
    DB,
    COLLECTIONS.timeEntries,
    queries,
  );
  return {
    entries: (res.documents as unknown as Doc[]).map(toTimeEntry),
    total: res.total,
  };
}

export type TimeEntryDayQuery = {
  type?: EntryType | "ALL";
  taskId?: string;
  projectId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

/**
 * Lightweight day-key listing for the time list's top-level pagination —
 * reads only `startedAt` (via `Query.select`). Actual entries for a given
 * day are fetched separately, per day group, via `queryTimeEntries`.
 */
export async function queryTimeEntryDays(
  userId: string,
  timeZone: string,
  query: TimeEntryDayQuery = {},
): Promise<{ days: string[]; total: number }> {
  const {
    type = "ALL",
    taskId,
    projectId,
    from,
    to,
    limit = 8,
    offset = 0,
  } = query;

  let taskIdFilter: string | string[] | undefined = taskId;
  if (!taskIdFilter && projectId) {
    const { tasks } = await queryTasks(userId, { projectId, limit: 200 });
    if (tasks.length === 0) return { days: [], total: 0 };
    taskIdFilter = tasks.map((t) => t.$id);
  }

  const queries = [
    byUser(userId),
    Query.select(["startedAt"]),
    Query.orderDesc("startedAt"),
    Query.limit(limit),
    Query.offset(offset),
  ];
  if (type !== "ALL") queries.push(Query.equal("type", type));
  if (taskIdFilter) queries.push(Query.equal("taskId", taskIdFilter));
  if (from) queries.push(Query.greaterThanEqual("startedAt", from));
  if (to) queries.push(Query.lessThan("startedAt", to));

  const res = await requireDatabases().listDocuments(
    DB,
    COLLECTIONS.timeEntries,
    queries,
  );
  const docs = res.documents as unknown as Doc[];
  const days: string[] = [];
  const seen = new Set<string>();
  for (const doc of docs) {
    const ms = new Date(String(doc.startedAt ?? "")).getTime();
    if (!Number.isFinite(ms)) continue;
    const day = dayKey(ms, timeZone);
    if (!seen.has(day)) {
      seen.add(day);
      days.push(day);
    }
  }
  return { days, total: res.total };
}

export type TimeStats = {
  workedMs: number;
  breakMs: number;
  entryCount: number;
};

/**
 * Worked/break totals for [from, to) — filtered server-side by Appwrite
 * query, paged through in batches and summed here since Appwrite has no
 * aggregate-query support. Open entries (no endedAt) don't count yet.
 */
export async function getTimeStats(
  userId: string,
  range: { from: string; to: string },
): Promise<TimeStats> {
  const db = requireDatabases();
  const pageSize = 100;
  let offset = 0;
  let workedMs = 0;
  let breakMs = 0;
  let entryCount = 0;
  for (;;) {
    const res = await db.listDocuments(DB, COLLECTIONS.timeEntries, [
      byUser(userId),
      Query.greaterThanEqual("startedAt", range.from),
      Query.lessThan("startedAt", range.to),
      Query.limit(pageSize),
      Query.offset(offset),
    ]);
    const docs = res.documents as unknown as Doc[];
    for (const doc of docs) {
      const entry = toTimeEntry(doc);
      const ms = entryDurationMs(entry.startedAt, entry.endedAt);
      if (entry.type === "BREAK") breakMs += ms;
      else workedMs += ms;
      entryCount += 1;
    }
    offset += pageSize;
    if (docs.length < pageSize || offset >= res.total) break;
  }
  return { workedMs, breakMs, entryCount };
}

/**
 * Per-day work/break totals for [from, to), for the "work per day" charts —
 * paged through the same way as `getTimeStats` (Appwrite has no aggregate
 * queries), then reduced client-side via `aggregateDayTotals`.
 */
export async function getDayTotals(
  userId: string,
  timeZone: string,
  range: { from: string; to: string },
): Promise<DayTotal[]> {
  const db = requireDatabases();
  const pageSize = 100;
  let offset = 0;
  const entries: TimeEntry[] = [];
  for (;;) {
    const res = await db.listDocuments(DB, COLLECTIONS.timeEntries, [
      byUser(userId),
      Query.greaterThanEqual("startedAt", range.from),
      Query.lessThan("startedAt", range.to),
      Query.limit(pageSize),
      Query.offset(offset),
    ]);
    const docs = res.documents as unknown as Doc[];
    entries.push(...docs.map(toTimeEntry));
    offset += pageSize;
    if (docs.length < pageSize || offset >= res.total) break;
  }
  return aggregateDayTotals(entries, timeZone);
}

export async function createTimeEntry(
  userId: string,
  input: TimeEntryInput,
): Promise<TimeEntry> {
  if (!input.taskId) throw new Error("A task is required.");
  validateEntryRange(input.startedAt, input.endedAt);
  const doc = (await requireDatabases().createDocument(
    DB,
    COLLECTIONS.timeEntries,
    ID.unique(),
    {
      userId,
      taskId: input.taskId,
      projectId: input.projectId ?? null,
      type: input.type ?? "WORK",
      startedAt: input.startedAt,
      endedAt: input.endedAt,
    },
    ownerPermissions(userId),
  )) as unknown as Doc;
  return toTimeEntry(doc);
}

export async function updateTimeEntry(
  entryId: string,
  patch: Partial<Pick<TimeEntry, "taskId" | "type" | "startedAt" | "endedAt">>,
): Promise<TimeEntry> {
  const data: Record<string, unknown> = {};
  if (patch.taskId !== undefined) {
    if (!patch.taskId) throw new Error("A task is required.");
    data.taskId = patch.taskId;
  }
  if (patch.type !== undefined) data.type = patch.type;
  if (patch.startedAt !== undefined) data.startedAt = patch.startedAt;
  if (patch.endedAt !== undefined) data.endedAt = patch.endedAt;
  if (data.startedAt !== undefined || data.endedAt !== undefined) {
    // Range check needs both ends — fetch the doc when patching one side.
    let startedAt = typeof data.startedAt === "string" ? data.startedAt : null;
    let endedAt =
      data.endedAt === undefined ? undefined : (data.endedAt as string | null);
    if (startedAt === null || endedAt === undefined) {
      const current = (await requireDatabases().getDocument(
        DB,
        COLLECTIONS.timeEntries,
        entryId,
      )) as unknown as Doc;
      if (startedAt === null) startedAt = String(current.startedAt ?? "");
      if (endedAt === undefined)
        endedAt = typeof current.endedAt === "string" ? current.endedAt : null;
    }
    validateEntryRange(startedAt ?? "", endedAt ?? null);
  }
  const doc = (await requireDatabases().updateDocument(
    DB,
    COLLECTIONS.timeEntries,
    entryId,
    data,
  )) as unknown as Doc;
  return toTimeEntry(doc);
}

export async function deleteTimeEntry(entryId: string): Promise<void> {
  await requireDatabases().deleteDocument(DB, COLLECTIONS.timeEntries, entryId);
}

// ---- Profiles (Phase 5 settings polish) ----

export async function updateProfile(
  profileId: string,
  patch: Partial<Pick<Profile, "name" | "timezone" | "avatarUrl">>,
): Promise<Profile> {
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) throw new Error("A name is required.");
    data.name = name;
  }
  if (patch.timezone !== undefined) {
    if (!patch.timezone) throw new Error("A timezone is required.");
    try {
      Intl.DateTimeFormat(undefined, { timeZone: patch.timezone });
    } catch {
      throw new Error("Unknown timezone.");
    }
    data.timezone = patch.timezone;
  }
  if (patch.avatarUrl !== undefined) data.avatarUrl = patch.avatarUrl;
  const doc = (await requireDatabases().updateDocument(
    DB,
    COLLECTIONS.profiles,
    profileId,
    data,
  )) as unknown as Doc;
  return toProfile(doc);
}

// ---- First-run setup: profile only ----

export async function ensureUserSetup(input: {
  userId: string;
  name: string;
  email: string;
}): Promise<{ profile: Profile }> {
  const profile = await ensureProfile(input);
  return { profile };
}
