use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;

/// Shared state managed by Tauri: the SQLite connection for settings, the
/// lock that serializes timer mutations, and the app data directory where
/// the timer state file and logs live.
#[allow(dead_code)]
pub struct AppState {
    pub db: Mutex<Connection>,
    /// Serializes timer mutations so two rapid commands can never
    /// interleave and duplicate entries.
    pub timer_lock: tokio::sync::Mutex<()>,
    pub app_data_dir: PathBuf,
}

impl AppState {
    pub fn new(conn: Connection, app_data_dir: PathBuf) -> Self {
        AppState {
            db: Mutex::new(conn),
            timer_lock: tokio::sync::Mutex::new(()),
            app_data_dir,
        }
    }

    #[allow(dead_code)]
    pub fn logs_dir(&self) -> PathBuf {
        self.app_data_dir.join("logs")
    }
}
