use std::collections::HashMap;
use tauri::{AppHandle, Emitter, Manager};

use crate::db;
use crate::state::AppState;

fn map_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// ---- Timer (local state machine; the frontend uploads results) ----

/// Runs a timer mutation under the timer lock: transition the store,
/// persist it, then broadcast the view. Closed segments land in the
/// store's pending queue; the frontend uploads them via the Appwrite SDK
/// and confirms with `ack_entries`.
async fn mutate_timer(
    app: &AppHandle,
    transition: impl FnOnce(
        &mut crate::timer::TimerStore,
        i64,
    ) -> Result<Vec<crate::timer::PendingEntry>, crate::timer::TransitionError>,
) -> Result<crate::timer::TimerView, String> {
    let state = app.state::<AppState>();
    let _guard = state.timer_lock.lock().await;
    let now = crate::timer::now_ms();

    let mut store = crate::timer::load(&state.app_data_dir);
    let entries = transition(&mut store, now).map_err(map_err)?;
    store.pending.extend(entries);
    crate::timer::save(&state.app_data_dir, &store).map_err(map_err)?;

    let view = crate::timer::view(&store, crate::timer::now_ms());
    let _ = app.emit("tymar://changed", &view);
    crate::tray::rebuild_menu(app);
    Ok(view)
}

#[tauri::command]
pub async fn get_timer_state(app: AppHandle) -> Result<crate::timer::TimerView, String> {
    let state = app.state::<AppState>();
    let store = crate::timer::load(&state.app_data_dir);
    Ok(crate::timer::view(&store, crate::timer::now_ms()))
}

/// Removes uploaded entries from the pending queue by their local ids.
#[tauri::command]
pub async fn ack_entries(
    app: AppHandle,
    local_ids: Vec<String>,
) -> Result<crate::timer::TimerView, String> {
    let state = app.state::<AppState>();
    let _guard = state.timer_lock.lock().await;

    let mut store = crate::timer::load(&state.app_data_dir);
    store
        .pending
        .retain(|e| !local_ids.iter().any(|id| id == &e.local_id));
    crate::timer::save(&state.app_data_dir, &store).map_err(map_err)?;

    let view = crate::timer::view(&store, crate::timer::now_ms());
    let _ = app.emit("tymar://changed", &view);
    crate::tray::rebuild_menu(&app);
    Ok(view)
}

#[tauri::command]
pub async fn start_timer(
    app: AppHandle,
    task_id: Option<String>,
    task_title: Option<String>,
    project_id: Option<String>,
    project_title: Option<String>,
) -> Result<crate::timer::TimerView, String> {
    mutate_timer(&app, |store, now| {
        crate::timer::start(
            store,
            task_id.as_deref(),
            task_title.as_deref(),
            project_id.as_deref(),
            project_title.as_deref(),
            now,
        )
        .map(|_| Vec::new())
    })
    .await
}

#[tauri::command]
pub async fn take_break(app: AppHandle) -> Result<crate::timer::TimerView, String> {
    mutate_timer(&app, |store, now| {
        crate::timer::take_break(store, now).map(|_| Vec::new())
    })
    .await
}

#[tauri::command]
pub async fn resume_timer(app: AppHandle) -> Result<crate::timer::TimerView, String> {
    mutate_timer(&app, |store, now| {
        crate::timer::resume(store, now).map(|_| Vec::new())
    })
    .await
}

#[tauri::command]
pub async fn stop_timer(app: AppHandle) -> Result<crate::timer::TimerView, String> {
    mutate_timer(&app, crate::timer::stop).await
}

/// Attaches the Appwrite doc id the frontend just created for the
/// currently open segment, so cross-device clients can see (and later
/// control) the running timer, and so closing the segment updates that
/// doc in place instead of creating a duplicate.
#[tauri::command]
pub async fn attach_open_segment_remote_id(
    app: AppHandle,
    remote_id: String,
) -> Result<crate::timer::TimerView, String> {
    let state = app.state::<AppState>();
    let _guard = state.timer_lock.lock().await;

    let mut store = crate::timer::load(&state.app_data_dir);
    crate::timer::attach_open_segment_remote_id(&mut store, &remote_id);
    crate::timer::save(&state.app_data_dir, &store).map_err(map_err)?;

    let view = crate::timer::view(&store, crate::timer::now_ms());
    let _ = app.emit("tymar://changed", &view);
    crate::tray::rebuild_menu(&app);
    Ok(view)
}

#[tauri::command]
pub async fn switch_task(
    app: AppHandle,
    task_id: Option<String>,
    task_title: Option<String>,
    project_id: Option<String>,
    project_title: Option<String>,
) -> Result<crate::timer::TimerView, String> {
    mutate_timer(&app, |store, now| {
        crate::timer::switch_task(
            store,
            task_id.as_deref(),
            task_title.as_deref(),
            project_id.as_deref(),
            project_title.as_deref(),
            now,
        )
    })
    .await
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
