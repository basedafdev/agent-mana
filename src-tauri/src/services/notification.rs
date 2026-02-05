use crate::services::ProviderStatus;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use tauri_plugin_notification::NotificationExt;

#[derive(Clone, Serialize, Deserialize)]
pub struct NotificationThreshold {
    pub provider: String,
    pub token_limit: Option<u64>,
    pub cost_limit: Option<f64>,
    pub rate_limit_percentage: Option<u8>,
    pub period_utilization_threshold: Option<f64>,
    pub weekly_utilization_threshold: Option<f64>,
    pub enabled: bool,
}

pub struct NotificationService {
    thresholds: Vec<NotificationThreshold>,
    notified_keys: HashSet<String>,
}

impl NotificationService {
    pub fn new() -> Self {
        Self {
            thresholds: Vec::new(),
            notified_keys: HashSet::new(),
        }
    }

    pub fn add_threshold(&mut self, threshold: NotificationThreshold) {
        self.thresholds.retain(|t| t.provider != threshold.provider);
        self.thresholds.push(threshold);
    }

    pub fn reset_notifications(&mut self) {
        self.notified_keys.clear();
    }

    pub fn check_and_notify(&mut self, status: &ProviderStatus, app: &tauri::AppHandle) {
        let threshold = self
            .thresholds
            .iter()
            .find(|t| t.provider == status.provider)
            .cloned();

        if let Some(threshold) = threshold {
            if !threshold.enabled {
                return;
            }

            self.check_claude_usage(status, &threshold, app);
            self.check_legacy_usage(status, &threshold, app);
            self.check_rate_limit(status, &threshold, app);
        }
    }

    fn check_claude_usage(
        &mut self,
        status: &ProviderStatus,
        threshold: &NotificationThreshold,
        app: &tauri::AppHandle,
    ) {
        if let Some(claude_usage) = &status.claude_usage {
            if let Some(period_threshold) = threshold.period_utilization_threshold {
                if claude_usage.period_utilization >= period_threshold {
                    let key = format!("{}:period:{}", status.provider, period_threshold);
                    if !self.notified_keys.contains(&key) {
                        self.send_notification(
                            app,
                            "Usage Alert: 5-Hour Limit",
                            &format!(
                                "5-hour utilization at {:.0}% (threshold: {:.0}%)",
                                claude_usage.period_utilization, period_threshold
                            ),
                        );
                        self.notified_keys.insert(key);
                    }
                } else {
                    let key = format!("{}:period:{}", status.provider, period_threshold);
                    self.notified_keys.remove(&key);
                }
            }

            if let Some(weekly_threshold) = threshold.weekly_utilization_threshold {
                if let Some(weekly_util) = claude_usage.weekly_utilization {
                    if weekly_util >= weekly_threshold {
                        let key = format!("{}:weekly:{}", status.provider, weekly_threshold);
                        if !self.notified_keys.contains(&key) {
                            self.send_notification(
                                app,
                                "Usage Alert: Weekly Limit",
                                &format!(
                                    "Weekly utilization at {:.0}% (threshold: {:.0}%)",
                                    weekly_util, weekly_threshold
                                ),
                            );
                            self.notified_keys.insert(key);
                        }
                    } else {
                        let key = format!("{}:weekly:{}", status.provider, weekly_threshold);
                        self.notified_keys.remove(&key);
                    }
                }
            }
        }
    }

    fn check_legacy_usage(
        &self,
        status: &ProviderStatus,
        threshold: &NotificationThreshold,
        app: &tauri::AppHandle,
    ) {
        if let Some(usage) = &status.usage {
            if let Some(token_limit) = threshold.token_limit {
                if usage.total_tokens >= token_limit {
                    self.send_notification(
                        app,
                        &format!("{} Token Limit Reached", status.provider),
                        &format!(
                            "You've used {} tokens (limit: {})",
                            usage.total_tokens, token_limit
                        ),
                    );
                }
            }

            if let Some(cost_limit) = threshold.cost_limit {
                if let Some(cost) = usage.cost {
                    if cost >= cost_limit {
                        self.send_notification(
                            app,
                            &format!("{} Cost Limit Reached", status.provider),
                            &format!("You've spent ${:.2} (limit: ${:.2})", cost, cost_limit),
                        );
                    }
                }
            }
        }
    }

    fn check_rate_limit(
        &self,
        status: &ProviderStatus,
        threshold: &NotificationThreshold,
        app: &tauri::AppHandle,
    ) {
        if let Some(rate_limit) = &status.rate_limit {
            if let (Some(limit), Some(remaining), Some(pct_threshold)) = (
                rate_limit.limit,
                rate_limit.remaining,
                threshold.rate_limit_percentage,
            ) {
                let percentage = (remaining as f64 / limit as f64) * 100.0;
                if percentage < pct_threshold as f64 {
                    self.send_notification(
                        app,
                        &format!("{} Rate Limit Warning", status.provider),
                        &format!(
                            "Only {} of {} requests remaining ({:.1}%)",
                            remaining, limit, percentage
                        ),
                    );
                }
            }
        }
    }

    fn send_notification(&self, app: &tauri::AppHandle, title: &str, body: &str) {
        let _ = app.notification().builder().title(title).body(body).show();
    }
}
