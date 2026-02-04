use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

const OAUTH_API_BASE: &str = "https://api.anthropic.com/api/oauth";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeCredentials {
    #[serde(rename = "claudeAiOauth")]
    pub claude_ai_oauth: Option<OAuthTokens>,
    #[serde(rename = "organizationUuid")]
    pub organization_uuid: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthTokens {
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "refreshToken")]
    pub refresh_token: String,
    #[serde(rename = "expiresAt")]
    pub expires_at: u64,
    pub scopes: Vec<String>,
    #[serde(rename = "subscriptionType")]
    pub subscription_type: Option<String>,
    #[serde(rename = "rateLimitTier")]
    pub rate_limit_tier: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageResponse {
    pub five_hour: Option<UsagePeriod>,
    pub seven_day: Option<UsagePeriod>,
    pub seven_day_oauth_apps: Option<UsagePeriod>,
    pub seven_day_opus: Option<UsagePeriod>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsagePeriod {
    pub utilization: f64,
    pub resets_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileResponse {
    pub account: AccountInfo,
    pub organization: Option<OrganizationInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountInfo {
    pub uuid: String,
    pub full_name: Option<String>,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub has_claude_max: Option<bool>,
    pub has_claude_pro: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationInfo {
    pub uuid: String,
    pub name: Option<String>,
    pub organization_type: Option<String>,
    pub billing_type: Option<String>,
    pub rate_limit_tier: Option<String>,
}

#[derive(Debug)]
pub enum ClaudeOAuthError {
    CredentialsNotFound,
    CredentialsExpired,
    InvalidCredentials(String),
    RequestError(reqwest::Error),
    ParseError(String),
    ApiError { status: u16, message: String },
}

impl std::fmt::Display for ClaudeOAuthError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::CredentialsNotFound => write!(f, "Claude credentials not found"),
            Self::CredentialsExpired => write!(f, "Claude credentials expired"),
            Self::InvalidCredentials(msg) => write!(f, "Invalid credentials: {}", msg),
            Self::RequestError(e) => write!(f, "Request error: {}", e),
            Self::ParseError(msg) => write!(f, "Parse error: {}", msg),
            Self::ApiError { status, message } => write!(f, "API error ({}): {}", status, message),
        }
    }
}

impl std::error::Error for ClaudeOAuthError {}

impl From<reqwest::Error> for ClaudeOAuthError {
    fn from(err: reqwest::Error) -> Self {
        Self::RequestError(err)
    }
}

pub type Result<T> = std::result::Result<T, ClaudeOAuthError>;

pub struct ClaudeOAuthClient {
    access_token: String,
    client: reqwest::Client,
}

impl ClaudeOAuthClient {
    pub fn from_credentials_file() -> Result<Self> {
        let creds_path = Self::credentials_path()?;
        let contents = std::fs::read_to_string(&creds_path)
            .map_err(|_| ClaudeOAuthError::CredentialsNotFound)?;
        
        let creds: ClaudeCredentials = serde_json::from_str(&contents)
            .map_err(|e| ClaudeOAuthError::ParseError(e.to_string()))?;
        
        let oauth = creds.claude_ai_oauth
            .ok_or(ClaudeOAuthError::CredentialsNotFound)?;
        
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        if oauth.expires_at < now {
            return Err(ClaudeOAuthError::CredentialsExpired);
        }
        
        Ok(Self {
            access_token: oauth.access_token,
            client: reqwest::Client::new(),
        })
    }

    pub fn new(access_token: String) -> Self {
        Self {
            access_token,
            client: reqwest::Client::new(),
        }
    }

    fn credentials_path() -> Result<PathBuf> {
        let home = dirs::home_dir()
            .ok_or(ClaudeOAuthError::CredentialsNotFound)?;
        Ok(home.join(".claude").join(".credentials.json"))
    }

    pub fn has_credentials() -> bool {
        Self::credentials_path()
            .map(|p| p.exists())
            .unwrap_or(false)
    }

    fn build_headers(&self) -> Result<HeaderMap> {
        let mut headers = HeaderMap::new();
        
        let auth_value = format!("Bearer {}", self.access_token);
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&auth_value)
                .map_err(|_| ClaudeOAuthError::InvalidCredentials("Invalid token format".into()))?,
        );
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(
            "anthropic-beta",
            HeaderValue::from_static("oauth-2025-04-20"),
        );
        
        Ok(headers)
    }

    pub async fn get_usage(&self) -> Result<UsageResponse> {
        let headers = self.build_headers()?;
        
        let response = self.client
            .get(format!("{}/usage", OAUTH_API_BASE))
            .headers(headers)
            .send()
            .await?;
        
        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(ClaudeOAuthError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }
        
        response.json().await.map_err(|e| {
            ClaudeOAuthError::ParseError(format!("Failed to parse usage response: {}", e))
        })
    }

    pub async fn get_profile(&self) -> Result<ProfileResponse> {
        let headers = self.build_headers()?;
        
        let response = self.client
            .get(format!("{}/profile", OAUTH_API_BASE))
            .headers(headers)
            .send()
            .await?;
        
        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(ClaudeOAuthError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }
        
        response.json().await.map_err(|e| {
            ClaudeOAuthError::ParseError(format!("Failed to parse profile response: {}", e))
        })
    }
}
