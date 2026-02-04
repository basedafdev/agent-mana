export type ProviderId = 'anthropic' | 'openai' | 'google' | 'azure' | 'cohere' | 'mistral' | 'perplexity';

export interface ProviderDefinition {
  id: ProviderId;
  name: string;
  description: string;
  authType: 'oauth' | 'api_key';
  color: string;
}

export const AVAILABLE_PROVIDERS: Record<ProviderId, ProviderDefinition> = {
  anthropic: {
    id: 'anthropic',
    name: 'Claude',
    description: 'Anthropic Claude AI with OAuth authentication',
    authType: 'oauth',
    color: '#D97757',
  },
  openai: {
    id: 'openai',
    name: 'Codex',
    description: 'OpenAI GPT models with Admin API key',
    authType: 'api_key',
    color: '#10B981',
  },
  google: {
    id: 'google',
    name: 'Gemini',
    description: 'Google Gemini AI',
    authType: 'api_key',
    color: '#4285F4',
  },
  azure: {
    id: 'azure',
    name: 'Azure OpenAI',
    description: 'Microsoft Azure OpenAI Service',
    authType: 'api_key',
    color: '#0078D4',
  },
  cohere: {
    id: 'cohere',
    name: 'Cohere',
    description: 'Cohere AI models',
    authType: 'api_key',
    color: '#FF6B6B',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Mistral AI models',
    authType: 'api_key',
    color: '#FF7F00',
  },
  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    description: 'Perplexity AI search models',
    authType: 'api_key',
    color: '#20C997',
  },
};

export interface ProviderConfig {
  provider: ProviderId;
  name: string;
  apiKey: string;
  connected: boolean;
  error?: string | null;
}
