import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Project, Task } from "@packages/domain/index";
import type {
  AuthConfig,
  AuthState,
  AuthUser,
  OAuthPoll,
  UpdateInfo,
} from "../types";

// All IPC wrappers live here — one entry per Rust command in
// src-tauri/src/commands.rs.

export const api = {
  getAuthConfig: () => invoke<AuthConfig>("get_auth_config"),
  getAuthState: () => invoke<AuthState>("get_auth_state"),
  setSession: (userId: string, secret: string) =>
    invoke<AuthUser>("set_session", { userId, secret }),
  signOut: () => invoke<void>("sign_out"),

  openOAuthWindow: (successUrl: string, failureUrl: string) =>
    invoke<void>("open_oauth_window", {
      successUrl,
      failureUrl,
    }),
  pollOAuth: (successUrl: string, failureUrl: string) =>
    invoke<OAuthPoll>("poll_oauth", { successUrl, failureUrl }),

  listProjects: () => invoke<Project[]>("list_projects"),
  listTasks: (projectId?: string | null) =>
    invoke<Task[]>("list_tasks", { projectId: projectId ?? null }),
  createTask: (projectId: string, title: string) =>
    invoke<Task>("create_task", { projectId, title }),

  getSettings: () => invoke<Record<string, string>>("get_settings"),
  setSetting: (key: string, value: string) =>
    invoke<void>("set_setting", { key, value }),

  enableAutostart: () => invoke<void>("enable_autostart"),
  disableAutostart: () => invoke<void>("disable_autostart"),
  isAutostartEnabled: () => invoke<boolean>("is_autostart_enabled"),

  installUpdate: () => invoke<void>("install_update"),
};

// Backend → frontend events (emitted from Rust with app.emit(...)).

export function onUpdateAvailable(
  callback: (payload: UpdateInfo) => void,
): Promise<UnlistenFn> {
  return listen<UpdateInfo>("update://available", (event) =>
    callback(event.payload),
  );
}
