use rand::Rng;
use reqwest::header::CONTENT_TYPE;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use std::sync::Arc;
use tokio::sync::oneshot;

const CLAUDE_AUTH_URL: &str = "https://claude.ai/oauth/authorize";
const CLAUDE_TOKEN_URL: &str = "https://console.anthropic.com/v1/oauth/token";
const CLAUDE_CLIENT_ID: &str = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const REDIRECT_PORT: u16 = 19832;

#[derive(Debug, Serialize, Deserialize)]
pub struct OAuthTokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
    pub token_type: String,
    #[serde(default)]
    pub scope: Option<String>,
}

#[derive(Debug)]
pub enum OAuthError {
    PkceGeneration,
    ServerStart(String),
    TokenExchange(String),
    Timeout,
    Cancelled,
}

impl std::fmt::Display for OAuthError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::PkceGeneration => write!(f, "Failed to generate PKCE codes"),
            Self::ServerStart(e) => write!(f, "Failed to start callback server: {}", e),
            Self::TokenExchange(e) => write!(f, "Token exchange failed: {}", e),
            Self::Timeout => write!(f, "OAuth flow timed out"),
            Self::Cancelled => write!(f, "OAuth flow cancelled"),
        }
    }
}

impl std::error::Error for OAuthError {}

pub struct OAuthManager {
    client: reqwest::Client,
}

impl OAuthManager {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    fn generate_code_verifier() -> String {
        let mut rng = rand::thread_rng();
        let bytes: Vec<u8> = (0..32).map(|_| rng.gen()).collect();
        URL_SAFE_NO_PAD.encode(&bytes)
    }

    fn generate_code_challenge(verifier: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(verifier.as_bytes());
        let hash = hasher.finalize();
        URL_SAFE_NO_PAD.encode(&hash)
    }

    pub fn get_authorization_url(&self) -> (String, String, String) {
        let code_verifier = Self::generate_code_verifier();
        let code_challenge = Self::generate_code_challenge(&code_verifier);
        let state = Self::generate_code_verifier();
        
        let redirect_uri = format!("http://localhost:{}/callback", REDIRECT_PORT);
        
        let url = format!(
            "{}?client_id={}&response_type=code&code_challenge={}&code_challenge_method=S256&redirect_uri={}&scope={}&state={}",
            CLAUDE_AUTH_URL,
            CLAUDE_CLIENT_ID,
            code_challenge,
            urlencoding::encode(&redirect_uri),
            urlencoding::encode("user:inference user:profile"),
            state
        );
        
        (url, code_verifier, state)
    }

    pub async fn exchange_code(&self, code: &str, code_verifier: &str, state: &str) -> Result<OAuthTokenResponse, OAuthError> {
        let redirect_uri = format!("http://localhost:{}/callback", REDIRECT_PORT);
        
        let body = serde_json::json!({
            "grant_type": "authorization_code",
            "client_id": CLAUDE_CLIENT_ID,
            "code": code,
            "state": state,
            "redirect_uri": redirect_uri,
            "code_verifier": code_verifier
        });

        let response = self.client
            .post(CLAUDE_TOKEN_URL)
            .header(CONTENT_TYPE, "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| OAuthError::TokenExchange(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(OAuthError::TokenExchange(error_text));
        }

        response.json().await
            .map_err(|e| OAuthError::TokenExchange(e.to_string()))
    }

    pub async fn start_oauth_flow(&self) -> Result<OAuthTokenResponse, OAuthError> {
        let (auth_url, code_verifier, state) = self.get_authorization_url();
        
        let (tx, rx) = oneshot::channel::<String>();
        let tx = Arc::new(tokio::sync::Mutex::new(Some(tx)));
        
        let tx_clone = Arc::clone(&tx);
        let server = tokio::spawn(async move {
            use axum::{Router, routing::get, extract::Query, response::Html};
            
            #[derive(Deserialize)]
            struct CallbackParams {
                code: Option<String>,
                error: Option<String>,
            }
            
            let tx_inner = tx_clone;
            
            let app = Router::new().route("/callback", get(move |Query(params): Query<CallbackParams>| {
                let tx = Arc::clone(&tx_inner);
                async move {
                    if let Some(code) = params.code {
                        if let Some(sender) = tx.lock().await.take() {
                            let _ = sender.send(code);
                        }
                        Html("<html><body style='background:#1a1a1a;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0'><div style='text-align:center'><h1>Connected!</h1><p>You can close this window and return to Agent Mana.</p></div></body></html>")
                    } else {
                        Html("<html><body style='background:#1a1a1a;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0'><div style='text-align:center'><h1>Error</h1><p>Authentication failed. Please try again.</p></div></body></html>")
                    }
                }
            }));
            
            let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", REDIRECT_PORT))
                .await
                .map_err(|e| OAuthError::ServerStart(e.to_string()))?;
            
            axum::serve(listener, app)
                .await
                .map_err(|e| OAuthError::ServerStart(e.to_string()))
        });
        
        open::that(&auth_url).map_err(|e| OAuthError::ServerStart(e.to_string()))?;
        
        let code = tokio::time::timeout(
            std::time::Duration::from_secs(300),
            rx
        ).await
            .map_err(|_| OAuthError::Timeout)?
            .map_err(|_| OAuthError::Cancelled)?;
        
        server.abort();
        
        self.exchange_code(&code, &code_verifier, &state).await
    }
}
