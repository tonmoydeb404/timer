//! Live timer state machine.
//!
//! The desktop owns the live timer: elapsed time is always derived from
//! stored timestamps, never from ticking counters — so restarts, sleep and
//! throttled webviews lose nothing. Completed segments are written to
//! Appwrite as `time_entries`; failures land in a pending queue inside the
//! same state file and are retried later.

use std::path::{Path, PathBuf};

use chrono::{DateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};

const STATE_FILE: &str = "timer-state.json";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TimerStatus {
    Idle,
    Working,
    Break,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SegmentType {
    Work,
    Break,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Segment {
    #[serde(rename = "type")]
    pub kind: SegmentType,
    pub started_at_ms: i64,
    pub ended_at_ms: Option<i64>,
}

impl Segment {
    fn duration_ms(&self, now_ms: i64) -> i64 {
        self.ended_at_ms
            .unwrap_or(now_ms)
            .saturating_sub(self.started_at_ms)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveTimer {
    /// None when tracking without a task (project-only or fully unassigned).
    pub task_id: Option<String>,
    pub task_title: Option<String>,
    /// None when tracking without a project.
    pub project_id: Option<String>,
    pub project_title: Option<String>,
    pub status: TimerStatus,
    pub started_at_ms: i64,
    pub segments: Vec<Segment>,
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
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TimerStore {
    pub active: Option<ActiveTimer>,
    #[serde(default)]
    pub pending: Vec<PendingEntry>,
    #[serde(default)]
    pub next_id: u64,
}

// ---- Wall clock ----

pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn to_iso(ms: i64) -> String {
    DateTime::<Utc>::from_timestamp_millis(ms)
        .map(|dt| dt.to_rfc3339_opts(SecondsFormat::Millis, true))
        .unwrap_or_else(|| Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true))
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

// ---- Transitions (pure over the store; `at_ms` injectable for tests) ----

#[derive(Debug)]
pub enum TransitionError {
    AlreadyRunning,
    NotRunning,
    NotOnBreak,
    AlreadyOnBreak,
}

impl std::fmt::Display for TransitionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let msg = match self {
            TransitionError::AlreadyRunning => "a timer is already running",
            TransitionError::NotRunning => "no timer is running",
            TransitionError::NotOnBreak => "timer is not on a break",
            TransitionError::AlreadyOnBreak => "timer is already on a break",
        };
        write!(f, "unexpected: {msg}")
    }
}

fn close_open_segment(active: &mut ActiveTimer, at_ms: i64) {
    if let Some(open) = active
        .segments
        .iter_mut()
        .rev()
        .find(|s| s.ended_at_ms.is_none())
    {
        open.ended_at_ms = Some(at_ms.max(open.started_at_ms));
    }
}

pub fn start(
    store: &mut TimerStore,
    task_id: Option<&str>,
    task_title: Option<&str>,
    project_id: Option<&str>,
    project_title: Option<&str>,
    at_ms: i64,
) -> Result<(), TransitionError> {
    if store.active.is_some() {
        return Err(TransitionError::AlreadyRunning);
    }
    store.active = Some(ActiveTimer {
        task_id: task_id.map(str::to_string),
        task_title: task_title.map(str::to_string),
        project_id: project_id.map(str::to_string),
        project_title: project_title.map(str::to_string),
        status: TimerStatus::Working,
        started_at_ms: at_ms,
        segments: vec![Segment {
            kind: SegmentType::Work,
            started_at_ms: at_ms,
            ended_at_ms: None,
        }],
    });
    Ok(())
}

pub fn take_break(store: &mut TimerStore, at_ms: i64) -> Result<(), TransitionError> {
    let active = store.active.as_mut().ok_or(TransitionError::NotRunning)?;
    if active.status == TimerStatus::Break {
        return Err(TransitionError::AlreadyOnBreak);
    }
    close_open_segment(active, at_ms);
    active.status = TimerStatus::Break;
    active.segments.push(Segment {
        kind: SegmentType::Break,
        started_at_ms: at_ms,
        ended_at_ms: None,
    });
    Ok(())
}

pub fn resume(store: &mut TimerStore, at_ms: i64) -> Result<(), TransitionError> {
    let active = store.active.as_mut().ok_or(TransitionError::NotRunning)?;
    if active.status != TimerStatus::Break {
        return Err(TransitionError::NotOnBreak);
    }
    close_open_segment(active, at_ms);
    active.status = TimerStatus::Working;
    active.segments.push(Segment {
        kind: SegmentType::Work,
        started_at_ms: at_ms,
        ended_at_ms: None,
    });
    Ok(())
}

/// Stops the timer, returning the finished segments as pending entries.
pub fn stop(store: &mut TimerStore, at_ms: i64) -> Result<Vec<PendingEntry>, TransitionError> {
    let mut active = store.active.take().ok_or(TransitionError::NotRunning)?;
    close_open_segment(&mut active, at_ms);
    Ok(segments_to_entries(store, &active))
}

/// Switch task: closes the current timer into entries and starts a fresh
/// one for the new task/project. Single user action, no manual stop needed.
pub fn switch_task(
    store: &mut TimerStore,
    task_id: Option<&str>,
    task_title: Option<&str>,
    project_id: Option<&str>,
    project_title: Option<&str>,
    at_ms: i64,
) -> Result<Vec<PendingEntry>, TransitionError> {
    let entries = stop(store, at_ms)?;
    start(store, task_id, task_title, project_id, project_title, at_ms)
        .map_err(|_| TransitionError::NotRunning)?;
    Ok(entries)
}

fn segments_to_entries(store: &mut TimerStore, active: &ActiveTimer) -> Vec<PendingEntry> {
    active
        .segments
        .iter()
        .filter_map(|s| {
            let ended = s.ended_at_ms?;
            if ended <= s.started_at_ms {
                return None;
            }
            store.next_id += 1;
            Some(PendingEntry {
                local_id: format!("{}-{}", s.started_at_ms, store.next_id),
                task_id: active.task_id.clone(),
                project_id: active.project_id.clone(),
                kind: s.kind,
                started_at: to_iso(s.started_at_ms),
                ended_at: to_iso(ended),
                attempts: 0,
            })
        })
        .collect()
}

// ---- Derived view (what the frontend renders) ----

#[derive(Debug, Clone, Serialize)]
pub struct SegmentView {
    #[serde(rename = "type")]
    pub kind: SegmentType,
    pub started_at_ms: i64,
    pub ended_at_ms: Option<i64>,
    pub duration_ms: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct TimerView {
    pub status: TimerStatus,
    pub task_id: Option<String>,
    pub task_title: Option<String>,
    pub project_id: Option<String>,
    pub project_title: Option<String>,
    pub started_at_ms: Option<i64>,
    pub total_ms: i64,
    pub work_ms: i64,
    pub break_ms: i64,
    pub segments: Vec<SegmentView>,
    pub pending_count: usize,
    /// Closed segments waiting for upload. The frontend uploads them via
    /// the Appwrite SDK and confirms with `ack_entries`.
    pub pending: Vec<PendingEntry>,
}

pub fn view(store: &TimerStore, at_ms: i64) -> TimerView {
    let Some(active) = &store.active else {
        return TimerView {
            status: TimerStatus::Idle,
            task_id: None,
            task_title: None,
            project_id: None,
            project_title: None,
            started_at_ms: None,
            total_ms: 0,
            work_ms: 0,
            break_ms: 0,
            segments: vec![],
            pending_count: store.pending.len(),
            pending: store.pending.clone(),
        };
    };

    let segments: Vec<SegmentView> = active
        .segments
        .iter()
        .map(|s| SegmentView {
            kind: s.kind,
            started_at_ms: s.started_at_ms,
            ended_at_ms: s.ended_at_ms,
            duration_ms: s.duration_ms(at_ms),
        })
        .collect();
    let work_ms: i64 = segments
        .iter()
        .filter(|s| s.kind == SegmentType::Work)
        .map(|s| s.duration_ms)
        .sum();
    let break_ms: i64 = segments
        .iter()
        .filter(|s| s.kind == SegmentType::Break)
        .map(|s| s.duration_ms)
        .sum();

    TimerView {
        status: active.status,
        task_id: active.task_id.clone(),
        task_title: active.task_title.clone(),
        project_id: active.project_id.clone(),
        project_title: active.project_title.clone(),
        started_at_ms: Some(active.started_at_ms),
        total_ms: at_ms.saturating_sub(active.started_at_ms),
        work_ms,
        break_ms,
        segments,
        pending_count: store.pending.len(),
        pending: store.pending.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn running_store() -> TimerStore {
        let mut store = TimerStore::default();
        start(
            &mut store,
            Some("task-1"),
            Some("Build dashboard"),
            None,
            None,
            1_000,
        )
        .unwrap();
        store
    }

    #[test]
    fn start_sets_working_with_one_open_segment() {
        let store = running_store();
        let active = store.active.as_ref().unwrap();
        assert_eq!(active.status, TimerStatus::Working);
        assert_eq!(active.segments.len(), 1);
        assert_eq!(active.segments[0].ended_at_ms, None);
    }

    #[test]
    fn start_twice_is_rejected() {
        let mut store = running_store();
        assert!(start(&mut store, Some("task-2"), Some("Other"), None, None, 2_000).is_err());
        assert_eq!(store.active.as_ref().unwrap().task_id.as_deref(), Some("task-1"));
    }

    #[test]
    fn start_without_task_or_project_is_allowed() {
        let mut store = TimerStore::default();
        start(&mut store, None, None, None, None, 1_000).unwrap();
        let active = store.active.as_ref().unwrap();
        assert!(active.task_id.is_none());
        assert!(active.project_id.is_none());
    }

    #[test]
    fn break_resume_cycle_closes_segments() {
        let mut store = running_store();
        take_break(&mut store, 2_000).unwrap();
        assert!(take_break(&mut store, 2_100).is_err());
        resume(&mut store, 3_000).unwrap();
        assert!(resume(&mut store, 3_100).is_err());

        let active = store.active.as_ref().unwrap();
        assert_eq!(active.status, TimerStatus::Working);
        assert_eq!(active.segments.len(), 3);
        assert_eq!(active.segments[0].ended_at_ms, Some(2_000));
        assert_eq!(active.segments[1].ended_at_ms, Some(3_000));
        assert_eq!(active.segments[2].ended_at_ms, None);
    }

    #[test]
    fn stop_returns_one_entry_per_nonempty_segment() {
        let mut store = running_store();
        take_break(&mut store, 2_000).unwrap();
        resume(&mut store, 3_000).unwrap();
        let entries = stop(&mut store, 4_000).unwrap();
        assert!(store.active.is_none());
        assert_eq!(entries.len(), 3);
        assert_eq!(entries[0].kind, SegmentType::Work);
        assert_eq!(entries[1].kind, SegmentType::Break);
        assert_eq!(entries[2].kind, SegmentType::Work);
    }

    #[test]
    fn stop_without_timer_is_rejected() {
        let mut store = TimerStore::default();
        assert!(stop(&mut store, 1_000).is_err());
        assert!(take_break(&mut store, 1_000).is_err());
        assert!(resume(&mut store, 1_000).is_err());
    }

    #[test]
    fn switch_closes_old_and_starts_new() {
        let mut store = running_store();
        let entries = switch_task(&mut store, Some("task-2"), Some("Other"), None, None, 5_000).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].task_id.as_deref(), Some("task-1"));
        let active = store.active.as_ref().unwrap();
        assert_eq!(active.task_id.as_deref(), Some("task-2"));
        assert_eq!(active.started_at_ms, 5_000);
        assert_eq!(active.status, TimerStatus::Working);
    }

    #[test]
    fn view_sums_work_and_break() {
        let mut store = running_store();
        take_break(&mut store, 2_000).unwrap();
        let v = view(&store, 5_000);
        assert_eq!(v.status, TimerStatus::Break);
        assert_eq!(v.work_ms, 1_000);
        assert_eq!(v.break_ms, 3_000);
        assert_eq!(v.total_ms, 4_000);
    }

    #[test]
    fn idle_view_is_zeroed() {
        let v = view(&TimerStore::default(), 9_999);
        assert_eq!(v.status, TimerStatus::Idle);
        assert_eq!(v.total_ms, 0);
        assert!(v.task_id.is_none());
    }

    #[test]
    fn restart_recovery_is_timestamp_based() {
        // Simulate: start at 10:00, app closes, reopens at 11:15.
        let mut store = TimerStore::default();
        start(&mut store, Some("task-1"), Some("T"), None, None, 10 * 3_600_000).unwrap();
        let reloaded: TimerStore =
            serde_json::from_str(&serde_json::to_string(&store).unwrap()).unwrap();
        let v = view(&reloaded, 11 * 3_600_000 + 15 * 60_000);
        assert_eq!(v.total_ms, 4_500_000);
        assert_eq!(v.status, TimerStatus::Working);
    }

    #[test]
    fn midnight_crossing_stays_one_absolute_segment() {
        // Sep 21 23:00 UTC -> Sep 22 02:00 UTC stays a single segment;
        // day-splitting happens in analytics (packages/domain).
        let mut store = TimerStore::default();
        let start_ms = 1_790_031_600_000; // 2026-09-21T23:00:00Z
        start(&mut store, Some("task-1"), Some("T"), None, None, start_ms).unwrap();
        let entries = stop(&mut store, start_ms + 3 * 3_600_000).unwrap();
        assert_eq!(entries.len(), 1);
        assert!(entries[0].started_at.starts_with("2026-09-21T23:00"));
        assert!(entries[0].ended_at.starts_with("2026-09-22T02:00"));
    }
}
