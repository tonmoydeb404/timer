//! Dynamic system-tray menu: the primary timer controls live here.
//!
//! Rust owns no timer state anymore — the frontend (which talks to
//! Appwrite, including realtime) pushes a `TrayState` via `set_tray_state`
//! whenever the running timer changes and on a 30s cadence for the elapsed
//! readout. Menu clicks for timer controls are emitted back to the
//! frontend as `tymar://tray-action` events.

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    AppHandle, Emitter, Manager,
};

use crate::env;

/// Mirrored timer state pushed from the frontend.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct TrayState {
    pub running: bool,
    pub on_break: bool,
    pub title: Option<String>,
    pub elapsed_ms: i64,
}

fn format_elapsed(total_ms: i64) -> String {
    let total = (total_ms.max(0) / 1000) as u64;
    format!(
        "{:02}:{:02}:{:02}",
        total / 3600,
        (total % 3600) / 60,
        total % 60
    )
}

macro_rules! item {
    ($menu:expr, $app:expr, $id:expr, $title:expr, $enabled:expr) => {
        if let Ok(i) = MenuItem::with_id($app, $id, $title, $enabled, None::<&str>) {
            let _ = $menu.append(&i);
        }
    };
}

macro_rules! separator {
    ($menu:expr, $app:expr) => {
        if let Ok(s) = PredefinedMenuItem::separator($app) {
            let _ = $menu.append(&s);
        }
    };
}

/// Rebuilds the tray menu (and tooltip) from the state the frontend pushed.
pub fn rebuild_menu(app: &AppHandle) {
    let state = app.state::<crate::state::AppState>();
    let tray_state = state.tray.lock().ok().map(|g| g.clone()).unwrap_or_default();

    let menu = match Menu::new(app) {
        Ok(m) => m,
        Err(_) => return,
    };

    if !tray_state.running {
        item!(
            menu,
            app,
            "status",
            &format!("{} — Idle", env::display_name()),
            false
        );
        separator!(menu, app);
        item!(menu, app, "start", "Start Timer", true);
        separator!(menu, app);
    } else {
        let title = tray_state
            .title
            .clone()
            .unwrap_or_else(|| "Untitled session".into());
        let state_label = if tray_state.on_break {
            "On break"
        } else {
            "Tracking"
        };
        item!(
            menu,
            app,
            "status",
            &format!(
                "● {} — {}",
                title,
                format_elapsed(tray_state.elapsed_ms)
            ),
            false
        );
        separator!(menu, app);
        if tray_state.on_break {
            item!(menu, app, "resume", "Resume", true);
        } else {
            item!(menu, app, "break", "Break", true);
        }
        item!(menu, app, "stop", "Stop", true);
        item!(menu, app, "switch", "Switch Task", true);
        separator!(menu, app);

        if let Some(tray) = app.tray_by_id("main_tray") {
            let _ = tray.set_tooltip(Some(format!(
                "{state_label}: {title} ({})",
                format_elapsed(tray_state.elapsed_ms)
            )));
        }
    }

    item!(
        menu,
        app,
        "open",
        &format!("Open {}", env::display_name()),
        true
    );
    item!(
        menu,
        app,
        "quit",
        &format!("Quit {}", env::display_name()),
        true
    );

    if let Some(tray) = app.tray_by_id("main_tray") {
        let _ = tray.set_menu(Some(menu));
        if !tray_state.running {
            let _ = tray.set_tooltip(Some(env::display_name()));
        }
    }
}

pub fn handle_menu_event(app: &AppHandle, id: &str) {
    match id {
        "open" => {
            crate::show_window(app);
        }
        "quit" => {
            app.exit(0);
        }
        // Timer controls are performed by the frontend (the only place with
        // an Appwrite session); emit the intent and let it act.
        "break" | "resume" | "stop" => {
            let _ = app.emit("tymar://tray-action", id.to_string());
        }
        "switch" => {
            // The task picker lives in the Home screen: open the window and
            // ask the frontend to show it.
            crate::show_window(app);
            let _ = app.emit("tymar://open-switcher", ());
        }
        "start" => {
            crate::show_window(app);
            let _ = app.emit("tymar://open-switcher", ());
        }
        _ => {}
    }
}
