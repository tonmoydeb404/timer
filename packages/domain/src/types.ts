// Shared domain types. Backend (raw) shapes keep Appwrite's `$`-prefixed
// document fields; view code maps them to camelCase as needed.

export type AppwriteDoc = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
};

export type AuthStatus = "signed_out" | "active" | "expired" | "unknown";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthState = {
  /** False when endpoint/project ID are not configured at build time. */
  configured: boolean;
  status: AuthStatus;
  user: AuthUser | null;
};

export type ProjectStatus = "ACTIVE" | "ARCHIVED";

export type Profile = AppwriteDoc & {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  timezone: string;
};

export type Project = AppwriteDoc & {
  userId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  /** Soft delete; hard-deleted later by a scheduled job (post-MVP). */
  deletedAt: string | null;
};

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type Task = AppwriteDoc & {
  userId: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  deletedAt: string | null;
};

export type EntryType = "WORK" | "BREAK";

export type TimeEntry = AppwriteDoc & {
  userId: string;
  /** Required: breaks belong to the active task (MVP decision). */
  taskId: string;
  type: EntryType;
  startedAt: string;
  /** Null while the entry is still open (should only happen locally). */
  endedAt: string | null;
};

export type TimerState = "IDLE" | "WORKING" | "BREAK";

/** Machine-readable error codes returned by the desktop Rust backend. */
export const AUTH_ERROR_NOT_CONFIGURED = "not_configured";
export const AUTH_ERROR_UNAUTHORIZED = "unauthorized";
export const AUTH_ERROR_NETWORK = "network";
