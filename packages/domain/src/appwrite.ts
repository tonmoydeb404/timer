// Appwrite identifiers shared by every client (desktop Rust mirrors these).
// Document IDs are generated server-side by Appwrite (cloud-first MVP).

export const APPWRITE_DATABASE_ID = "timer";

export const COLLECTIONS = {
  profiles: "profiles",
  projects: "projects",
  tasks: "tasks",
  timeEntries: "time_entries",
} as const;

export type CollectionId = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/** Session cookie name Appwrite sets for a project: `a_session_<projectId>`. */
export function sessionCookieName(projectId: string): string {
  return `a_session_${projectId}`;
}

/** OAuth callback paths on the web app (see apps/web routes). */
export const OAUTH_CALLBACK_PATH = "/auth/callback";
