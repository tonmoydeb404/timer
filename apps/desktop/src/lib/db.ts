import {
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  type Project,
  type ProjectStatus,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@packages/domain/index";
import { ID, Permission, Query, Role } from "appwrite";
import type { Models } from "appwrite";
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

export type PendingUpload = {
  local_id: string;
  task_id: string;
  type: "WORK" | "BREAK";
  started_at: string;
  ended_at: string;
};

/** Uploads closed timer segments as time entries. Returns uploaded local ids. */
export async function uploadTimeEntries(
  userId: string,
  entries: PendingUpload[],
): Promise<string[]> {
  const uploaded: string[] = [];
  for (const entry of entries) {
    await requireDatabases().createDocument(
      DB,
      COLLECTIONS.timeEntries,
      ID.unique(),
      {
        userId,
        taskId: entry.task_id,
        type: entry.type,
        startedAt: entry.started_at,
        endedAt: entry.ended_at,
      },
      ownerPermissions(userId),
    );
    uploaded.push(entry.local_id);
  }
  return uploaded;
}
