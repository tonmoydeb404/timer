//! Legacy timer state file (`timer-state.json`).
//!
//! Pre-realtime versions kept the running timer and an upload queue here.
//! The timer itself is now cloud-backed (Appwrite `time_entries` +
//! realtime) and this file is only drained once: closed segments the old
//! version never uploaded are surfaced to the frontend, which pushes them
//! to Appwrite and then clears them via `clear_legacy_pending`.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

const STATE_FILE: &str = "timer-state.json";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SegmentType {
    Work,
    Break,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingEntry {
    /// Local id for upload acknowledgement (frontend confirms by id).
    pub local_id: String,
    pub task_id: Option<String>,
    pub project_id: Option<String>,
    #[serde(rename = "type")]
    pub kind: SegmentType,
    pub started_at: String,
    pub ended_at: String,
    pub attempts: u32,
    /// If set, the live doc already exists in Appwrite (created at start) —
    /// the frontend should update it instead of creating a new one.
    #[serde(default)]
    pub remote_id: Option<String>,
}

// Retained for serde compatibility with files written by old versions
// (their `active` field is ignored — the cloud is the source of truth now).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Segment {
    #[serde(rename = "type")]
    pub kind: SegmentType,
    pub started_at_ms: i64,
    pub ended_at_ms: Option<i64>,
    #[serde(default)]
    pub remote_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveTimer {
    pub task_id: Option<String>,
    pub task_title: Option<String>,
    pub project_id: Option<String>,
    pub project_title: Option<String>,
    pub status: String,
    pub started_at_ms: i64,
    pub segments: Vec<Segment>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TimerStore {
    #[serde(default)]
    pub active: Option<ActiveTimer>,
    #[serde(default)]
    pub pending: Vec<PendingEntry>,
    #[serde(default)]
    pub next_id: u64,
}

// ---- State file ----

pub fn state_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(STATE_FILE)
}

pub fn load(app_data_dir: &Path) -> TimerStore {
    let path = state_path(app_data_dir);
    let text = std::fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&text).unwrap_or_default()
}

pub fn save(app_data_dir: &Path, store: &TimerStore) -> Result<(), String> {
    let path = state_path(app_data_dir);
    let text = serde_json::to_string_pretty(store).map_err(|e| e.to_string())?;
    // Atomic-ish: write temp file, then rename.
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, text).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

/// The old version's queued closed segments, if any. Read-only — the
/// frontend uploads them and then acks via `clear_legacy_pending`.
pub fn pending(app_data_dir: &Path) -> Vec<PendingEntry> {
    load(app_data_dir).pending
}

/// Removes uploaded entries from the legacy queue by their local ids.
pub fn clear_pending(app_data_dir: &Path, local_ids: &[String]) -> Result<(), String> {
    if local_ids.is_empty() {
        return Ok(());
    }
    let mut store = load(app_data_dir);
    let before = store.pending.len();
    store
        .pending
        .retain(|e| !local_ids.iter().any(|id| id == &e.local_id));
    if store.pending.len() == before {
        return Ok(());
    }
    save(app_data_dir, &store)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Unique temp dir per call — tests run in parallel within one process.
    fn temp_dir(tag: &str) -> PathBuf {
        static SEQ: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
        let n = SEQ.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        let dir = std::env::temp_dir().join(format!(
            "tymar-test-{}-{}-{n}",
            std::process::id(),
            tag
        ));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn sample_store() -> TimerStore {
        let store = TimerStore {
            active: Some(ActiveTimer {
                task_id: Some("task-1".into()),
                task_title: Some("Build dashboard".into()),
                project_id: None,
                project_title: None,
                status: "WORKING".into(),
                started_at_ms: 1_000,
                segments: vec![Segment {
                    kind: SegmentType::Work,
                    started_at_ms: 1_000,
                    ended_at_ms: None,
                    remote_id: Some("doc-1".into()),
                }],
            }),
            pending: vec![PendingEntry {
                local_id: "1000-1".into(),
                task_id: Some("task-1".into()),
                project_id: None,
                kind: SegmentType::Work,
                started_at: "2026-09-21T10:00:00Z".into(),
                ended_at: "2026-09-21T11:00:00Z".into(),
                attempts: 0,
                remote_id: Some("doc-2".into()),
            }],
            next_id: 1,
        };
        // Must round-trip exactly what old versions wrote (field names,
        // missing optional fields) without data loss.
        let json = serde_json::to_string(&store).unwrap();
        serde_json::from_str(&json).unwrap()
    }

    #[test]
    fn legacy_file_round_trips_with_active_ignored() {
        let dir = temp_dir("round-trip");
        let store = sample_store();
        save(&dir, &store).unwrap();
        let loaded = load(&dir);
        assert!(loaded.active.is_some());
        assert_eq!(loaded.pending.len(), 1);
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn pending_reads_and_clear_removes_only_acked() {
        let dir = temp_dir("pending");
        save(&dir, &sample_store()).unwrap();

        let queued = pending(&dir);
        assert_eq!(queued.len(), 1);
        assert_eq!(queued[0].local_id, "1000-1");

        clear_pending(&dir, &["other".to_string()]).unwrap();
        assert_eq!(pending(&dir).len(), 1);

        clear_pending(&dir, &["1000-1".to_string()]).unwrap();
        assert!(pending(&dir).is_empty());
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn missing_or_corrupt_file_is_empty_store() {
        let dir = temp_dir("corrupt");
        std::fs::write(state_path(&dir), "not json{").unwrap();
        assert!(pending(&dir).is_empty());
        std::fs::remove_dir_all(&dir).ok();
    }
}
