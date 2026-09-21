use std::collections::HashMap;
use tauri::{AppHandle, Emitter, Manager};

use crate::appwrite::{self, AppwriteError, AuthConfig, AuthState, AuthStatus, AuthUser};
use crate::db;
use crate::state::AppState;

fn map_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// ---- Auth (Appwrite user session) ----

/// Receives the Appwrite endpoint/project from the frontend at boot (it
/// reads them from its `.env`). Overrides compile-time values when set.
#[tauri::command]
pub async fn set_auth_config(endpoint: String, project_id: String) -> Result<(), String> {
    appwrite::set_runtime_config(endpoint, project_id);
    Ok(())
}

#[tauri::command]
pub async fn get_auth_config() -> Result<AuthConfig, String> {
    Ok(AuthConfig {
        endpoint: appwrite::endpoint(),
        project_configured: appwrite::project_id().is_some(),
    })
}

#[tauri::command]
pub async fn get_auth_state(app: AppHandle) -> Result<AuthState, String> {
    if appwrite::project_id().is_none() {
        return Ok(AuthState {
            configured: false,
            status: AuthStatus::Unknown,
            user: None,
        });
    }

    let state = app.state::<AppState>();
    let (secret, _) = {
        let conn = state.db.lock().map_err(map_err)?;
        appwrite::load_session(&conn)
    };

    let secret = match secret {
        Some(s) => s,
        None => {
            return Ok(AuthState {
                configured: true,
                status: AuthStatus::SignedOut,
                user: None,
            })
        }
    };

    match appwrite::get_account(&state.http, &secret).await {
        Ok(user) => Ok(AuthState {
            configured: true,
            status: AuthStatus::Active,
            user: Some(user),
        }),
        Err(AppwriteError::Unauthorized) => {
            // Session is dead server-side; drop it locally.
            let conn = state.db.lock().map_err(map_err)?;
            appwrite::clear_session(&conn).map_err(map_err)?;
            Ok(AuthState {
                configured: true,
                status: AuthStatus::Expired,
                user: None,
            })
        }
        Err(AppwriteError::Network(_)) => Ok(AuthState {
            configured: true,
            status: AuthStatus::Unknown,
            user: None,
        }),
        Err(e) => Err(e.to_string()),
    }
}

/// Exchange the one-time OAuth token for a persistent session and store it.
#[tauri::command]
pub async fn set_session(
    app: AppHandle,
    user_id: String,
    secret: String,
) -> Result<AuthUser, String> {
    let state = app.state::<AppState>();
    let session_secret = appwrite::create_session(&state.http, &user_id, &secret)
        .await
        .map_err(map_err)?;
    let user = appwrite::get_account(&state.http, &session_secret)
        .await
        .map_err(map_err)?;
    let conn = state.db.lock().map_err(map_err)?;
    appwrite::store_session(&conn, &user.id, &session_secret).map_err(map_err)?;
    Ok(user)
}

#[tauri::command]
pub async fn sign_out(app: AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let (secret, _) = {
        let conn = state.db.lock().map_err(map_err)?;
        appwrite::load_session(&conn)
    };
    // Best effort: the local session is cleared even if the network fails.
    if let Some(secret) = secret {
        let _ = appwrite::delete_current_session(&state.http, &secret).await;
    }
    let conn = state.db.lock().map_err(map_err)?;
    appwrite::clear_session(&conn).map_err(map_err)?;
    Ok(())
}

// ---- Projects & tasks (live Appwrite reads/writes, no local mirror) ----

#[tauri::command]
pub async fn list_projects(app: AppHandle) -> Result<Vec<appwrite::Project>, String> {
    let state = app.state::<AppState>();
    let session = {
        let conn = state.db.lock().map_err(map_err)?;
        appwrite::require_session(&conn).map_err(map_err)?
    };
    appwrite::fetch_projects(&state.http, &session)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn list_tasks(
    app: AppHandle,
    project_id: Option<String>,
) -> Result<Vec<appwrite::Task>, String> {
    let state = app.state::<AppState>();
    let session = {
        let conn = state.db.lock().map_err(map_err)?;
        appwrite::require_session(&conn).map_err(map_err)?
    };
    appwrite::fetch_tasks(&state.http, &session, project_id.as_deref())
        .await
        .map_err(map_err)
}

/// Quick-add a task into an existing project (project CRUD stays on web).
#[tauri::command]
pub async fn create_task(
    app: AppHandle,
    project_id: String,
    title: String,
) -> Result<appwrite::Task, String> {
    let state = app.state::<AppState>();
    let session = {
        let conn = state.db.lock().map_err(map_err)?;
        appwrite::require_session(&conn).map_err(map_err)?
    };
    appwrite::insert_task(&state.http, &session, &project_id, &title)
        .await
        .map_err(map_err)
}

// ---- Timer (desktop owns the live timer; Appwrite stores results) ----

/// Runs a timer mutation under the timer lock: transition the store,
/// persist it, push queued entries, persist again, then broadcast the view.
/// Network failures never fail the user action — entries stay queued.
async fn mutate_timer(
    app: &AppHandle,
    transition: impl FnOnce(
        &mut crate::timer::TimerStore,
        i64,
    )
        -> Result<Vec<crate::timer::PendingEntry>, crate::timer::TransitionError>,
) -> Result<crate::timer::TimerView, String> {
    let state = app.state::<AppState>();
    let _guard = state.timer_lock.lock().await;
    let now = crate::timer::now_ms();

    let mut store = crate::timer::load(&state.app_data_dir);
    let entries = transition(&mut store, now).map_err(map_err)?;
    store.pending.extend(entries);
    crate::timer::save(&state.app_data_dir, &store).map_err(map_err)?;

    // Extract an owned session and drop the DB guard before any await:
    // MutexGuard<Connection> is !Send.
    let session: Option<appwrite::Session> = {
        let conn = state.db.lock().map_err(map_err)?;
        appwrite::require_session(&conn).ok()
    };
    if let Some(session) = session {
        appwrite::push_pending(&state.http, &session, &mut store).await;
        // Best effort: a failed save here only delays the next retry.
        let _ = crate::timer::save(&state.app_data_dir, &store);
    }

    let view = crate::timer::view(&store, crate::timer::now_ms());
    let _ = app.emit("timer://changed", &view);
    crate::tray::rebuild_menu(app);
    Ok(view)
}

#[tauri::command]
pub async fn get_timer_state(app: AppHandle) -> Result<crate::timer::TimerView, String> {
    let state = app.state::<AppState>();
    let store = crate::timer::load(&state.app_data_dir);
    Ok(crate::timer::view(&store, crate::timer::now_ms()))
}

#[tauri::command]
pub async fn start_timer(
    app: AppHandle,
    task_id: String,
    task_title: String,
) -> Result<crate::timer::TimerView, String> {
    mutate_timer(&app, |store, now| {
        crate::timer::start(store, &task_id, &task_title, now).map(|_| Vec::new())
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

#[tauri::command]
pub async fn switch_task(
    app: AppHandle,
    task_id: String,
    task_title: String,
) -> Result<crate::timer::TimerView, String> {
    mutate_timer(&app, |store, now| {
        crate::timer::switch_task(store, &task_id, &task_title, now)
    })
    .await
}

// ---- Browser OAuth (system browser + loopback callback server) ----

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum OAuthPollStatus {
    Pending,
    Success,
    Error,
}

#[derive(Debug, serde::Serialize)]
pub struct OAuthPoll {
    pub status: OAuthPollStatus,
    pub user_id: Option<String>,
    pub secret: Option<String>,
    pub message: Option<String>,
}

const OAUTH_SERVER_LIFETIME_SECS: u64 = 360;

fn oauth_page(title: &str, body: &str) -> String {
    format!(
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\">\
         <title>{title}</title>\
         <style>body{{font-family:system-ui,sans-serif;display:flex;min-height:90vh;\
         align-items:center;justify-content:center;background:#f8fafc;color:#0f172a;\
         margin:0}}main{{text-align:center;max-width:24rem;padding:2rem}}h1{{font-size:1.1rem}}</style>\
         </head><body><main><h1>{title}</h1><p>{body}</p></main></body></html>",
    )
}

fn respond(mut stream: std::net::TcpStream, status: &str, html: &str) {
    let body = html.as_bytes();
    let _ = stream.set_write_timeout(Some(std::time::Duration::from_secs(5)));
    let _ = std::io::Write::write_all(
        &mut stream,
        format!(
            "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
            body.len()
        )
        .as_bytes(),
    );
    let _ = std::io::Write::write_all(&mut stream, body);
}

/// Decides an OAuth callback request purely from its path: the outcome to
/// store (if the attempt is decided) plus the HTTP status/body to reply.
fn decide_oauth_request(path: &str) -> (Option<crate::state::OAuthOutcome>, &'static str, String) {
    if path.starts_with("/callback") {
        let query = path.split_once('?').map(|(_, q)| q).unwrap_or("");
        let params: HashMap<String, String> = url::form_urlencoded::parse(query.as_bytes())
            .into_owned()
            .collect();
        match (params.get("userId"), params.get("secret")) {
            (Some(user_id), Some(secret)) => (
                Some(crate::state::OAuthOutcome::Success {
                    user_id: user_id.clone(),
                    secret: secret.clone(),
                }),
                "200 OK",
                oauth_page("Signed in", "You can close this tab and return to the app."),
            ),
            _ => (
                Some(crate::state::OAuthOutcome::Failed(
                    "Sign-in callback did not include credentials.".to_string(),
                )),
                "200 OK",
                oauth_page(
                    "Sign-in incomplete",
                    "The callback did not include credentials. You can close this tab.",
                ),
            ),
        }
    } else if path.starts_with("/error") {
        (
            Some(crate::state::OAuthOutcome::Failed(
                "Google sign-in failed or was cancelled.".to_string(),
            )),
            "200 OK",
            oauth_page(
                "Sign-in cancelled",
                "You can close this tab and try again from the app.",
            ),
        )
    } else {
        (None, "404 Not Found", oauth_page("Not found", ""))
    }
}

/// Handles one callback request. Returns true when the OAuth attempt is
/// decided (success or failure) and the server can shut down.
fn handle_oauth_request(stream: std::net::TcpStream, app: &AppHandle) -> bool {
    use std::io::Read;

    let request_line = stream
        .set_read_timeout(Some(std::time::Duration::from_secs(5)))
        .ok()
        .and_then(|_| {
            let mut buf = [0u8; 8192];
            let n = (&stream).take(buf.len() as u64).read(&mut buf).ok()?;
            String::from_utf8(buf[..n].to_vec()).ok()
        })
        .and_then(|text| text.lines().next().map(str::to_string))
        .unwrap_or_default();
    let path = request_line
        .split_whitespace()
        .nth(1)
        .unwrap_or("/")
        .to_string();

    let (outcome, status, html) = decide_oauth_request(&path);
    respond(stream, status, &html);
    if let Some(outcome) = outcome {
        if let Ok(mut guard) = app.state::<AppState>().oauth_result.lock() {
            *guard = Some(outcome);
        }
        return true;
    }
    false
}

/// Opens the Google sign-in page in the system browser. Appwrite redirects
/// back to a loopback server owned by this process; the frontend polls
/// `poll_oauth` for the captured credentials.
#[tauri::command]
pub async fn open_oauth_window(app: AppHandle) -> Result<(), String> {
    let project = appwrite::project_id()
        .ok_or(AppwriteError::NotConfigured)
        .map_err(map_err)?;

    let listener =
        std::net::TcpListener::bind("127.0.0.1:0").map_err(|e| format!("unexpected: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("unexpected: {e}"))?
        .port();
    let callback = format!("http://127.0.0.1:{port}/callback");
    let failure = format!("http://127.0.0.1:{port}/error");

    // Reset any previous attempt's result.
    if let Ok(mut guard) = app.state::<AppState>().oauth_result.lock() {
        *guard = None;
    }

    let mut login = url::Url::parse(&format!(
        "{}/account/tokens/oauth2/google",
        appwrite::endpoint()
    ))
    .map_err(|e| format!("unexpected: {e}"))?;
    login
        .query_pairs_mut()
        .append_pair("project", &project)
        .append_pair("success", &callback)
        .append_pair("failure", &failure);

    tauri_plugin_opener::open_url(login.as_str(), None::<&str>).map_err(map_err)?;

    // Blocking accept loop on a background thread; exits after one decision
    // or when the lifetime expires (the frontend has its own timeout too).
    std::thread::spawn(move || {
        let _ = listener.set_nonblocking(true);
        let start = std::time::Instant::now();
        let lifetime = std::time::Duration::from_secs(OAUTH_SERVER_LIFETIME_SECS);
        while start.elapsed() < lifetime {
            match listener.accept() {
                Ok((stream, _)) => {
                    if handle_oauth_request(stream, &app) {
                        break;
                    }
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(std::time::Duration::from_millis(200));
                }
                Err(_) => break,
            }
        }
    });
    Ok(())
}

/// Returns the captured OAuth result, if the browser flow finished.
#[tauri::command]
pub async fn poll_oauth(app: AppHandle) -> Result<OAuthPoll, String> {
    let outcome = app
        .state::<AppState>()
        .oauth_result
        .lock()
        .map_err(map_err)?
        .clone();
    match outcome {
        None => Ok(OAuthPoll {
            status: OAuthPollStatus::Pending,
            user_id: None,
            secret: None,
            message: None,
        }),
        Some(crate::state::OAuthOutcome::Success { user_id, secret }) => Ok(OAuthPoll {
            status: OAuthPollStatus::Success,
            user_id: Some(user_id),
            secret: Some(secret),
            message: None,
        }),
        Some(crate::state::OAuthOutcome::Failed(message)) => Ok(OAuthPoll {
            status: OAuthPollStatus::Error,
            user_id: None,
            secret: None,
            message: Some(message),
        }),
    }
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::OAuthOutcome;

    #[test]
    fn callback_with_credentials_succeeds() {
        let (outcome, status, _) = decide_oauth_request("/callback?userId=abc&secret=xyz");
        assert_eq!(status, "200 OK");
        match outcome {
            Some(OAuthOutcome::Success { user_id, secret }) => {
                assert_eq!(user_id, "abc");
                assert_eq!(secret, "xyz");
            }
            other => panic!("expected success, got {other:?}"),
        }
    }

    #[test]
    fn callback_without_credentials_fails() {
        let (outcome, status, _) = decide_oauth_request("/callback");
        assert_eq!(status, "200 OK");
        assert!(matches!(outcome, Some(OAuthOutcome::Failed(_))));
    }

    #[test]
    fn error_path_fails() {
        let (outcome, status, _) = decide_oauth_request("/error?foo=bar");
        assert_eq!(status, "200 OK");
        assert!(matches!(outcome, Some(OAuthOutcome::Failed(_))));
    }

    #[test]
    fn unrelated_paths_keep_waiting() {
        for path in ["/", "/favicon.ico", "/robots.txt"] {
            let (outcome, status, _) = decide_oauth_request(path);
            assert_eq!(status, "404 Not Found");
            assert!(outcome.is_none(), "path {path} should not decide");
        }
    }
}
