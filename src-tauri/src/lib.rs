pub mod api;
pub mod auth;
pub mod storage;
pub mod services;
pub mod commands;
pub mod tray;

use std::sync::Arc;
use tokio::sync::RwLock;
use commands::AppState;
use services::polling::PollingService;
use services::{ProviderStatus, NotificationService};
use storage::keychain::KeychainManager;
use tauri::tray::TrayIconBuilder;
use tauri::menu::{Menu, MenuItem};
use tauri::image::Image;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let keychain = KeychainManager::new();
    
    let anthropic_status = Arc::new(RwLock::new(ProviderStatus {
        provider: "anthropic".to_string(),
        connected: false,
        usage: None,
        claude_usage: None,
        codex_usage: None,
        rate_limit: None,
        error: None,
        last_updated: 0,
    }));
    
    let openai_status = Arc::new(RwLock::new(ProviderStatus {
        provider: "openai".to_string(),
        connected: false,
        usage: None,
        claude_usage: None,
        codex_usage: None,
        rate_limit: None,
        error: None,
        last_updated: 0,
    }));
    
    let notification_service = Arc::new(RwLock::new(NotificationService::new()));
    
    let app_state = AppState {
        keychain,
        anthropic_status: Arc::clone(&anthropic_status),
        openai_status: Arc::clone(&openai_status),
        notification_service: Arc::clone(&notification_service),
    };
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::get_provider_status,
            commands::save_api_key,
            commands::remove_api_key,
            commands::save_threshold,
            commands::start_oauth_flow,
            commands::check_oauth_credentials,
            commands::update_tray_icon,
            commands::update_tray_menu,
        ])
        .setup(move |app| {
            let icon_data = tray::generate_disconnected_icon();
            let icon = Image::new_owned(icon_data, 22, 22);
            
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_item])?;
            
            let _tray = TrayIconBuilder::with_id("main")
                .icon(icon)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    if event.id.as_ref() == "quit" {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;
            
            let polling_service = PollingService::new(
                app.handle().clone(),
                Arc::clone(&anthropic_status),
                Arc::clone(&openai_status),
                Arc::clone(&notification_service),
                60,
            );
            
            tauri::async_runtime::spawn(async move {
                polling_service.start().await;
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
