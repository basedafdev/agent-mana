use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::fmt;

/// Base URL for OpenAI API
const API_BASE_URL: &str = "https://api.openai.com/v1";

/// Usage API base URL (requires Admin Key)
const USAGE_API_URL: &str = "https://api.openai.com/v1/organization/usage";

/// Custom error type for OpenAI API operations
#[derive(Debug)]
pub enum OpenAIError {
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
    /// Rate limit exceeded
    RateLimitExceeded,
}

impl fmt::Display for OpenAIError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            OpenAIError::RequestError(e) => write!(f, "Request error: {}", e),
            OpenAIError::ApiError { status, message } => {
                write!(f, "API error (status {}): {}", status, message)
            }
            OpenAIError::ParseError(msg) => write!(f, "Parse error: {}", msg),
            OpenAIError::InvalidApiKey => write!(f, "Invalid API key format"),
            OpenAIError::AuthenticationFailed => write!(f, "Authentication failed"),
            OpenAIError::RateLimitExceeded => write!(f, "Rate limit exceeded"),
        }
    }
}

impl std::error::Error for OpenAIError {}

impl From<reqwest::Error> for OpenAIError {
    fn from(err: reqwest::Error) -> Self {
        OpenAIError::RequestError(err)
    }
}

/// Result type alias for OpenAI API operations
pub type Result<T> = std::result::Result<T, OpenAIError>;

/// Usage statistics from an API response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageData {
    /// Number of prompt tokens consumed
    pub prompt_tokens: u64,
    /// Number of completion tokens generated
    pub completion_tokens: u64,
    /// Total tokens used (prompt + completion)
    pub total_tokens: u64,
}

impl UsageData {
    /// Calculate estimated cost in USD based on model pricing
    /// 
    /// Note: This uses approximate pricing and should be updated
    /// with actual model pricing information
    pub fn estimate_cost(&self, model: &str) -> f64 {
        // Approximate costs per 1K tokens (as of 2024)
        let (prompt_cost, completion_cost) = match model {
            "gpt-4" => (0.03, 0.06),
            "gpt-4-turbo-preview" | "gpt-4-turbo" => (0.01, 0.03),
            "gpt-3.5-turbo" => (0.0005, 0.0015),
            _ => (0.001, 0.002), // Default estimate
        };

        let prompt_cost_total = (self.prompt_tokens as f64 / 1000.0) * prompt_cost;
        let completion_cost_total = (self.completion_tokens as f64 / 1000.0) * completion_cost;
        
        prompt_cost_total + completion_cost_total
    }
}

/// Rate limit information extracted from response headers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitInfo {
    /// Maximum requests allowed per time window
    pub limit_requests: Option<u64>,
    /// Remaining requests in current time window
    pub remaining_requests: Option<u64>,
    /// Maximum tokens allowed per time window
    pub limit_tokens: Option<u64>,
    /// Remaining tokens in current time window
    pub remaining_tokens: Option<u64>,
    /// Unix timestamp when the rate limit resets
    pub reset_requests: Option<u64>,
    /// Unix timestamp when the token limit resets
    pub reset_tokens: Option<u64>,
}

impl RateLimitInfo {
    /// Create RateLimitInfo from response headers
    /// 
    /// OpenAI uses headers like:
    /// - x-ratelimit-limit-requests
    /// - x-ratelimit-remaining-requests
    /// - x-ratelimit-reset-requests
    /// - x-ratelimit-limit-tokens
    /// - x-ratelimit-remaining-tokens
    /// - x-ratelimit-reset-tokens
    pub fn from_headers(headers: &HeaderMap) -> Self {
        let limit_requests = headers
            .get("x-ratelimit-limit-requests")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse().ok());

        let remaining_requests = headers
            .get("x-ratelimit-remaining-requests")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse().ok());

        let reset_requests = headers
            .get("x-ratelimit-reset-requests")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse().ok());

        let limit_tokens = headers
            .get("x-ratelimit-limit-tokens")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse().ok());

        let remaining_tokens = headers
            .get("x-ratelimit-remaining-tokens")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse().ok());

        let reset_tokens = headers
            .get("x-ratelimit-reset-tokens")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse().ok());

        Self {
            limit_requests,
            remaining_requests,
            limit_tokens,
            remaining_tokens,
            reset_requests,
            reset_tokens,
        }
    }

    /// Check if rate limit is exhausted
    pub fn is_exhausted(&self) -> bool {
        self.remaining_requests.map_or(false, |r| r == 0)
            || self.remaining_tokens.map_or(false, |r| r == 0)
    }
}

/// Information about an available model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Model {
    /// Model identifier (e.g., "gpt-4", "gpt-3.5-turbo")
    pub id: String,
    /// Unix timestamp of when the model was created
    pub created: u64,
    /// The organization that owns the model
    pub owned_by: String,
}

/// Billing usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BillingInfo {
    /// Total amount used in USD cents
    pub total_usage: Option<f64>,
    /// Daily breakdown of usage
    pub daily_costs: Option<Vec<DailyCost>>,
}

/// Daily cost breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyCost {
    /// Date in YYYY-MM-DD format
    pub date: String,
    /// Cost in USD cents
    pub cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationUsage {
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub total_requests: u64,
    pub total_cost_usd: f64,
    pub period_start: u64,
    pub period_end: u64,
}

#[derive(Debug, Deserialize)]
struct UsagePageResponse {
    data: Vec<UsageBucket>,
    has_more: bool,
    #[allow(dead_code)]
    next_page: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UsageBucket {
    #[allow(dead_code)]
    start_time: u64,
    #[allow(dead_code)]
    end_time: u64,
    results: Vec<UsageResult>,
}

#[derive(Debug, Deserialize)]
struct UsageResult {
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    num_model_requests: Option<u64>,
    #[allow(dead_code)]
    model: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CostsPageResponse {
    data: Vec<CostsBucket>,
    #[allow(dead_code)]
    has_more: bool,
}

#[derive(Debug, Deserialize)]
struct CostsBucket {
    results: Vec<CostResult>,
}

#[derive(Debug, Deserialize)]
struct CostResult {
    amount: Option<CostAmount>,
}

#[derive(Debug, Deserialize)]
struct CostAmount {
    value: Option<f64>,
}

/// Response from the /models endpoint
#[derive(Debug, Deserialize)]
struct ModelsResponse {
    data: Vec<Model>,
}

/// Error response from the OpenAI API
#[derive(Debug, Deserialize)]
struct ApiErrorResponse {
    error: ApiErrorDetail,
}

#[derive(Debug, Deserialize)]
struct ApiErrorDetail {
    message: String,
    #[serde(rename = "type")]
    #[allow(dead_code)]
    error_type: String,
    #[allow(dead_code)]
    code: Option<String>,
}

/// Main client for interacting with the OpenAI API
pub struct OpenAIClient {
    api_key: String,
    client: reqwest::Client,
}

impl OpenAIClient {
    /// Create a new OpenAI API client
    ///
    /// # Arguments
    /// * `api_key` - The OpenAI API key (should start with "sk-")
    ///
    /// # Example
    /// ```no_run
    /// let client = OpenAIClient::new("sk-...".to_string());
    /// ```
    pub fn new(api_key: String) -> Self {
        let client = reqwest::Client::new();
        Self { api_key, client }
    }

    /// Build common headers for API requests
    fn build_headers(&self) -> Result<HeaderMap> {
        let mut headers = HeaderMap::new();

        let auth_value = format!("Bearer {}", self.api_key);
        let auth_header = HeaderValue::from_str(&auth_value)
            .map_err(|_| OpenAIError::InvalidApiKey)?;

        headers.insert(AUTHORIZATION, auth_header);
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        Ok(headers)
    }

    /// Validate the API key by checking organization usage access
    ///
    /// This sends a request to the /organization/usage endpoint to verify admin key authentication.
    /// Admin keys require access to organization usage data, so this validates both authentication
    /// and proper permissions. Returns `Ok(true)` if the API key is valid and has admin access.
    ///
    /// # Example
    /// ```no_run
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// # let client = OpenAIClient::new("sk-...".to_string());
    /// let is_valid = client.validate_key().await?;
    /// if is_valid {
    ///     println!("Admin API key is valid!");
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn validate_key(&self) -> Result<bool> {
        let headers = self.build_headers()?;

        // Use a minimal time range (1 day) to check admin key access
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let start_time = now - 86400; // 24 hours ago

        let url = format!(
            "{}/completions?start_time={}&limit=1",
            USAGE_API_URL, start_time
        );

        let response = self
            .client
            .get(&url)
            .headers(headers)
            .send()
            .await?;

        let status = response.status();

        if status.is_success() {
            Ok(true)
        } else if status.as_u16() == 401 {
            Err(OpenAIError::AuthenticationFailed)
        } else if status.as_u16() == 403 {
            Err(OpenAIError::ApiError {
                status: 403,
                message: "This API key does not have admin permissions. Please create an Admin API key from platform.openai.com/settings with 'All' or 'Read' permissions for organization usage data.".to_string(),
            })
        } else if status.as_u16() == 429 {
            Err(OpenAIError::RateLimitExceeded)
        } else {
            let error_body = response.text().await.unwrap_or_default();

            // Try to parse as API error response
            if let Ok(error_response) = serde_json::from_str::<ApiErrorResponse>(&error_body) {
                Err(OpenAIError::ApiError {
                    status: status.as_u16(),
                    message: error_response.error.message,
                })
            } else {
                Err(OpenAIError::ApiError {
                    status: status.as_u16(),
                    message: error_body,
                })
            }
        }
    }

    /// Get list of available OpenAI models
    ///
    /// Fetches the complete list of models from the OpenAI API.
    ///
    /// # Example
    /// ```no_run
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// # let client = OpenAIClient::new("sk-...".to_string());
    /// let models = client.get_models().await?;
    /// for model in models {
    ///     println!("Model: {} (owned by: {})", model.id, model.owned_by);
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_models(&self) -> Result<Vec<Model>> {
        let headers = self.build_headers()?;

        let response = self
            .client
            .get(format!("{}/models", API_BASE_URL))
            .headers(headers)
            .send()
            .await?;

        let status = response.status();

        if status.is_success() {
            let models_response: ModelsResponse = response.json().await.map_err(|e| {
                OpenAIError::ParseError(format!("Failed to parse models response: {}", e))
            })?;
            Ok(models_response.data)
        } else if status.as_u16() == 401 {
            Err(OpenAIError::AuthenticationFailed)
        } else if status.as_u16() == 429 {
            Err(OpenAIError::RateLimitExceeded)
        } else {
            let error_body = response.text().await.unwrap_or_default();

            if let Ok(error_response) = serde_json::from_str::<ApiErrorResponse>(&error_body) {
                Err(OpenAIError::ApiError {
                    status: status.as_u16(),
                    message: error_response.error.message,
                })
            } else {
                Err(OpenAIError::ApiError {
                    status: status.as_u16(),
                    message: error_body,
                })
            }
        }
    }

    pub async fn get_organization_usage(&self, days: u32) -> Result<OrganizationUsage> {
        let headers = self.build_headers()?;
        
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let start_time = now - (days as u64 * 24 * 60 * 60);
        
        let completions_url = format!(
            "{}/completions?start_time={}&bucket_width=1d",
            USAGE_API_URL, start_time
        );
        
        let response = self.client
            .get(&completions_url)
            .headers(headers.clone())
            .send()
            .await?;
        
        let status = response.status();
        if status.as_u16() == 401 {
            return Err(OpenAIError::AuthenticationFailed);
        }
        if status.as_u16() == 403 {
            return Err(OpenAIError::ApiError {
                status: 403,
                message: "Admin API key required for usage data".to_string(),
            });
        }
        if !status.is_success() {
            let error_body = response.text().await.unwrap_or_default();
            return Err(OpenAIError::ApiError {
                status: status.as_u16(),
                message: error_body,
            });
        }
        
        let response_text = response.text().await.map_err(|e| {
            OpenAIError::ParseError(format!("Failed to read response body: {}", e))
        })?;
        
        eprintln!("OpenAI usage response body: {}", response_text);
        
        let usage_response: UsagePageResponse = serde_json::from_str(&response_text).map_err(|e| {
            OpenAIError::ParseError(format!("Failed to parse usage response: {} | Response body: {}", e, response_text))
        })?;
        
        let mut total_input = 0u64;
        let mut total_output = 0u64;
        let mut total_requests = 0u64;
        
        for bucket in &usage_response.data {
            for result in &bucket.results {
                total_input += result.input_tokens.unwrap_or(0);
                total_output += result.output_tokens.unwrap_or(0);
                total_requests += result.num_model_requests.unwrap_or(0);
            }
        }
        
        let costs_url = format!(
            "{}/costs?start_time={}&bucket_width=1d",
            USAGE_API_URL, start_time
        );
        
        let costs_response = self.client
            .get(&costs_url)
            .headers(headers)
            .send()
            .await?;
        
        let mut total_cost = 0.0f64;
        
        if costs_response.status().is_success() {
            if let Ok(costs_data) = costs_response.json::<CostsPageResponse>().await {
                for bucket in &costs_data.data {
                    for result in &bucket.results {
                        if let Some(amount) = &result.amount {
                            total_cost += amount.value.unwrap_or(0.0);
                        }
                    }
                }
            }
        }
        
        Ok(OrganizationUsage {
            input_tokens: total_input,
            output_tokens: total_output,
            total_requests,
            total_cost_usd: total_cost,
            period_start: start_time,
            period_end: now,
        })
    }
    
    pub async fn is_admin_key(&self) -> bool {
        let headers = match self.build_headers() {
            Ok(h) => h,
            Err(_) => return false,
        };
        
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let start_time = now - 86400;
        
        let url = format!("{}/completions?start_time={}&limit=1", USAGE_API_URL, start_time);
        
        match self.client.get(&url).headers(headers).send().await {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }

    /// Extract usage data and rate limit info from a response
    ///
    /// This is a helper method for future chat completion implementations.
    /// It extracts both usage statistics and rate limit information from
    /// a chat completion response.
    ///
    /// # Arguments
    /// * `response` - The HTTP response from a chat completion API call
    ///
    /// # Returns
    /// A tuple of (UsageData, RateLimitInfo)
    ///
    /// # Example
    /// ```no_run
    /// # async fn example(response: reqwest::Response) -> Result<(), Box<dyn std::error::Error>> {
    /// # let client = OpenAIClient::new("sk-...".to_string());
    /// let (usage, rate_limits) = client.extract_usage_info(response).await?;
    /// println!("Used {} total tokens", usage.total_tokens);
    /// println!("Remaining requests: {:?}", rate_limits.remaining_requests);
    /// # Ok(())
    /// # }
    /// ```
    pub async fn extract_usage_info(
        &self,
        response: reqwest::Response,
    ) -> Result<(UsageData, RateLimitInfo)> {
        let rate_limit = RateLimitInfo::from_headers(response.headers());

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            
            if status.as_u16() == 429 {
                return Err(OpenAIError::RateLimitExceeded);
            }
            
            return Err(OpenAIError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }

        // Parse the response to extract usage data
        let response_json: serde_json::Value = response.json().await.map_err(|e| {
            OpenAIError::ParseError(format!("Failed to parse response: {}", e))
        })?;

        // Extract usage from the response
        let usage_data = response_json
            .get("usage")
            .and_then(|u| serde_json::from_value::<UsageData>(u.clone()).ok())
            .ok_or_else(|| OpenAIError::ParseError("No usage data in response".to_string()))?;

        Ok((usage_data, rate_limit))
    }

    /// Get the API key (for internal use)
    pub fn api_key(&self) -> &str {
        &self.api_key
    }
}
