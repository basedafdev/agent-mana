use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::fmt;

/// Base URL for Anthropic API
const API_BASE_URL: &str = "https://api.anthropic.com/v1";

/// Anthropic API version header value
const API_VERSION: &str = "2023-06-01";

/// Custom error type for Anthropic API operations
#[derive(Debug)]
pub enum AnthropicError {
    /// Network or HTTP request error
    RequestError(reqwest::Error),
    /// API returned an error response
    ApiError { status: u16, message: String },
    /// Failed to parse response
    ParseError(String),
    /// Invalid API key format
    InvalidApiKey,
    /// Authentication failed
    AuthenticationFailed,
}

impl fmt::Display for AnthropicError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AnthropicError::RequestError(e) => write!(f, "Request error: {}", e),
            AnthropicError::ApiError { status, message } => {
                write!(f, "API error (status {}): {}", status, message)
            }
            AnthropicError::ParseError(msg) => write!(f, "Parse error: {}", msg),
            AnthropicError::InvalidApiKey => write!(f, "Invalid API key format"),
            AnthropicError::AuthenticationFailed => write!(f, "Authentication failed"),
        }
    }
}

impl std::error::Error for AnthropicError {}

impl From<reqwest::Error> for AnthropicError {
    fn from(err: reqwest::Error) -> Self {
        AnthropicError::RequestError(err)
    }
}

/// Result type alias for Anthropic API operations
pub type Result<T> = std::result::Result<T, AnthropicError>;

/// Usage statistics from an API response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageData {
    /// Number of input tokens consumed
    pub input_tokens: u64,
    /// Number of output tokens generated
    pub output_tokens: u64,
}

impl UsageData {
    /// Calculate total tokens used
    pub fn total_tokens(&self) -> u64 {
        self.input_tokens + self.output_tokens
    }
}

/// Rate limit information extracted from response headers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitInfo {
    /// Maximum requests allowed per time window
    pub limit: Option<u64>,
    /// Remaining requests in current time window
    pub remaining: Option<u64>,
    /// Unix timestamp when the rate limit resets
    pub reset_at: Option<u64>,
}

impl RateLimitInfo {
    /// Create RateLimitInfo from response headers
    pub fn from_headers(headers: &HeaderMap) -> Self {
        let limit = headers
            .get("x-ratelimit-limit")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse().ok());

        let remaining = headers
            .get("x-ratelimit-remaining")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse().ok());

        let reset_at = headers
            .get("x-ratelimit-reset")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse().ok());

        Self {
            limit,
            remaining,
            reset_at,
        }
    }

    /// Check if rate limit is exhausted
    pub fn is_exhausted(&self) -> bool {
        self.remaining.map_or(false, |r| r == 0)
    }
}

/// Information about an available model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Model {
    /// Model identifier (e.g., "claude-3-opus-20240229")
    pub id: String,
    /// Human-readable display name
    pub display_name: String,
    /// Maximum context window size in tokens
    pub max_tokens: Option<u64>,
}

/// Response from a messages API call (minimal structure for validation)
#[derive(Debug, Deserialize)]
struct MessagesResponse {
    #[allow(dead_code)]
    id: String,
    #[serde(rename = "type")]
    #[allow(dead_code)]
    response_type: String,
    usage: UsageData,
}

/// Error response from the API
#[derive(Debug, Deserialize)]
struct ApiErrorResponse {
    #[serde(rename = "type")]
    #[allow(dead_code)]
    error_type: String,
    message: String,
}

/// Main client for interacting with the Anthropic API
pub struct AnthropicClient {
    api_key: String,
    client: reqwest::Client,
}

impl AnthropicClient {
    /// Create a new Anthropic API client
    ///
    /// # Arguments
    /// * `api_key` - The Anthropic API key (should start with "sk-ant-")
    ///
    /// # Example
    /// ```no_run
    /// let client = AnthropicClient::new("sk-ant-...".to_string());
    /// ```
    pub fn new(api_key: String) -> Self {
        let client = reqwest::Client::new();
        Self { api_key, client }
    }

    /// Build common headers for API requests
    fn build_headers(&self) -> Result<HeaderMap> {
        let mut headers = HeaderMap::new();
        
        let api_key_value = HeaderValue::from_str(&self.api_key)
            .map_err(|_| AnthropicError::InvalidApiKey)?;
        
        headers.insert("x-api-key", api_key_value);
        headers.insert(
            "anthropic-version",
            HeaderValue::from_static(API_VERSION),
        );
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        
        Ok(headers)
    }

    /// Validate the API key by making a minimal test request
    ///
    /// This sends a simple message request to verify authentication.
    /// Returns `Ok(true)` if the API key is valid, or an error otherwise.
    ///
    /// # Example
    /// ```no_run
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// # let client = AnthropicClient::new("sk-ant-...".to_string());
    /// let is_valid = client.validate_key().await?;
    /// if is_valid {
    ///     println!("API key is valid!");
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn validate_key(&self) -> Result<bool> {
        let headers = self.build_headers()?;
        
        // Create a minimal test request
        let body = serde_json::json!({
            "model": "claude-3-haiku-20240307",
            "max_tokens": 1,
            "messages": [{
                "role": "user",
                "content": "Hi"
            }]
        });

        let response = self
            .client
            .post(format!("{}/messages", API_BASE_URL))
            .headers(headers)
            .json(&body)
            .send()
            .await?;

        let status = response.status();
        
        if status.is_success() {
            Ok(true)
        } else if status.as_u16() == 401 {
            Err(AnthropicError::AuthenticationFailed)
        } else {
            let error_body = response.text().await.unwrap_or_default();
            
            // Try to parse as API error response
            if let Ok(error_response) = serde_json::from_str::<ApiErrorResponse>(&error_body) {
                Err(AnthropicError::ApiError {
                    status: status.as_u16(),
                    message: error_response.message,
                })
            } else {
                Err(AnthropicError::ApiError {
                    status: status.as_u16(),
                    message: error_body,
                })
            }
        }
    }

    /// Get list of available Claude models
    ///
    /// Note: Anthropic doesn't currently have a dedicated models endpoint,
    /// so this returns a hardcoded list of known Claude models.
    ///
    /// # Example
    /// ```no_run
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// # let client = AnthropicClient::new("sk-ant-...".to_string());
    /// let models = client.get_models().await?;
    /// for model in models {
    ///     println!("{}: {}", model.id, model.display_name);
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_models(&self) -> Result<Vec<Model>> {
        // Anthropic doesn't have a models endpoint yet, so we return known models
        Ok(vec![
            Model {
                id: "claude-3-opus-20240229".to_string(),
                display_name: "Claude 3 Opus".to_string(),
                max_tokens: Some(200_000),
            },
            Model {
                id: "claude-3-sonnet-20240229".to_string(),
                display_name: "Claude 3 Sonnet".to_string(),
                max_tokens: Some(200_000),
            },
            Model {
                id: "claude-3-haiku-20240307".to_string(),
                display_name: "Claude 3 Haiku".to_string(),
                max_tokens: Some(200_000),
            },
            Model {
                id: "claude-3-5-sonnet-20241022".to_string(),
                display_name: "Claude 3.5 Sonnet".to_string(),
                max_tokens: Some(200_000),
            },
        ])
    }

    /// Extract usage data and rate limit info from a response
    ///
    /// This is a helper method for future message-sending implementations.
    /// It extracts both usage statistics and rate limit information.
    ///
    /// # Arguments
    /// * `response` - The HTTP response from an API call
    ///
    /// # Returns
    /// A tuple of (UsageData, RateLimitInfo)
    pub async fn extract_usage_info(
        &self,
        response: reqwest::Response,
    ) -> Result<(UsageData, RateLimitInfo)> {
        let rate_limit = RateLimitInfo::from_headers(response.headers());
        
        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AnthropicError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }

        let messages_response: MessagesResponse = response.json().await.map_err(|e| {
            AnthropicError::ParseError(format!("Failed to parse response: {}", e))
        })?;

        Ok((messages_response.usage, rate_limit))
    }

    /// Get the API key (for internal use)
    pub fn api_key(&self) -> &str {
        &self.api_key
    }
}
