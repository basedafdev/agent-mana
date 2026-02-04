use crate::api::anthropic::RateLimitInfo;
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct ProviderStatus {
    pub provider: String,
    pub connected: bool,
    pub usage: Option<UsageSnapshot>,
    pub claude_usage: Option<ClaudeUsageSnapshot>,
    pub rate_limit: Option<RateLimitInfo>,
    pub error: Option<String>,
    pub last_updated: u64,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct UsageSnapshot {
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub total_tokens: u64,
    pub cost: Option<f64>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ClaudeUsageSnapshot {
    pub period_utilization: f64,
    pub period_resets_at: Option<String>,
    pub weekly_utilization: Option<f64>,
    pub weekly_resets_at: Option<String>,
}
