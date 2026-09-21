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
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return AppwriteError::Unauthorized;
    }
    // Try to surface Appwrite's own message: {"message": "..."}.
    let detail = serde_json::from_str::<serde_json::Value>(body)
        .ok()
        .and_then(|v| v.get("message")?.as_str().map(str::to_string))
        .unwrap_or_else(|| {
            body.chars()
                .take(300)
                .collect::<String>()
                .trim()
                .to_string()
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

// ---- Generic row access (TablesDB rows API, user session) ----

const DATABASE_ID: &str = "timer";

pub const COLLECTION_PROJECTS: &str = "projects";
pub const COLLECTION_TASKS: &str = "tasks";
pub const COLLECTION_TIME_ENTRIES: &str = "time_entries";

pub struct Session {
    pub user_id: String,
    pub secret: String,
}

pub fn require_session(conn: &rusqlite::Connection) -> Result<Session, AppwriteError> {
    match load_session(conn) {
        (Some(secret), Some(user_id)) => Ok(Session { user_id, secret }),
        _ => Err(AppwriteError::Unauthorized),
    }
}

/// Query helpers — serialized Appwrite `Query` objects (`queries[]` params).
pub fn q_equal(attribute: &str, value: &str) -> serde_json::Value {
    serde_json::json!({"method": "equal", "attribute": attribute, "values": [value]})
}

pub fn q_is_null(attribute: &str) -> serde_json::Value {
    serde_json::json!({"method": "isNull", "attribute": attribute})
}

pub fn q_order_desc(attribute: &str) -> serde_json::Value {
    serde_json::json!({"method": "orderDesc", "attribute": attribute})
}

pub fn q_limit(n: u32) -> serde_json::Value {
    serde_json::json!({"method": "limit", "values": [n]})
}

pub async fn list_documents(
    http: &reqwest::Client,
    session: &Session,
    collection: &str,
    queries: &[serde_json::Value],
) -> Result<Vec<serde_json::Value>, AppwriteError> {
    let project = project_id().ok_or(AppwriteError::NotConfigured)?;
    let url = format!(
        "{}/tablesdb/{}/tables/{}/rows",
        endpoint(),
        DATABASE_ID,
        collection
    );
    let params: Vec<(String, String)> = queries
        .iter()
        .map(|q| ("queries[]".to_string(), q.to_string()))
        .collect();
    let res = http
        .get(&url)
        .headers(headers(&project, Some(&session.secret)))
        .query(&params)
        .send()
        .await?;
    let status = res.status();
    let body = res.text().await?;
    if !status.is_success() {
        return Err(status_error(status, &body));
    }
    let parsed: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| AppwriteError::Unexpected(e.to_string()))?;
    parsed
        .get("rows")
        .and_then(|d| d.as_array())
        .cloned()
        .ok_or_else(|| AppwriteError::Unexpected("missing rows".to_string()))
}

pub async fn create_document(
    http: &reqwest::Client,
    session: &Session,
    collection: &str,
    data: serde_json::Value,
) -> Result<serde_json::Value, AppwriteError> {
    let project = project_id().ok_or(AppwriteError::NotConfigured)?;
    let url = format!(
        "{}/tablesdb/{}/tables/{}/rows",
        endpoint(),
        DATABASE_ID,
        collection
    );
    let permissions = vec![
        format!("read(\"user:{}\")", session.user_id),
        format!("update(\"user:{}\")", session.user_id),
        format!("delete(\"user:{}\")", session.user_id),
    ];
    let res = http
        .post(&url)
        .headers(headers(&project, Some(&session.secret)))
        .json(&serde_json::json!({
            "rowId": "unique()",
            "data": data,
            "permissions": permissions,
        }))
        .send()
        .await?;
    let status = res.status();
    let body = res.text().await?;
    if !status.is_success() {
        return Err(status_error(status, &body));
    }
    serde_json::from_str(&body).map_err(|e| AppwriteError::Unexpected(e.to_string()))
}

// ---- Project / task shapes (mirror packages/domain, Appwrite raw form) ----

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    #[serde(rename = "$id")]
    pub id: String,
    #[serde(rename = "$createdAt")]
    pub created_at: String,
    #[serde(rename = "$updatedAt")]
    pub updated_at: String,
    #[serde(rename = "$permissions")]
    pub permissions: Vec<String>,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    #[serde(rename = "deletedAt")]
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    #[serde(rename = "$id")]
    pub id: String,
    #[serde(rename = "$createdAt")]
    pub created_at: String,
    #[serde(rename = "$updatedAt")]
    pub updated_at: String,
    #[serde(rename = "$permissions")]
    pub permissions: Vec<String>,
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    #[serde(rename = "completedAt")]
    pub completed_at: Option<String>,
    #[serde(rename = "deletedAt")]
    pub deleted_at: Option<String>,
}

fn parse_doc<T: for<'de> Deserialize<'de>>(value: serde_json::Value) -> Result<T, AppwriteError> {
    serde_json::from_value(value).map_err(|e| AppwriteError::Unexpected(e.to_string()))
}

/// Pushes queued time entries in order. Stops at the first failure so rows
/// keep their chronological order; failed entries stay queued with a bumped
/// attempt counter. Never fails the caller's user action — leftover entries
/// are reported via `pending_count` and retried on the next timer command.
pub async fn push_pending(
    http: &reqwest::Client,
    session: &Session,
    store: &mut crate::timer::TimerStore,
) {
    let mut done = 0;
    for entry in store.pending.iter_mut() {
        let data = serde_json::json!({
            "userId": session.user_id,
            "taskId": entry.task_id,
            "type": entry.kind,
            "startedAt": entry.started_at,
            "endedAt": entry.ended_at,
        });
        match create_document(http, session, COLLECTION_TIME_ENTRIES, data).await {
            Ok(_) => done += 1,
            Err(_) => {
                entry.attempts += 1;
                break;
            }
        }
    }
    store.pending.drain(..done);
}

pub async fn fetch_projects(
    http: &reqwest::Client,
    session: &Session,
) -> Result<Vec<Project>, AppwriteError> {
    let docs = list_documents(
        http,
        session,
        COLLECTION_PROJECTS,
        &[
            q_equal("userId", &session.user_id),
            q_is_null("deletedAt"),
            q_order_desc("$updatedAt"),
            q_limit(100),
        ],
    )
    .await?;
    docs.into_iter().map(parse_doc).collect()
}

pub async fn fetch_tasks(
    http: &reqwest::Client,
    session: &Session,
    project_id: Option<&str>,
) -> Result<Vec<Task>, AppwriteError> {
    let mut queries = vec![
        q_equal("userId", &session.user_id),
        q_is_null("deletedAt"),
        q_order_desc("$updatedAt"),
        q_limit(200),
    ];
    if let Some(pid) = project_id {
        queries.push(q_equal("projectId", pid));
    }
    let docs = list_documents(http, session, COLLECTION_TASKS, &queries).await?;
    docs.into_iter().map(parse_doc).collect()
}

pub async fn insert_task(
    http: &reqwest::Client,
    session: &Session,
    project_id: &str,
    title: &str,
) -> Result<Task, AppwriteError> {
    let title = title.trim();
    if title.is_empty() {
        return Err(AppwriteError::Unexpected("title is required".to_string()));
    }
    let doc = create_document(
        http,
        session,
        COLLECTION_TASKS,
        serde_json::json!({
            "userId": session.user_id,
            "projectId": project_id,
            "title": title,
            "description": serde_json::Value::Null,
            "status": "TODO",
            "priority": "MEDIUM",
            "dueDate": serde_json::Value::Null,
            "completedAt": serde_json::Value::Null,
            "deletedAt": serde_json::Value::Null,
        }),
    )
    .await?;
    parse_doc(doc)
}
