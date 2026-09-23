//! Dynamic system-tray menu: the primary timer controls live here.
//!
//! The menu rebuilds on every timer transition (from `mutate_timer`) and on
//! a periodic tick while a session is open, so the elapsed readout stays
//! fresh without opening the window.

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    AppHandle, Emitter, Manager,
};

use crate::{brand, state::AppState};

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

/// Rebuilds the tray menu (and tooltip) from the current timer state.
pub fn rebuild_menu(app: &AppHandle) {
    let state = app.state::<AppState>();
    let store = crate::timer::load(&state.app_data_dir);
    let view = crate::timer::view(&store, crate::timer::now_ms());

    let menu = match Menu::new(app) {
        Ok(m) => m,
        Err(_) => return,
    };

    match view.status {
        crate::timer::TimerStatus::Idle => {
            item!(
                menu,
                app,
                "status",
                &format!("{} — Idle", brand::APP_NAME),
                false
            );
            separator!(menu, app);
            item!(menu, app, "start", "Start Timer", true);
            separator!(menu, app);
        }
        crate::timer::TimerStatus::Working | crate::timer::TimerStatus::Break => {
            let title = view
                .task_title
                .clone()
                .or_else(|| view.project_title.clone())
                .unwrap_or_else(|| "Untitled session".into());
            let state_label = if view.status == crate::timer::TimerStatus::Break {
                "On break"
            } else {
                "Tracking"
            };
            item!(
                menu,
                app,
                "status",
                &format!("● {} — {}", title, format_elapsed(view.total_ms)),
                false
            );
            separator!(menu, app);
            if view.status == crate::timer::TimerStatus::Break {
                item!(menu, app, "break_resume", "Resume", true);
            } else {
                item!(menu, app, "break_resume", "Break", true);
            }
            item!(menu, app, "stop", "Stop", true);
            item!(menu, app, "switch", "Switch Task", true);
            separator!(menu, app);

            if let Some(tray) = app.tray_by_id("main_tray") {
                let _ = tray.set_tooltip(Some(format!(
                    "{state_label}: {title} ({})",
                    format_elapsed(view.total_ms)
                )));
            }
        }
    }

    item!(
        menu,
        app,
        "open",
        &format!("Open {}", brand::APP_NAME),
        true
    );
    item!(
        menu,
        app,
        "quit",
        &format!("Quit {}", brand::APP_NAME),
        true
    );

    if let Some(tray) = app.tray_by_id("main_tray") {
        let _ = tray.set_menu(Some(menu));
        if view.status == crate::timer::TimerStatus::Idle {
            let _ = tray.set_tooltip(Some(brand::APP_NAME));
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
        "break_resume" => {
            let app = app.clone();
            tauri::async_runtime::spawn(async move {
                let state = app.state::<AppState>();
                let store = crate::timer::load(&state.app_data_dir);
                let on_break = matches!(
                    store.active.as_ref().map(|a| a.status),
                    Some(crate::timer::TimerStatus::Break)
                );
                if on_break {
                    let _ = crate::commands::resume_timer(app.clone()).await;
                } else {
                    let _ = crate::commands::take_break(app.clone()).await;
                }
            });
        }
        "stop" => {
            let app = app.clone();
            tauri::async_runtime::spawn(async move {
                let _ = crate::commands::stop_timer(app.clone()).await;
            });
        }
        "switch" => {
            // The task picker lives in the Today screen: open the window and
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
