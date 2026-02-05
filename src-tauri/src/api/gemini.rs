use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::fmt;

const API_BASE_URL: &str = "https://generativelanguage.googleapis.com/v1";

#[derive(Debug)]
pub enum GeminiError {
    RequestError(reqwest::Error),
    ApiError { status: u16, message: String },
    ParseError(String),
    InvalidApiKey,
    AuthenticationFailed,
}

impl fmt::Display for GeminiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            GeminiError::RequestError(e) => write!(f, "Request error: {}", e),
            GeminiError::ApiError { status, message } => {
                write!(f, "API error (status {}): {}", status, message)
            }
            GeminiError::ParseError(msg) => write!(f, "Parse error: {}", msg),
            GeminiError::InvalidApiKey => write!(f, "Invalid API key format"),
            GeminiError::AuthenticationFailed => write!(f, "Authentication failed"),
        }
    }
}

impl std::error::Error for GeminiError {}

impl From<reqwest::Error> for GeminiError {
    fn from(err: reqwest::Error) -> Self {
        GeminiError::RequestError(err)
    }
}

pub type Result<T> = std::result::Result<T, GeminiError>;

#[derive(Debug, Deserialize)]
struct ApiErrorResponse {
    error: ApiErrorDetail,
}

#[derive(Debug, Deserialize)]
struct ApiErrorDetail {
    message: String,
    #[allow(dead_code)]
    code: Option<u16>,
}

#[derive(Serialize)]
struct GenerateContentRequest {
    contents: Vec<Content>,
}

#[derive(Serialize)]
struct Content {
    role: String,
    parts: Vec<Part>,
}

#[derive(Serialize)]
struct Part {
    text: String,
}

pub struct GeminiClient {
    api_key: String,
    client: reqwest::Client,
}

impl GeminiClient {
    pub fn new(api_key: String) -> Self {
        let client = reqwest::Client::new();
        Self { api_key, client }
    }

    fn build_headers(&self) -> Result<HeaderMap> {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        Ok(headers)
    }

    pub async fn validate_key(&self) -> Result<bool> {
        let headers = self.build_headers()?;

        let request_body = GenerateContentRequest {
            contents: vec![Content {
                role: "user".to_string(),
                parts: vec![Part {
                    text: "Say hello".to_string(),
                }],
            }],
        };

        let url = format!(
            "{}/models/gemini-pro:generateContent?key={}",
            API_BASE_URL, self.api_key
        );

        let response = self
            .client
            .post(&url)
            .headers(headers)
            .json(&request_body)
            .send()
            .await?;

        let status = response.status();

        if status.is_success() {
            Ok(true)
        } else if status.as_u16() == 401 || status.as_u16() == 403 {
            Err(GeminiError::AuthenticationFailed)
        } else if status.as_u16() == 400 {
            let error_body = response.text().await.unwrap_or_default();
            
            if let Ok(error_response) = serde_json::from_str::<ApiErrorResponse>(&error_body) {
                if error_response.error.message.contains("API_KEY_INVALID") 
                    || error_response.error.message.contains("invalid") {
                    Err(GeminiError::InvalidApiKey)
                } else {
                    Err(GeminiError::ApiError {
                        status: status.as_u16(),
                        message: error_response.error.message,
                    })
                }
            } else {
                Err(GeminiError::ApiError {
                    status: status.as_u16(),
                    message: error_body,
                })
            }
        } else {
            let error_body = response.text().await.unwrap_or_default();

            if let Ok(error_response) = serde_json::from_str::<ApiErrorResponse>(&error_body) {
                Err(GeminiError::ApiError {
                    status: status.as_u16(),
                    message: error_response.error.message,
                })
            } else {
                Err(GeminiError::ApiError {
                    status: status.as_u16(),
                    message: error_body,
                })
            }
        }
    }

    pub fn api_key(&self) -> &str {
        &self.api_key
    }
}
