use crate::services::{ProviderStatus, NotificationService, NotificationThreshold, ClaudeUsageSnapshot};
use crate::storage::keychain::KeychainManager;
use crate::auth::oauth::OAuthManager;
use crate::api::claude_oauth::ClaudeOAuthClient;
use tauri::State;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct AppState {
    pub keychain: KeychainManager,
    pub anthropic_status: Arc<RwLock<ProviderStatus>>,
    pub openai_status: Arc<RwLock<ProviderStatus>>,
    pub notification_service: Arc<RwLock<NotificationService>>,
}

#[tauri::command]
pub async fn get_provider_status(
    provider: String,
    state: State<'_, AppState>,
) -> Result<ProviderStatus, String> {
    match provider.as_str() {
        "anthropic" => Ok(state.anthropic_status.read().await.clone()),
        "openai" => Ok(state.openai_status.read().await.clone()),
        _ => Err("Unknown provider".to_string()),
    }
}

#[tauri::command]
pub async fn save_api_key(
    provider: String,
    api_key: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.keychain
        .store_api_key(&provider, &api_key)
        .map_err(|e| e.to_string())?;
    
    if provider == "openai" {
        use crate::api::openai::OpenAIClient;
        use crate::services::CodexUsageSnapshot;
        
        let client = OpenAIClient::new(api_key);
        
        match client.validate_key().await {
            Ok(true) => {
                match client.get_organization_usage(30).await {
                    Ok(usage) => {
                        let mut status = state.openai_status.write().await;
                        status.connected = true;
                        status.error = None;
                        status.codex_usage = Some(CodexUsageSnapshot {
                            input_tokens: usage.input_tokens,
                            output_tokens: usage.output_tokens,
                            total_requests: usage.total_requests,
                            total_cost_usd: usage.total_cost_usd,
                            period_days: 30,
                        });
                        status.last_updated = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs();
                    }
                    Err(e) => {
                        let mut status = state.openai_status.write().await;
                        status.connected = true;
                        status.error = Some(format!("Usage fetch error: {}", e));
                        status.last_updated = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs();
                    }
                }
            }
            Ok(false) => {
                let mut status = state.openai_status.write().await;
                status.connected = false;
                status.error = Some("Invalid API key".to_string());
            }
            Err(e) => {
                let mut status = state.openai_status.write().await;
                status.connected = false;
                status.error = Some(format!("Error: {}", e));
            }
        }
    }
    
    Ok(())
}

#[tauri::command]
pub async fn remove_api_key(
    provider: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.keychain
        .delete_api_key(&provider)
        .map_err(|e| e.to_string())?;
    
    if provider == "openai" {
        let mut status = state.openai_status.write().await;
        status.connected = false;
        status.codex_usage = None;
        status.error = None;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn save_threshold(
    threshold: NotificationThreshold,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut service = state.notification_service.write().await;
    service.add_threshold(threshold);
    Ok(())
}

#[tauri::command]
pub async fn start_oauth_flow(
    provider: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if provider != "anthropic" {
        return Err("OAuth only supported for Anthropic".to_string());
    }

    let should_start_oauth = if ClaudeOAuthClient::has_credentials() {
        match ClaudeOAuthClient::from_credentials_file() {
            Ok(client) => {
                match client.get_usage().await {
                    Ok(usage) => {
                        let mut status = state.anthropic_status.write().await;
                        status.connected = true;
                        status.error = None;
                        status.claude_usage = Some(ClaudeUsageSnapshot {
                            period_utilization: usage.five_hour
                                .as_ref()
                                .map(|u| u.utilization)
                                .unwrap_or(0.0),
                            period_resets_at: usage.five_hour
                                .as_ref()
                                .map(|u| u.resets_at.clone()),
                            weekly_utilization: usage.seven_day
                                .as_ref()
                                .map(|u| u.utilization),
                            weekly_resets_at: usage.seven_day
                                .as_ref()
                                .map(|u| u.resets_at.clone()),
                        });
                        return Ok(());
                    }
                    Err(_) => true,
                }
            }
            Err(_) => true,
        }
    } else {
        true
    };

    if !should_start_oauth {
        return Ok(());
    }

    let oauth = OAuthManager::new();
    let tokens = oauth.start_oauth_flow().await
        .map_err(|e| e.to_string())?;
    
    let creds_path = dirs::home_dir()
        .ok_or("Could not find home directory")?
        .join(".claude")
        .join(".credentials.json");
    
    std::fs::create_dir_all(creds_path.parent().unwrap())
        .map_err(|e| e.to_string())?;
    
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;
    
    let creds = serde_json::json!({
        "claudeAiOauth": {
            "accessToken": tokens.access_token,
            "refreshToken": tokens.refresh_token,
            "expiresAt": now_ms + (tokens.expires_in * 1000),
            "scopes": tokens.scope.unwrap_or_default().split(' ').collect::<Vec<_>>(),
        }
    });
    
    std::fs::write(&creds_path, serde_json::to_string_pretty(&creds).unwrap())
        .map_err(|e| e.to_string())?;
    
    let client = ClaudeOAuthClient::new(tokens.access_token);
    let usage = client.get_usage().await.map_err(|e| e.to_string())?;
    
    let mut status = state.anthropic_status.write().await;
    status.connected = true;
    status.error = None;
    status.claude_usage = Some(ClaudeUsageSnapshot {
        period_utilization: usage.five_hour
            .as_ref()
            .map(|u| u.utilization)
            .unwrap_or(0.0),
        period_resets_at: usage.five_hour
            .as_ref()
            .map(|u| u.resets_at.clone()),
        weekly_utilization: usage.seven_day
            .as_ref()
            .map(|u| u.utilization),
        weekly_resets_at: usage.seven_day
            .as_ref()
            .map(|u| u.resets_at.clone()),
    });
    
    Ok(())
}

#[tauri::command]
pub async fn check_oauth_credentials(provider: String) -> Result<bool, String> {
    if provider != "anthropic" {
        return Ok(false);
    }
    Ok(ClaudeOAuthClient::has_credentials())
}

#[tauri::command]
pub async fn update_tray_icon(
    app: tauri::AppHandle,
    weekly_remaining: f64,
    period_remaining: f64,
) -> Result<(), String> {
    use tauri::image::Image;
    
    let icon_data = crate::tray::generate_tray_icon(weekly_remaining, period_remaining);
    let icon = Image::new_owned(icon_data, 22, 22);
    
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_icon(Some(icon)).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn update_tray_menu(
    app: tauri::AppHandle,
    weekly_util: f64,
    period_util: f64,
    weekly_reset: Option<String>,
    period_reset: Option<String>,
) -> Result<(), String> {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
    
    let weekly_remaining = 100.0 - weekly_util;
    let period_remaining = 100.0 - period_util;
    
    let weekly_text = format!("Weekly: {:.0}% remaining", weekly_remaining);
    let period_text = format!("5-Hour: {:.0}% remaining", period_remaining);
    
    let weekly_reset_text = weekly_reset
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
        .map(|dt| {
            let now = chrono::Utc::now();
            let diff = dt.signed_duration_since(now);
            let days = diff.num_days();
            let hours = diff.num_hours() % 24;
            if days > 0 {
                format!("Resets in {}d {}h", days, hours)
            } else {
                format!("Resets in {}h", hours)
            }
        })
        .unwrap_or_default();
    
    let period_reset_text = period_reset
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
        .map(|dt| {
            let now = chrono::Utc::now();
            let diff = dt.signed_duration_since(now);
            let hours = diff.num_hours();
            let mins = diff.num_minutes() % 60;
            if hours > 0 {
                format!("Resets in {}h {}m", hours, mins)
            } else {
                format!("Resets in {}m", mins)
            }
        })
        .unwrap_or_default();
    
    let title_item = MenuItem::with_id(&app, "title", "━━ Claude Usage ━━", false, None::<&str>)
        .map_err(|e| e.to_string())?;
    let weekly_item = MenuItem::with_id(&app, "weekly", &weekly_text, false, None::<&str>)
        .map_err(|e| e.to_string())?;
    let weekly_reset_item = MenuItem::with_id(&app, "weekly_reset", &format!("    {}", weekly_reset_text), false, None::<&str>)
        .map_err(|e| e.to_string())?;
    let period_item = MenuItem::with_id(&app, "period", &period_text, false, None::<&str>)
        .map_err(|e| e.to_string())?;
    let period_reset_item = MenuItem::with_id(&app, "period_reset", &format!("    {}", period_reset_text), false, None::<&str>)
        .map_err(|e| e.to_string())?;
    let separator = PredefinedMenuItem::separator(&app)
        .map_err(|e| e.to_string())?;
    let quit_item = MenuItem::with_id(&app, "quit", "Quit Agent Mana", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    
    let menu = Menu::with_items(&app, &[
        &title_item,
        &weekly_item,
        &weekly_reset_item,
        &period_item,
        &period_reset_item,
        &separator,
        &quit_item,
    ]).map_err(|e| e.to_string())?;
    
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
