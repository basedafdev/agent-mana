use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio::time::interval;
use tauri::AppHandle;
use tauri::image::Image;

use crate::api::claude_oauth::ClaudeOAuthClient;
use crate::api::openai::OpenAIClient;
use crate::storage::keychain::KeychainManager;
use super::{ProviderStatus, ClaudeUsageSnapshot, CodexUsageSnapshot, NotificationService};
use crate::tray;

pub struct PollingService {
    anthropic_status: Arc<RwLock<ProviderStatus>>,
    openai_status: Arc<RwLock<ProviderStatus>>,
    notification_service: Arc<RwLock<NotificationService>>,
    keychain: KeychainManager,
    poll_interval: Duration,
    app_handle: AppHandle,
}

impl PollingService {
    pub fn new(
        app_handle: AppHandle,
        anthropic_status: Arc<RwLock<ProviderStatus>>,
        openai_status: Arc<RwLock<ProviderStatus>>,
        notification_service: Arc<RwLock<NotificationService>>,
        poll_interval_secs: u64,
    ) -> Self {
        Self {
            anthropic_status,
            openai_status,
            notification_service,
            keychain: KeychainManager::new(),
            poll_interval: Duration::from_secs(poll_interval_secs),
            app_handle,
        }
    }

    pub async fn start(self) {
        let anthropic_status = self.anthropic_status;
        let openai_status = self.openai_status;
        let notification_service = self.notification_service;
        let keychain = self.keychain;
        let poll_interval = self.poll_interval;
        let app_handle = self.app_handle;

        tokio::spawn(async move {
            let mut ticker = interval(poll_interval);
            
            loop {
                ticker.tick().await;
                
                Self::poll_anthropic(&anthropic_status, &openai_status, &notification_service, &app_handle).await;
                Self::poll_openai(&openai_status, &keychain).await;
            }
        });
    }

    async fn poll_anthropic(
        anthropic_status: &Arc<RwLock<ProviderStatus>>,
        openai_status: &Arc<RwLock<ProviderStatus>>,
        notification_service: &Arc<RwLock<NotificationService>>,
        app_handle: &AppHandle,
    ) {
        let codex_connected = openai_status.read().await.connected;
        
        if !ClaudeOAuthClient::has_credentials() {
            Self::handle_no_credentials(anthropic_status, codex_connected, app_handle).await;
            return;
        }

        match ClaudeOAuthClient::from_credentials_file_with_refresh().await {
            Ok(client) => {
                Self::fetch_and_update_usage(client, anthropic_status, codex_connected, notification_service, app_handle).await;
            }
            Err(e) => {
                Self::handle_oauth_error(e, anthropic_status, codex_connected, app_handle).await;
            }
        }
    }

    async fn fetch_and_update_usage(
        client: ClaudeOAuthClient,
        anthropic_status: &Arc<RwLock<ProviderStatus>>,
        codex_connected: bool,
        notification_service: &Arc<RwLock<NotificationService>>,
        app_handle: &AppHandle,
    ) {
        match client.get_usage().await {
            Ok(usage) => {
                let period_util = usage.five_hour.as_ref().map(|u| u.utilization).unwrap_or(0.0);
                let weekly_util = usage.seven_day.as_ref().map(|u| u.utilization);

                {
                    let mut status = anthropic_status.write().await;
                    status.connected = true;
                    status.error = None;
                    status.claude_usage = Some(ClaudeUsageSnapshot {
                        period_utilization: period_util,
                        period_resets_at: usage.five_hour.as_ref().map(|u| u.resets_at.clone()),
                        weekly_utilization: weekly_util,
                        weekly_resets_at: usage.seven_day.as_ref().map(|u| u.resets_at.clone()),
                    });
                    status.last_updated = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs();
                }

                Self::update_tray_connected(weekly_util.unwrap_or(0.0), period_util, codex_connected, app_handle);

                let status = anthropic_status.read().await;
                let mut notifier = notification_service.write().await;
                notifier.check_and_notify(&status, app_handle);
            }
            Err(e) => {
                let mut status = anthropic_status.write().await;
                status.error = Some(format!("Usage fetch error: {}", e));
            }
        }
    }

    async fn handle_oauth_error(
        e: impl std::fmt::Display,
        anthropic_status: &Arc<RwLock<ProviderStatus>>,
        codex_connected: bool,
        app_handle: &AppHandle,
    ) {
        let error_str = e.to_string();
        let error_message = if error_str.contains("TOKEN_EXPIRED_NEEDS_REAUTH") {
            "TOKEN_EXPIRED_NEEDS_REAUTH".to_string()
        } else {
            format!("OAuth error: {}", error_str)
        };
        
        {
            let mut status = anthropic_status.write().await;
            status.connected = false;
            status.error = Some(error_message);
        }
        Self::update_tray_disconnected(codex_connected, app_handle);
    }

    async fn handle_no_credentials(
        anthropic_status: &Arc<RwLock<ProviderStatus>>,
        codex_connected: bool,
        app_handle: &AppHandle,
    ) {
        let mut status = anthropic_status.write().await;
        if status.connected {
            status.connected = false;
            status.claude_usage = None;
            drop(status);
            Self::update_tray_disconnected(codex_connected, app_handle);
        }
    }

    fn update_tray_connected(weekly_util: f64, period_util: f64, codex_connected: bool, app_handle: &AppHandle) {
        let weekly_remaining = 100.0 - weekly_util;
        let period_remaining = 100.0 - period_util;
        let icon_data = tray::generate_tray_icon_with_codex(weekly_remaining, period_remaining, codex_connected);
        let icon = Image::new_owned(icon_data, 22, 22);
        if let Some(tray) = app_handle.tray_by_id("main") {
            let _ = tray.set_icon(Some(icon));
        }
    }

    fn update_tray_disconnected(codex_connected: bool, app_handle: &AppHandle) {
        let icon_data = if codex_connected {
            tray::generate_codex_only_icon()
        } else {
            tray::generate_disconnected_icon()
        };
        let icon = Image::new_owned(icon_data, 22, 22);
        if let Some(tray) = app_handle.tray_by_id("main") {
            let _ = tray.set_icon(Some(icon));
        }
    }

    async fn poll_openai(
        openai_status: &Arc<RwLock<ProviderStatus>>,
        keychain: &KeychainManager,
    ) {
        if let Ok(Some(api_key)) = keychain.get_api_key("openai") {
            let client = OpenAIClient::new(api_key);
            
            match client.validate_key().await {
                Ok(true) => {
                    match client.get_organization_usage(30).await {
                        Ok(usage) => {
                            let mut status = openai_status.write().await;
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
                            let mut status = openai_status.write().await;
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
                    let mut status = openai_status.write().await;
                    status.connected = false;
                    status.error = Some("Invalid API key".to_string());
                }
                Err(e) => {
                    let mut status = openai_status.write().await;
                    status.connected = false;
                    status.error = Some(format!("Error: {}", e));
                }
            }
        }
    }
}
