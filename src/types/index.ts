export interface Provider {
  id: string;
  name: string;
  apiKey?: string;
}

export interface UsageRecord {
  id: string;
  providerId: string;
  timestamp: number;
  tokensUsed: number;
  cost: number;
  model: string;
}

export interface Settings {
  providers: Provider[];
  notificationsEnabled: boolean;
  pollInterval: number;
}
