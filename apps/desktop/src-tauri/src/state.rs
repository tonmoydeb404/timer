use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;

/// Shared state managed by Tauri. Extend with whatever your app needs
/// (caches, background workers, connections…).
#[allow(dead_code)]
pub struct AppState {
    pub db: Mutex<Connection>,
    pub http: reqwest::Client,
    /// Serializes timer mutations (including their network push) so two
    /// rapid commands can never interleave and duplicate entries.
    pub timer_lock: tokio::sync::Mutex<()>,
    /// Result of the in-flight browser OAuth flow, written by the loopback
    /// callback server and consumed by `poll_oauth`.
    pub oauth_result: Mutex<Option<OAuthOutcome>>,
    pub app_data_dir: PathBuf,
}

/// Outcome of one system-browser OAuth attempt.
#[derive(Debug, Clone)]
pub enum OAuthOutcome {
    Success { user_id: String, secret: String },
    Failed(String),
}

impl AppState {
    pub fn new(conn: Connection, app_data_dir: PathBuf) -> Self {
        AppState {
            db: Mutex::new(conn),
            http: crate::appwrite::http_client(),
            timer_lock: tokio::sync::Mutex::new(()),
            oauth_result: Mutex::new(None),
            app_data_dir,
        }
    }

    #[allow(dead_code)]
    pub fn logs_dir(&self) -> PathBuf {
        self.app_data_dir.join("logs")
    }
}
