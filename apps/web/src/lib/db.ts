import {
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  type Profile,
  type Project,
  type ProjectStatus,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@packages/domain/index";
import { Databases, ID, Permission, Query, Role, Client } from "appwrite";
import type { Models } from "appwrite";

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
): Promise<Project[]> {
  const queries = [
    byUser(userId),
    NOT_DELETED,
    Query.orderDesc("$updatedAt"),
    Query.limit(100),
  ];
  if (!includeArchived) queries.push(Query.equal("status", "ACTIVE"));
  const res = await requireDatabases().listDocuments(
    DB,
    COLLECTIONS.projects,
    queries,
  );
  return (res.documents as unknown as Doc[]).map(toProject);
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
  const active = await requireDatabases().listDocuments(
    DB,
    COLLECTIONS.tasks,
    [
      byUser(userId),
      Query.equal("projectId", projectId),
      NOT_DELETED,
      Query.limit(1),
    ],
  );
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
  opts: { projectId?: string; status?: TaskStatus } = {},
): Promise<Task[]> {
  const queries = [
    byUser(userId),
    NOT_DELETED,
    Query.orderDesc("$updatedAt"),
    Query.limit(200),
  ];
  if (opts.projectId) queries.push(Query.equal("projectId", opts.projectId));
  if (opts.status) queries.push(Query.equal("status", opts.status));
  const res = await requireDatabases().listDocuments(
    DB,
    COLLECTIONS.tasks,
    queries,
  );
  return (res.documents as unknown as Doc[]).map(toTask);
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

// ---- First-run setup: profile + seed "Personal" project ----

export async function ensureUserSetup(input: {
  userId: string;
  name: string;
  email: string;
}): Promise<{ profile: Profile; seeded: boolean }> {
  const profile = await ensureProfile(input);
  const projects = await listProjects(input.userId);
  if (projects.length === 0) {
    await createProject(input.userId, { name: "Personal" });
    return { profile, seeded: true };
  }
  return { profile, seeded: false };
}
