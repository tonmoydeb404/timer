use std::fs;
use std::process::Command;

use tauri::Manager;
use tauri_plugin_deep_link::DeepLinkExt;

pub fn register_at_startup(app: &mut tauri::App) {
    if cfg!(debug_assertions) {
        if let Err(error) = register_dev_handler(app) {
            eprintln!("dev deep-link registration failed: {error}");
        }
        return;
    }

    if app.handle().env().appimage.is_some() || !official_desktop_entry_exists(app) {
        if let Err(error) = app.deep_link().register_all() {
            eprintln!("deep-link registration failed: {error}");
        }
        return;
    }

    if let Err(error) = remove_legacy_runtime_handler(app) {
        eprintln!("deep-link cleanup failed: {error}");
    }
}

fn official_desktop_entry_exists(app: &mut tauri::App) -> bool {
    let Some(product_name) = app.config().product_name.clone() else {
        return false;
    };
    let file_name = format!("{product_name}.desktop");
    if std::path::PathBuf::from("/usr/share/applications")
        .join(&file_name)
        .exists()
    {
        return true;
    }
    app.path()
        .data_dir()
        .map(|data_dir| {
            data_dir
                .join("applications")
                .join(&file_name)
                .exists()
        })
        .unwrap_or(false)
}

fn register_dev_handler(app: &mut tauri::App) -> Result<(), String> {
    let scheme = crate::env::deep_link_scheme();
    let executable = tauri::utils::platform::current_exe()
        .map_err(|error| format!("failed to resolve current executable: {error}"))?;
    let file_name = format!("{scheme}-handler.desktop");
    let applications = app
        .path()
        .data_dir()
        .map_err(|error| format!("failed to resolve data directory: {error}"))?
        .join("applications");
    fs::create_dir_all(&applications)
        .map_err(|error| format!("failed to create applications directory: {error}"))?;

    let name = app
        .config()
        .product_name
        .clone()
        .unwrap_or_else(|| file_name.clone());
    let contents = format!(
        "[Desktop Entry]\nType=Application\nName={name}\nExec=\"{}\" %u\nTerminal=false\nNoDisplay=true\nMimeType=x-scheme-handler/{scheme}\n",
        executable.to_string_lossy()
    );
    fs::write(applications.join(&file_name), contents)
        .map_err(|error| format!("failed to write desktop entry: {error}"))?;

    let status = Command::new("update-desktop-database")
        .arg(&applications)
        .status()
        .map_err(|error| format!("failed to update desktop database: {error}"))?;
    if !status.success() {
        return Err(format!("update-desktop-database failed: {status}"));
    }

    let status = Command::new("xdg-mime")
        .args([
            "default",
            &file_name,
            &format!("x-scheme-handler/{scheme}"),
        ])
        .status()
        .map_err(|error| format!("failed to set default handler: {error}"))?;
    if !status.success() {
        return Err(format!("xdg-mime failed: {status}"));
    }

    Ok(())
}

fn remove_legacy_runtime_handler(app: &mut tauri::App) -> Result<(), String> {
    let applications = app
        .path()
        .data_dir()
        .map_err(|error| format!("failed to resolve data directory: {error}"))?
        .join("applications");
    let executable = tauri::utils::platform::current_exe()
        .map_err(|error| format!("failed to resolve current executable: {error}"))?;
    let legacy_name = format!(
        "{}-handler.desktop",
        executable
            .file_name()
            .map(|name| name.to_string_lossy())
            .unwrap_or_default()
    );
    let legacy = applications.join(&legacy_name);
    let contents = match fs::read_to_string(&legacy) {
        Ok(contents) => contents,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => {
            return Err(format!("failed to read legacy desktop entry: {error}"));
        }
    };

    let schemes = [
        crate::env::deep_link_scheme(),
        format!("{}-dev", crate::brand::SLUG),
    ];
    for scheme in schemes {
        if contents.contains(&format!("x-scheme-handler/{scheme}")) {
            app.deep_link()
                .unregister(&scheme)
                .map_err(|error| format!("failed to unregister {scheme}: {error}"))?;
        }
    }
    Ok(())
}
