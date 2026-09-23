import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { TimerView, UpdateInfo } from "../types";

// All IPC wrappers live here — one entry per Rust command in
// src-tauri/src/commands.rs. Appwrite I/O happens in the webview via the
// Appwrite SDK (see lib/appwrite.ts, lib/db.ts); Rust owns local state.

export const api = {
  getTimerState: () => invoke<TimerView>("get_timer_state"),
  ackEntries: (localIds: string[]) =>
    invoke<TimerView>("ack_entries", { localIds }),
  startTimer: (
    taskId: string | null,
    taskTitle: string | null,
    projectId: string | null,
    projectTitle: string | null,
  ) =>
    invoke<TimerView>("start_timer", {
      taskId,
      taskTitle,
      projectId,
      projectTitle,
    }),
  takeBreak: () => invoke<TimerView>("take_break"),
  resumeTimer: () => invoke<TimerView>("resume_timer"),
  stopTimer: () => invoke<TimerView>("stop_timer"),
  switchTask: (
    taskId: string | null,
    taskTitle: string | null,
    projectId: string | null,
    projectTitle: string | null,
  ) =>
    invoke<TimerView>("switch_task", {
      taskId,
      taskTitle,
      projectId,
      projectTitle,
    }),

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

export function onTimerChanged(
  callback: (payload: TimerView) => void,
): Promise<UnlistenFn> {
  return listen<TimerView>("timer://changed", (event) =>
    callback(event.payload),
  );
}

export function onOpenSwitcher(callback: () => void): Promise<UnlistenFn> {
  return listen("timer://open-switcher", () => callback());
}

// Deep-link URLs forwarded by the single-instance guard (Windows/Linux).
export function onDeepLinkEvent(
  callback: (urls: string[]) => void,
): Promise<UnlistenFn> {
  return listen<string[]>("timer://deep-link", (event) =>
    callback(event.payload),
  );
}
