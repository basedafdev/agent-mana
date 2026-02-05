// Type definitions matching Rust backend structures

export interface UsageData {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cached_tokens?: number;
  cost?: number;
}

export interface RateLimitInfo {
  limit: number | null;
  remaining: number | null;
  reset_at: number | null;
}

export interface Model {
  id: string;
  display_name: string;
  max_tokens?: number;
}

export interface BillingInfo {
  amount: number;
  currency: string;
  line_item?: string;
}

export type Provider = 'anthropic' | 'openai';

export interface ProviderStatus {
  provider: Provider;
  connected: boolean;
  usage?: UsageData;
  rate_limit?: RateLimitInfo;
  billing?: BillingInfo;
  last_updated?: number;
  error?: string;
}

export interface NotificationThreshold {
  provider: Provider;
  token_limit?: number;
  cost_limit?: number;
  rate_limit_percentage?: number;
  period_utilization_threshold?: number;
  weekly_utilization_threshold?: number;
  enabled: boolean;
}

export interface ApiKeyConfig {
  provider: Provider;
  api_key: string;
  name?: string;
}
