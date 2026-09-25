import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  LegacyPendingEntry,
  TrayAction,
  TrayState,
  UpdateInfo,
} from "../types";

// All IPC wrappers live here — one entry per Rust command in
// src-tauri/src/commands.rs. Appwrite I/O (including realtime) happens in
// the webview via the SDK (see lib/appwrite.ts, lib/db.ts, lib/realtime.ts);
// Rust only renders the tray from pushed state.

export const api = {
  /** Legacy (pre-realtime) closed segments waiting for upload. */
  getLegacyPending: () => invoke<LegacyPendingEntry[]>("get_legacy_pending"),
  clearLegacyPending: (localIds: string[]) =>
    invoke<void>("clear_legacy_pending", { localIds }),

  /** Frontend is the timer source of truth; Rust only mirrors it here. */
  setTrayState: (state: TrayState) =>
    invoke<void>("set_tray_state", { state }),

  getSettings: () => invoke<Record<string, string>>("get_settings"),
  setSetting: (key: string, value: string) =>
    invoke<void>("set_setting", { key, value }),

  enableAutostart: () => invoke<void>("enable_autostart"),
  disableAutostart: () => invoke<void>("disable_autostart"),
  isAutostartEnabled: () => invoke<boolean>("is_autostart_enabled"),

  installUpdate: () => invoke<void>("install_update"),
  /** Manual updater check (settings) — null when up to date. */
  checkForUpdate: () => invoke<UpdateInfo | null>("check_for_update"),
};

// Backend → frontend events (emitted from Rust with app.emit(...)).

export function onUpdateAvailable(
  callback: (payload: UpdateInfo) => void,
): Promise<UnlistenFn> {
  return listen<UpdateInfo>("update://available", (event) =>
    callback(event.payload),
  );
}

/** Tray menu clicked a timer control; the frontend performs the API call. */
export function onTrayAction(
  callback: (action: TrayAction) => void,
): Promise<UnlistenFn> {
  return listen<TrayAction>("tymar://tray-action", (event) =>
    callback(event.payload),
  );
}

export function onOpenSwitcher(callback: () => void): Promise<UnlistenFn> {
  return listen("tymar://open-switcher", () => callback());
}

// Deep-link URLs forwarded by the single-instance guard (Windows/Linux).
export function onDeepLinkEvent(
  callback: (urls: string[]) => void,
): Promise<UnlistenFn> {
  return listen<string[]>("tymar://deep-link", (event) =>
    callback(event.payload),
  );
}
