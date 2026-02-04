import { useState, useEffect } from 'react';
import { RefreshDouble, Settings, SunLight, HalfMoon } from 'iconoir-react';
import { invoke } from '@tauri-apps/api/core';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import CharacterCard, { CharacterStats } from './components/CharacterCard';
import SettingsPanel from './components/SettingsPanel';
import DowntimeAnalysis from './components/DowntimeAnalysis';
import GlassCard from './components/GlassCard';

interface ProviderConfig {
  provider: 'anthropic' | 'openai' | 'google';
  name: string;
  apiKey: string;
  connected: boolean;
}

interface ClaudeUsageSnapshot {
  period_utilization: number;
  period_resets_at: string | null;
  weekly_utilization: number | null;
  weekly_resets_at: string | null;
}

interface ProviderStatus {
  provider: string;
  connected: boolean;
  claude_usage: ClaudeUsageSnapshot | null;
  error: string | null;
  last_updated: number;
}

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([
    { provider: 'anthropic', name: 'Claude', apiKey: '', connected: false },
    { provider: 'openai', name: 'GPT', apiKey: '', connected: false },
    { provider: 'google', name: 'Gemini', apiKey: '', connected: false },
  ]);

  const [characterStats, setCharacterStats] = useState<CharacterStats[]>([
    {
      provider: 'anthropic',
      name: 'Claude',
      weeklyUtilization: 0,
      periodUtilization: 0,
      periodName: '5HR',
      connected: false,
    },
    {
      provider: 'openai',
      name: 'GPT',
      weeklyUtilization: 0,
      periodUtilization: 0,
      periodName: '1HR',
      connected: false,
    },
    {
      provider: 'google',
      name: 'Gemini',
      weeklyUtilization: 0,
      periodUtilization: 0,
      periodName: '1MIN',
      connected: false,
    },
  ]);

  const [hourlyUsage] = useState(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      requests: Math.floor(Math.random() * 100),
      tokens: Math.floor(Math.random() * 10000),
    }));
  });

  const loadProviderStatus = async () => {
    try {
      const anthropicStatus = await invoke<ProviderStatus>('get_provider_status', { provider: 'anthropic' });
      const openaiStatus = await invoke<ProviderStatus>('get_provider_status', { provider: 'openai' });
      
      setProviderConfigs(prev => prev.map(p => {
        if (p.provider === 'anthropic') return { ...p, connected: anthropicStatus.connected };
        if (p.provider === 'openai') return { ...p, connected: openaiStatus.connected };
        return p;
      }));

      setCharacterStats(prev => prev.map(s => {
        if (s.provider === 'anthropic' && anthropicStatus.claude_usage) {
          const usage = anthropicStatus.claude_usage;
          return {
            ...s,
            connected: anthropicStatus.connected,
            periodUtilization: usage.period_utilization,
            periodResetTime: usage.period_resets_at ? new Date(usage.period_resets_at) : undefined,
            weeklyUtilization: usage.weekly_utilization ?? 0,
            weeklyResetTime: usage.weekly_resets_at ? new Date(usage.weekly_resets_at) : undefined,
          };
        }
        if (s.provider === 'anthropic') {
          return { ...s, connected: anthropicStatus.connected };
        }
        if (s.provider === 'openai') {
          return { ...s, connected: openaiStatus.connected };
        }
        return s;
      }));

      if (anthropicStatus.claude_usage) {
        const usage = anthropicStatus.claude_usage;
        const weeklyRemaining = 100 - (usage.weekly_utilization ?? 0);
        const periodRemaining = 100 - usage.period_utilization;
        try {
          await invoke('update_tray_icon', { weeklyRemaining, periodRemaining });
        } catch (e) {
          console.warn('Failed to update tray icon:', e);
        }
      }
    } catch (error) {
      console.error('Failed to load provider status:', error);
    }
  };

  const handleSaveKey = async (provider: string, apiKey: string): Promise<void> => {
    try {
      await invoke('save_api_key', { provider, apiKey });
    } catch (error) {
      console.warn('Tauri invoke failed (expected in browser):', error);
    }
    
    setProviderConfigs(prev => prev.map(p => 
      p.provider === provider ? { ...p, apiKey, connected: true } : p
    ));
    setCharacterStats(prev => prev.map(s =>
      s.provider === provider ? { ...s, connected: true } : s
    ));
  };

  const handleRemoveKey = async (provider: string) => {
    setProviderConfigs(prev => prev.map(p => 
      p.provider === provider ? { ...p, apiKey: '', connected: false } : p
    ));
    setCharacterStats(prev => prev.map(s =>
      s.provider === provider ? { ...s, connected: false } : s
    ));
  };

  const handleOAuthConnect = async (_provider: string) => {
    await loadProviderStatus();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProviderStatus();
    setRefreshing(false);
  };

  useEffect(() => {
    loadProviderStatus();
    const interval = setInterval(loadProviderStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const connectedCharacters = characterStats.filter(c => c.connected);
  const disconnectedCharacters = characterStats.filter(c => !c.connected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 transition-colors duration-500 p-4">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative max-w-md mx-auto space-y-4">
        
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Agent Mana
              </h1>
              <p className="text-[10px] font-semibold text-white/30 tracking-widest uppercase">
                Party Status
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={toggleTheme}
                className="p-2 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] rounded-lg transition-all text-white/50 hover:text-white"
              >
                {theme === 'dark' ? <SunLight className="w-4 h-4" /> : <HalfMoon className="w-4 h-4" />}
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] rounded-lg transition-all disabled:opacity-50 text-white/50 hover:text-white"
              >
                <RefreshDouble className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] rounded-lg transition-all text-white/50 hover:text-white"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </GlassCard>

        {connectedCharacters.length > 0 && (
          <div className="space-y-3">
            {connectedCharacters.map((stats) => (
              <CharacterCard key={stats.provider} stats={stats} />
            ))}
          </div>
        )}

        {disconnectedCharacters.length > 0 && connectedCharacters.length > 0 && (
          <div className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-1">
            Inactive
          </div>
        )}

        {disconnectedCharacters.length > 0 && (
          <div className="space-y-2">
            {disconnectedCharacters.map((stats) => (
              <CharacterCard key={stats.provider} stats={stats} />
            ))}
          </div>
        )}

        {connectedCharacters.length === 0 && (
          <GlassCard className="p-8 text-center">
            <div className="text-white/30 text-sm mb-2">No providers configured</div>
            <button
              onClick={() => setShowSettings(true)}
              className="text-xs font-semibold text-white/50 hover:text-white underline underline-offset-2"
            >
              Open Settings to add API keys
            </button>
          </GlassCard>
        )}

        {connectedCharacters.length > 0 && (
          <DowntimeAnalysis data={hourlyUsage} provider="anthropic" />
        )}

        <div className="text-center text-[10px] font-mono text-white/20 pt-2">
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      {showSettings && (
        <SettingsPanel
          providers={providerConfigs}
          onSaveKey={handleSaveKey}
          onRemoveKey={handleRemoveKey}
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
