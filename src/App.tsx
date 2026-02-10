import { useState, useEffect, useCallback } from 'react';
import { RefreshDouble, Settings } from 'iconoir-react';
import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';
import { ThemeProvider } from './contexts/ThemeContext';
import CharacterCard, { CharacterStats } from './components/CharacterCard';
import SettingsPanel from './components/SettingsPanel';
import DowntimeAnalysis from './components/DowntimeAnalysis';
import GlassCard from './components/GlassCard';
import { ProviderConfig, ProviderId, AVAILABLE_PROVIDERS } from './types/providers';
import { UsageAlert } from './types/api';

interface ClaudeUsageSnapshot {
  period_utilization: number;
  period_resets_at: string | null;
  weekly_utilization: number | null;
  weekly_resets_at: string | null;
}

interface CodexUsageSnapshot {
  input_tokens: number;
  output_tokens: number;
  total_requests: number;
  total_cost_usd: number;
  period_days: number;
}

interface ProviderStatus {
  provider: string;
  connected: boolean;
  claude_usage: ClaudeUsageSnapshot | null;
  codex_usage: CodexUsageSnapshot | null;
  error: string | null;
  last_updated: number;
}

function AppContent() {
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([]);

  const [characterStats, setCharacterStats] = useState<CharacterStats[]>([]);

  const [usageAlerts, setUsageAlerts] = useState<UsageAlert[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [triggeredCount, setTriggeredCount] = useState(0);

  const loadAlerts = async () => {
    try {
      const store = await Store.load('settings.json');
      const saved = await store.get<UsageAlert[]>('usageAlerts');
      const notif = await store.get<boolean>('notificationsEnabled');
      if (saved) setUsageAlerts(saved);
      if (notif !== null && notif !== undefined) setNotificationsEnabled(notif);
    } catch {
    }
  };

  const saveAlerts = async (alerts: UsageAlert[]) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('usageAlerts', alerts);
      await store.save();
    } catch {
    }
  };

  const saveNotificationsEnabled = async (enabled: boolean) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('notificationsEnabled', enabled);
      await store.save();
    } catch {
    }
  };

  const handleAlertsChange = useCallback((alerts: UsageAlert[]) => {
    setUsageAlerts(alerts);
    saveAlerts(alerts);
  }, []);

  const handleToggleNotifications = useCallback((enabled: boolean) => {
    setNotificationsEnabled(enabled);
    saveNotificationsEnabled(enabled);
  }, []);

  const checkAlerts = useCallback((periodUtil: number, weeklyUtil: number) => {
    if (!notificationsEnabled) {
      setTriggeredCount(0);
      return;
    }

    let count = 0;
    const updated = usageAlerts.map(alert => {
      if (!alert.enabled) return { ...alert, triggered: false };
      const currentUtil = alert.type === 'period' ? periodUtil : weeklyUtil;
      const isTriggered = currentUtil >= alert.threshold;
      if (isTriggered) count++;
      return { ...alert, triggered: isTriggered };
    });

    setUsageAlerts(updated);
    setTriggeredCount(count);
  }, [usageAlerts, notificationsEnabled]);

  const loadEnabledProviders = async () => {
    try {
      const store = await Store.load('settings.json');
      const enabledProviderIds = await store.get<ProviderId[]>('enabledProviders');
      
      if (enabledProviderIds && enabledProviderIds.length > 0) {
        const configs: ProviderConfig[] = enabledProviderIds.map(id => {
          const def = AVAILABLE_PROVIDERS[id];
          return {
            provider: id,
            name: def.name,
            apiKey: '',
            connected: false,
          };
        });
        setProviderConfigs(configs);
        
        const stats: CharacterStats[] = enabledProviderIds.map(id => {
          const def = AVAILABLE_PROVIDERS[id];
          return {
            provider: id,
            name: def.name,
            weeklyUtilization: 0,
            periodUtilization: 0,
            periodName: id === 'anthropic' ? '5HR' : id === 'openai' ? '3HR' : '1MIN',
            connected: false,
          };
        });
        setCharacterStats(stats);
      } else {
        const defaultProviders: ProviderId[] = ['anthropic', 'openai'];
        const configs: ProviderConfig[] = defaultProviders.map(id => {
          const def = AVAILABLE_PROVIDERS[id];
          return {
            provider: id,
            name: def.name,
            apiKey: '',
            connected: false,
          };
        });
        setProviderConfigs(configs);
        
        const stats: CharacterStats[] = defaultProviders.map(id => {
          const def = AVAILABLE_PROVIDERS[id];
          return {
            provider: id,
            name: def.name,
            weeklyUtilization: 0,
            periodUtilization: 0,
            periodName: id === 'anthropic' ? '5HR' : '3HR',
            connected: false,
          };
        });
        setCharacterStats(stats);
        
        await store.set('enabledProviders', defaultProviders);
        await store.save();
      }
    } catch (error) {
      console.error('Failed to load enabled providers:', error);
    }
  };

  const saveEnabledProviders = async (providerIds: ProviderId[]) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('enabledProviders', providerIds);
      await store.save();
    } catch (error) {
      console.error('Failed to save enabled providers:', error);
    }
  };

  const handleAddProvider = async (providerId: ProviderId) => {
    const def = AVAILABLE_PROVIDERS[providerId];
    const newConfig: ProviderConfig = {
      provider: providerId,
      name: def.name,
      apiKey: '',
      connected: false,
    };
    const newStat: CharacterStats = {
      provider: providerId,
      name: def.name,
      weeklyUtilization: 0,
      periodUtilization: 0,
      periodName: providerId === 'anthropic' ? '5HR' : providerId === 'openai' ? '3HR' : '1MIN',
      connected: false,
    };
    
    setProviderConfigs(prev => [...prev, newConfig]);
    setCharacterStats(prev => [...prev, newStat]);
    
    const newProviderIds = [...providerConfigs.map(p => p.provider), providerId];
    await saveEnabledProviders(newProviderIds);
  };

  const handleRemoveProvider = async (providerId: ProviderId) => {
    setProviderConfigs(prev => prev.filter(p => p.provider !== providerId));
    setCharacterStats(prev => prev.filter(s => s.provider !== providerId));
    
    const newProviderIds = providerConfigs.filter(p => p.provider !== providerId).map(p => p.provider);
    await saveEnabledProviders(newProviderIds);
    
    try {
      await invoke('remove_api_key', { provider: providerId });
    } catch (error) {
      console.error('Failed to remove provider:', error);
    }
  };

  const loadProviderStatus = async () => {
    try {
      const anthropicStatus = await invoke<ProviderStatus>('get_provider_status', { provider: 'anthropic' });
      const openaiStatus = await invoke<ProviderStatus>('get_provider_status', { provider: 'openai' });
      const geminiStatus = await invoke<ProviderStatus>('get_provider_status', { provider: 'google' });
      
      setProviderConfigs(prev => prev.map(p => {
        if (p.provider === 'anthropic') return { ...p, connected: anthropicStatus.connected, error: anthropicStatus.error };
        if (p.provider === 'openai') return { ...p, connected: openaiStatus.connected, error: openaiStatus.error };
        if (p.provider === 'google') return { ...p, connected: geminiStatus.connected, error: geminiStatus.error };
        return p;
      }));

      setCharacterStats(prev => prev.map(s => {
        if (s.provider === 'anthropic' && anthropicStatus.claude_usage) {
          const usage = anthropicStatus.claude_usage;
          return {
            ...s,
            connected: anthropicStatus.connected,
            error: anthropicStatus.error ?? undefined,
            periodUtilization: usage.period_utilization,
            periodResetTime: usage.period_resets_at ? new Date(usage.period_resets_at) : undefined,
            weeklyUtilization: usage.weekly_utilization ?? 0,
            weeklyResetTime: usage.weekly_resets_at ? new Date(usage.weekly_resets_at) : undefined,
          };
        }
        if (s.provider === 'anthropic') {
          return { ...s, connected: anthropicStatus.connected, error: anthropicStatus.error ?? undefined };
        }
        if (s.provider === 'openai') {
          if (openaiStatus.codex_usage) {
            const usage = openaiStatus.codex_usage;
            const totalTokens = usage.input_tokens + usage.output_tokens;
            return {
              ...s,
              connected: openaiStatus.connected,
              error: openaiStatus.error ?? undefined,
              periodUtilization: 0,
              weeklyUtilization: 0,
              codexUsage: {
                inputTokens: usage.input_tokens,
                outputTokens: usage.output_tokens,
                totalTokens,
                totalCost: usage.total_cost_usd,
                totalRequests: usage.total_requests,
              },
            };
          }
          return { ...s, connected: openaiStatus.connected, error: openaiStatus.error ?? undefined };
        }
        if (s.provider === 'google') {
          return { ...s, connected: geminiStatus.connected, error: geminiStatus.error ?? undefined };
        }
        return s;
      }));

      if (anthropicStatus.claude_usage) {
        const usage = anthropicStatus.claude_usage;
        const weeklyRemaining = 100 - (usage.weekly_utilization ?? 0);
        const periodRemaining = 100 - usage.period_utilization;
        try {
          await invoke('update_tray_icon', { weeklyRemaining, periodRemaining });
          await invoke('update_tray_menu', {
            weeklyUtil: usage.weekly_utilization ?? 0,
            periodUtil: usage.period_utilization,
            weeklyReset: usage.weekly_resets_at,
            periodReset: usage.period_resets_at,
          });
        } catch (e) {
          console.warn('Failed to update tray:', e);
        }

        checkAlerts(usage.period_utilization, usage.weekly_utilization ?? 0);
      }
      
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Failed to load provider status:', error);
    }
  };

  const handleSaveKey = async (provider: string, apiKey: string): Promise<void> => {
    try {
      await invoke('save_api_key', { provider, apiKey });
      await new Promise(r => setTimeout(r, 500));
      await loadProviderStatus();
    } catch (error) {
      console.warn('Tauri invoke failed (expected in browser):', error);
      throw error;
    }
  };



  const handleOAuthConnect = async (_provider: string) => {
    await loadProviderStatus();
  };

  const handleReconnect = async (provider: ProviderId) => {
    try {
      await invoke('start_oauth_flow', { provider });
      await loadProviderStatus();
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProviderStatus();
    setRefreshing(false);
  };

  useEffect(() => {
    loadEnabledProviders();
    loadAlerts();
  }, []);

  useEffect(() => {
    if (providerConfigs.length > 0) {
      loadProviderStatus();
      const interval = setInterval(loadProviderStatus, 60000);
      return () => clearInterval(interval);
    }
  }, [providerConfigs.length]);

  const connectedCharacters = characterStats.filter(c => c.connected);
  const disconnectedCharacters = characterStats.filter(c => !c.connected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-100 via-zinc-50 to-white dark:from-zinc-950 dark:via-black dark:to-zinc-900 transition-colors duration-500 p-4">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-300/30 dark:from-white/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative max-w-md mx-auto space-y-4">
        
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                Agent Mana
              </h1>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase">
                Party Status
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 bg-[var(--bg-input)] border border-[var(--border-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg transition-all disabled:opacity-50 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <RefreshDouble className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="relative p-2 bg-[var(--bg-input)] border border-[var(--border-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <Settings className="w-4 h-4" />
                {triggeredCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center px-1 bg-red-500 text-white text-[9px] font-bold rounded-full animate-pulse">
                    {triggeredCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </GlassCard>

        {connectedCharacters.length > 0 && (
          <div className="space-y-3">
            {connectedCharacters.map((stats) => (
              <CharacterCard key={stats.provider} stats={stats} onReconnect={handleReconnect} />
            ))}
          </div>
        )}

        {disconnectedCharacters.length > 0 && connectedCharacters.length > 0 && (
          <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest px-1">
            Inactive
          </div>
        )}

        {disconnectedCharacters.length > 0 && (
          <div className="space-y-2">
            {disconnectedCharacters.map((stats) => (
              <CharacterCard key={stats.provider} stats={stats} onReconnect={handleReconnect} />
            ))}
          </div>
        )}

        {connectedCharacters.length === 0 && (
          <GlassCard className="p-8 text-center">
            <div className="text-[var(--text-muted)] text-sm mb-2">No providers configured</div>
            <button
              onClick={() => setShowSettings(true)}
              className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
            >
              Open Settings to add API keys
            </button>
          </GlassCard>
        )}

        {connectedCharacters.length > 0 && (
          <DowntimeAnalysis />
        )}

        <div className="text-center text-[10px] font-mono text-[var(--text-muted)] pt-2">
          {lastRefreshTime 
            ? `Last refreshed at ${lastRefreshTime.toLocaleTimeString()}`
            : 'Loading...'}
        </div>
      </div>

      {showSettings && (
        <SettingsPanel
          providers={providerConfigs}
          alerts={usageAlerts}
          notificationsEnabled={notificationsEnabled}
          onAlertsChange={handleAlertsChange}
          onToggleNotifications={handleToggleNotifications}
          onSaveKey={handleSaveKey}
          onRemoveKey={handleRemoveProvider}
          onAddProvider={handleAddProvider}
          onOAuthConnect={handleOAuthConnect}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
