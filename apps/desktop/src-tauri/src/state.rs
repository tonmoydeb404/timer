use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;

use crate::tray::TrayState;

/// Shared state managed by Tauri: the SQLite connection for settings, the
/// tray's mirrored timer state (pushed from the frontend), and the app data
/// directory where logs and the legacy timer state file live.
#[allow(dead_code)]
pub struct AppState {
    pub db: Mutex<Connection>,
    /// Timer state the frontend pushes for the tray to render. Rust owns
    /// no timer state — the cloud (Appwrite) is the source of truth.
    pub tray: Mutex<TrayState>,
    pub app_data_dir: PathBuf,
}

impl AppState {
    pub fn new(conn: Connection, app_data_dir: PathBuf) -> Self {
        AppState {
            db: Mutex::new(conn),
            tray: Mutex::new(TrayState::default()),
            app_data_dir,
        }
    }

    #[allow(dead_code)]
    pub fn logs_dir(&self) -> PathBuf {
        self.app_data_dir.join("logs")
    }
}
