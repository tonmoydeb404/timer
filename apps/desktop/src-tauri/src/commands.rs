use std::collections::HashMap;
use tauri::{AppHandle, Manager};

use crate::appwrite::{self, AppwriteError, AuthConfig, AuthState, AuthStatus, AuthUser};
use crate::db;
use crate::state::AppState;

fn map_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// ---- Auth (Appwrite user session) ----

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

// ---- OAuth popup window (Rust-owned so no extra capabilities are needed) ----

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum OAuthPollStatus {
    Pending,
    Success,
    Closed,
    Error,
}

#[derive(Debug, serde::Serialize)]
pub struct OAuthPoll {
    pub status: OAuthPollStatus,
    pub user_id: Option<String>,
    pub secret: Option<String>,
    pub message: Option<String>,
}

fn strip_query(url: &url::Url) -> String {
    let mut clone = url.clone();
    clone.set_query(None);
    clone.set_fragment(None);
    clone.to_string()
}

/// Opens (or focuses) the Google sign-in window. The frontend polls
/// `poll_oauth` until the user finishes or closes the window.
#[tauri::command]
pub async fn open_oauth_window(
    app: AppHandle,
    success_url: String,
    failure_url: String,
) -> Result<(), String> {
    let project = appwrite::project_id().ok_or(AppwriteError::NotConfigured).map_err(map_err)?;
    let success = url::Url::parse(&success_url).map_err(|e| format!("unexpected: bad success_url: {e}"))?;
    let failure = url::Url::parse(&failure_url).map_err(|e| format!("unexpected: bad failure_url: {e}"))?;

    if app.get_webview_window("oauth").is_some() {
        if let Some(window) = app.get_webview_window("oauth") {
            let _ = window.set_focus();
        }
        return Ok(());
    }

    let mut login = url::Url::parse(&format!(
        "{}/account/tokens/oauth2/google",
        appwrite::endpoint()
    ))
    .map_err(|e| format!("unexpected: {e}"))?;
    login
        .query_pairs_mut()
        .append_pair("project", &project)
        .append_pair("success", success.as_str())
        .append_pair("failure", failure.as_str());

    tauri::WebviewWindowBuilder::new(
        &app,
        "oauth",
        tauri::WebviewUrl::External(login.as_str().parse().map_err(map_err)?),
    )
    .title("Sign in with Google")
    .inner_size(480.0, 680.0)
    .center()
    .build()
    .map_err(map_err)?;
    Ok(())
}

/// Checks the OAuth window URL for the Appwrite callback
/// (`?userId=…&secret=…` appended to the success URL).
#[tauri::command]
pub async fn poll_oauth(
    app: AppHandle,
    success_url: String,
    failure_url: String,
) -> Result<OAuthPoll, String> {
    let success = url::Url::parse(&success_url).map_err(|e| format!("unexpected: bad success_url: {e}"))?;
    let failure = url::Url::parse(&failure_url).map_err(|e| format!("unexpected: bad failure_url: {e}"))?;

    let Some(window) = app.get_webview_window("oauth") else {
        return Ok(OAuthPoll {
            status: OAuthPollStatus::Closed,
            user_id: None,
            secret: None,
            message: None,
        });
    };

    let current = window.url().map_err(map_err)?;
    if strip_query(&current) == strip_query(&failure) {
        let _ = window.close();
        return Ok(OAuthPoll {
            status: OAuthPollStatus::Error,
            user_id: None,
            secret: None,
            message: Some("Google sign-in failed or was cancelled.".to_string()),
        });
    }
    if strip_query(&current) == strip_query(&success) {
        let params: HashMap<String, String> = current.query_pairs().into_owned().collect();
        let _ = window.close();
        match (params.get("userId"), params.get("secret")) {
            (Some(user_id), Some(secret)) => Ok(OAuthPoll {
                status: OAuthPollStatus::Success,
                user_id: Some(user_id.clone()),
                secret: Some(secret.clone()),
                message: None,
            }),
            _ => Ok(OAuthPoll {
                status: OAuthPollStatus::Error,
                user_id: None,
                secret: None,
                message: Some(
                    "Sign-in callback did not include credentials.".to_string(),
                ),
            }),
        }
    } else {
        Ok(OAuthPoll {
            status: OAuthPollStatus::Pending,
            user_id: None,
            secret: None,
            message: None,
        })
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
pub async fn set_setting(
    app: AppHandle,
    key: String,
    value: String,
) -> Result<(), String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(map_err)?;
    db::set_setting(&conn, &key, &value).map_err(map_err)
}

// ---- Auto-start ----

#[tauri::command]
pub async fn enable_autostart(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch()
        .enable()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn disable_autostart(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch()
        .disable()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn is_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch()
        .is_enabled()
        .map_err(|e| e.to_string())
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
