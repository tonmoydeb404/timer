// Types shared across the frontend. Backend (raw) types match the Rust
// serde output (snake_case); Appwrite shapes come from @packages/domain.

export type UpdateInfo = {
  version: string;
  body: string | null;
  date: string | null;
};

// ---- Auth (Appwrite SDK session in the webview) ----

export type AuthStatus = "signed_out" | "active" | "expired" | "unknown";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthState = {
  /** False when the Appwrite endpoint/project ID are not configured. */
  configured: boolean;
  status: AuthStatus;
  user: AuthUser | null;
};

// ---- Timer (mirrors Rust timer.rs serde output) ----

export type TimerStatus = "IDLE" | "WORKING" | "BREAK";

export type SegmentType = "WORK" | "BREAK";

export type SegmentView = {
  type: SegmentType;
  started_at_ms: number;
  ended_at_ms: number | null;
  duration_ms: number;
  /** Appwrite `time_entries` doc id, once the frontend creates the live record. */
  remote_id: string | null;
};

export type PendingEntry = {
  local_id: string;
  task_id: string | null;
  project_id: string | null;
  type: SegmentType;
  started_at: string;
  ended_at: string;
  attempts: number;
  /** Set if a live doc already exists for this segment — update instead of create. */
  remote_id: string | null;
};

export type TimerView = {
  status: TimerStatus;
  task_id: string | null;
  task_title: string | null;
  project_id: string | null;
  project_title: string | null;
  started_at_ms: number | null;
  total_ms: number;
  work_ms: number;
  break_ms: number;
  segments: SegmentView[];
  pending_count: number;
  pending: PendingEntry[];
};
