// Types shared across the frontend. Keep backend (raw) types matching the
// Rust serde output (snake_case); define view types here as needed.

export type UpdateInfo = {
  version: string;
  body: string | null;
  date: string | null;
};

// ---- Auth (mirrors Rust appwrite.rs + packages/domain AuthState) ----

export type AuthStatus = "signed_out" | "active" | "expired" | "unknown";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthState = {
  configured: boolean;
  status: AuthStatus;
  user: AuthUser | null;
};

export type AuthConfig = {
  endpoint: string;
  project_configured: boolean;
};

export type OAuthPollStatus = "pending" | "success" | "closed" | "error";

export type OAuthPoll = {
  status: OAuthPollStatus;
  user_id: string | null;
  secret: string | null;
  message: string | null;
};
