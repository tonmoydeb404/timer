//! Minimal Appwrite Cloud REST client.
//!
//! The desktop talks to Appwrite directly (cloud-first MVP): no local mirror,
//! no sync engine. Auth is a user session persisted in the settings store;
//! every request carries `X-Appwrite-Project` plus the session cookie
//! `a_session_<projectId>`. Shapes mirror `packages/domain` (TypeScript).

use std::fmt;
use std::time::Duration;

use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, CONTENT_TYPE, COOKIE};
use serde::{Deserialize, Serialize};

const DEFAULT_ENDPOINT: &str = "https://cloud.appwrite.io/v1";
const RESPONSE_FORMAT: &str = "2.0.0";

const SESSION_SECRET_KEY: &str = "appwrite.session_secret";
const SESSION_USER_KEY: &str = "appwrite.user_id";

// ---- Build-time configuration (export APPWRITE_* when building) ----

pub fn endpoint() -> String {
    option_env!("APPWRITE_ENDPOINT")
        .unwrap_or(DEFAULT_ENDPOINT)
        .trim_end_matches('/')
        .to_string()
}

pub fn project_id() -> Option<String> {
    option_env!("APPWRITE_PROJECT_ID")
        .map(str::to_string)
        .filter(|s| !s.trim().is_empty())
}

pub fn session_cookie_name(project: &str) -> String {
    format!("a_session_{project}")
}

// ---- Serializable state (mirrors packages/domain AuthState) ----

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AuthStatus {
    SignedOut,
    Active,
    Expired,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthUser {
    pub id: String,
    pub name: String,
    pub email: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AuthState {
    pub configured: bool,
    pub status: AuthStatus,
    pub user: Option<AuthUser>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AuthConfig {
    pub endpoint: String,
    pub project_configured: bool,
}

// ---- Errors (surfaced to the frontend as "code: detail" strings) ----

#[derive(Debug)]
pub enum AppwriteError {
    NotConfigured,
    Unauthorized,
    Network(String),
    Server(u16, String),
    Unexpected(String),
}

impl fmt::Display for AppwriteError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppwriteError::NotConfigured => write!(
                f,
                "not_configured: APPWRITE_ENDPOINT/APPWRITE_PROJECT_ID missing at build time"
            ),
            AppwriteError::Unauthorized => {
                write!(f, "unauthorized: session expired or invalid")
            }
            AppwriteError::Network(detail) => write!(f, "network: {detail}"),
            AppwriteError::Server(status, detail) => {
                write!(f, "server ({status}): {detail}")
            }
            AppwriteError::Unexpected(detail) => write!(f, "unexpected: {detail}"),
        }
    }
}

impl From<reqwest::Error> for AppwriteError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() || err.is_connect() {
            AppwriteError::Network(err.to_string())
        } else if err.is_decode() || err.is_body() || err.is_builder() {
            AppwriteError::Unexpected(err.to_string())
        } else {
            AppwriteError::Network(err.to_string())
        }
    }
}

// ---- HTTP helpers ----

pub fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .expect("failed to build http client")
}

fn headers(project: &str, session_secret: Option<&str>) -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(
        "X-Appwrite-Project",
        HeaderValue::from_str(project).expect("invalid project id"),
    );
    headers.insert(
        "X-Appwrite-Response-Format",
        HeaderValue::from_static(RESPONSE_FORMAT),
    );
    headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    if let Some(secret) = session_secret {
        let cookie = format!("{}={}", session_cookie_name(project), secret);
        if let Ok(value) = HeaderValue::from_str(&cookie) {
            headers.insert(COOKIE, value);
        }
    }
    headers
}

fn status_error(status: reqwest::StatusCode, body: &str) -> AppwriteError {
    if status == reqwest::StatusCode::UNAUTHORIZED
        || status == reqwest::StatusCode::FORBIDDEN
    {
        return AppwriteError::Unauthorized;
    }
    // Try to surface Appwrite's own message: {"message": "..."}.
    let detail = serde_json::from_str::<serde_json::Value>(body)
        .ok()
        .and_then(|v| v.get("message")?.as_str().map(str::to_string))
        .unwrap_or_else(|| {
            body.chars().take(300).collect::<String>().trim().to_string()
        });
    AppwriteError::Server(status.as_u16(), detail)
}

// ---- Raw API calls ----

#[derive(Debug, Deserialize)]
struct SessionResponse {
    #[serde(rename = "$id")]
    _id: String,
    #[serde(rename = "userId")]
    user_id: String,
    secret: String,
}

#[derive(Debug, Deserialize)]
struct AccountResponse {
    #[serde(rename = "$id")]
    id: String,
    name: String,
    email: String,
}

/// Exchange the one-time OAuth token (userId + secret from the callback URL)
/// for a persistent session. Returns the session secret to store locally.
pub async fn create_session(
    http: &reqwest::Client,
    user_id: &str,
    token_secret: &str,
) -> Result<String, AppwriteError> {
    let project = project_id().ok_or(AppwriteError::NotConfigured)?;
    let url = format!("{}/account/sessions/token", endpoint());
    let res = http
        .post(&url)
        .headers(headers(&project, None))
        .json(&serde_json::json!({ "userId": user_id, "secret": token_secret }))
        .send()
        .await?;
    let status = res.status();
    let body = res.text().await?;
    if !status.is_success() {
        return Err(status_error(status, &body));
    }
    let session: SessionResponse =
        serde_json::from_str(&body).map_err(|e| AppwriteError::Unexpected(e.to_string()))?;
    if session.user_id != user_id {
        return Err(AppwriteError::Unexpected(
            "session user mismatch".to_string(),
        ));
    }
    Ok(session.secret)
}

pub async fn get_account(
    http: &reqwest::Client,
    session_secret: &str,
) -> Result<AuthUser, AppwriteError> {
    let project = project_id().ok_or(AppwriteError::NotConfigured)?;
    let url = format!("{}/account", endpoint());
    let res = http
        .get(&url)
        .headers(headers(&project, Some(session_secret)))
        .send()
        .await?;
    let status = res.status();
    let body = res.text().await?;
    if !status.is_success() {
        return Err(status_error(status, &body));
    }
    let account: AccountResponse =
        serde_json::from_str(&body).map_err(|e| AppwriteError::Unexpected(e.to_string()))?;
    Ok(AuthUser {
        id: account.id,
        name: account.name,
        email: account.email,
    })
}

pub async fn delete_current_session(
    http: &reqwest::Client,
    session_secret: &str,
) -> Result<(), AppwriteError> {
    let project = project_id().ok_or(AppwriteError::NotConfigured)?;
    let url = format!("{}/account/sessions/current", endpoint());
    let res = http
        .delete(&url)
        .headers(headers(&project, Some(session_secret)))
        .send()
        .await?;
    let status = res.status();
    if status.is_success() || status == reqwest::StatusCode::NO_CONTENT {
        return Ok(());
    }
    let body = res.text().await.unwrap_or_default();
    Err(status_error(status, &body))
}

// ---- Stored session (settings key-value store) ----

pub fn load_session(conn: &rusqlite::Connection) -> (Option<String>, Option<String>) {
    let secret = crate::db::get_setting(conn, SESSION_SECRET_KEY);
    let user_id = crate::db::get_setting(conn, SESSION_USER_KEY);
    (secret, user_id)
}

pub fn store_session(
    conn: &rusqlite::Connection,
    user_id: &str,
    secret: &str,
) -> Result<(), rusqlite::Error> {
    conn.execute_batch("BEGIN IMMEDIATE")?;
    let result = (|| {
        crate::db::set_setting(conn, SESSION_USER_KEY, user_id)?;
        crate::db::set_setting(conn, SESSION_SECRET_KEY, secret)?;
        Ok::<(), rusqlite::Error>(())
    })();
    if result.is_ok() {
        conn.execute_batch("COMMIT")?;
    } else {
        conn.execute_batch("ROLLBACK")?;
    }
    result
}

pub fn clear_session(conn: &rusqlite::Connection) -> Result<(), rusqlite::Error> {
    conn.execute(
        "DELETE FROM settings WHERE key IN (?1, ?2)",
        rusqlite::params![SESSION_USER_KEY, SESSION_SECRET_KEY],
    )?;
    Ok(())
}
