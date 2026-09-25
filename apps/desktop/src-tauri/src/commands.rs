use std::collections::HashMap;
use tauri::{AppHandle, Emitter, Manager};

use crate::db;
use crate::state::AppState;

fn map_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// ---- Updater ----

#[derive(Debug, serde::Serialize)]
pub struct UpdateInfo {
    pub version: String,
    pub body: Option<String>,
    pub date: Option<String>,
}

/// Checks the updater endpoint. Emits `update://available` when a newer
/// version exists (listeners stay in sync) and returns it to the caller —
/// `None` when up to date. Shared by the boot check and the manual
/// `check_for_update` command.
pub async fn run_update_check(app: &AppHandle) -> Result<Option<UpdateInfo>, String> {
    use tauri_plugin_updater::UpdaterExt;

    let updater = app.updater().map_err(map_err)?;
    match updater.check().await.map_err(map_err)? {
        Some(update) => {
            let info = UpdateInfo {
                version: update.version.clone(),
                body: update.body.clone(),
                date: update.date.map(|d| d.to_string()),
            };
            let _ = app.emit("update://available", &info);
            Ok(Some(info))
        }
        None => Ok(None),
    }
}

/// Manual "Check for updates" (settings screen).
#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    run_update_check(&app).await
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;

    let updater = app.updater().map_err(map_err)?;
    match updater.check().await.map_err(map_err)? {
        Some(update) => {
            update
                .download_and_install(|_, _| {}, || {})
                .await
                .map_err(map_err)?;
            // On macOS/Linux: restart to apply the update.
            // On Windows: the process exits during install, so this is unreachable.
            app.request_restart();
        }
        None => return Err("No update available".into()),
    }
    Ok(())
}

// ---- Legacy timer state drain (pre-realtime versions) ----

/// Closed segments the old local-first version queued for upload in
/// `timer-state.json`. The frontend uploads them via the Appwrite SDK and
/// acks with `clear_legacy_pending`. The running timer itself is not
/// migrated — the cloud already mirrors it (open entries were created at
/// segment start by the old version too).
#[tauri::command]
pub async fn get_legacy_pending(
    app: AppHandle,
) -> Result<Vec<crate::timer::PendingEntry>, String> {
    let state = app.state::<AppState>();
    Ok(crate::timer::pending(&state.app_data_dir))
}

/// Removes uploaded entries from the legacy queue by their local ids.
#[tauri::command]
pub async fn clear_legacy_pending(
    app: AppHandle,
    local_ids: Vec<String>,
) -> Result<(), String> {
    let state = app.state::<AppState>();
    crate::timer::clear_pending(&state.app_data_dir, &local_ids).map_err(map_err)
}

// ---- Tray mirror ----

/// The frontend is the timer's source of truth; Rust renders whatever is
/// pushed here. Called on every state change and on a 30s cadence for the
/// elapsed readout.
#[tauri::command]
pub async fn set_tray_state(
    app: AppHandle,
    state: crate::tray::TrayState,
) -> Result<(), String> {
    {
        let managed = app.state::<AppState>();
        let mut tray = managed.tray.lock().map_err(map_err)?;
        *tray = state;
    }
    crate::tray::rebuild_menu(&app);
    Ok(())
}

// ---- Settings (SQLite key-value store) ----

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<HashMap<String, String>, String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(map_err)?;
    db::get_all_settings(&conn)
        .map(|v| v.into_iter().collect())
        .map_err(map_err)
}

#[tauri::command]
pub async fn set_setting(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(map_err)?;
    db::set_setting(&conn, &key, &value).map_err(map_err)
}

// ---- Auto-start ----

#[tauri::command]
pub async fn enable_autostart(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().enable().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn disable_autostart(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().disable().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn is_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

// ---- Updater ----
