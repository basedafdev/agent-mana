import { useState, useEffect } from 'react';
import { Xmark, Key, Eye, EyeClosed, FloppyDisk, Link as LinkIcon, Timer, HalfMoon, Plus, Search, Minus } from 'iconoir-react';
import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';
import GlassCard from './GlassCard';
import SadPixelCharacter from './SadPixelCharacter';
import ProviderLogo from './ProviderLogo';
import UsageAlerts from './UsageAlerts';
import { useTheme } from '../contexts/ThemeContext';
import { ProviderConfig, ProviderId, AVAILABLE_PROVIDERS } from '../types/providers';
import { UsageAlert } from '../types/api';

interface SettingsPanelProps {
  providers: ProviderConfig[];
  alerts: UsageAlert[];
  notificationsEnabled: boolean;
  onAlertsChange: (alerts: UsageAlert[]) => void;
  onToggleNotifications: (enabled: boolean) => void;
  onSaveKey: (provider: string, apiKey: string) => Promise<void>;
  onRemoveKey: (provider: ProviderId) => void;
  onAddProvider: (provider: ProviderId) => void;
  onOAuthConnect?: (provider: string) => Promise<void>;
  onClose: () => void;
}

export default function SettingsPanel({ providers, alerts, notificationsEnabled, onAlertsChange, onToggleNotifications, onSaveKey, onRemoveKey, onAddProvider, onOAuthConnect, onClose }: SettingsPanelProps) {
  const { preference, setPreference } = useTheme();
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddProvider, setShowAddProvider] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [pollingInterval, setPollingInterval] = useState(60);

  const enabledProviderIds = providers.map(p => p.provider);
  const availableProviders = Object.values(AVAILABLE_PROVIDERS).filter(
    def => !enabledProviderIds.includes(def.id)
  );
  
  const filteredProviders = availableProviders.filter(def =>
    def.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    def.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const store = await Store.load('settings.json');
        const interval = await store.get<number>('pollingInterval');
        if (interval) setPollingInterval(interval);
      } catch {
      }
    };
    loadSettings();
  }, []);

  const savePollingInterval = async (value: number) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('pollingInterval', value);
      await store.save();
    } catch {
    }
  };

  const handleSave = async (provider: string) => {
    if (!apiKeyInput.trim()) return;

    setSaving(true);
    setError(null);

    try {
      await onSaveKey(provider, apiKeyInput);
      await new Promise(r => setTimeout(r, 300));
      setApiKeyInput('');
      setEditingProvider(null);
      setShowKey(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleOAuthConnect = async (provider: string) => {
    setOauthLoading(true);
    setError(null);
    try {
      await invoke('start_oauth_flow', { provider });
      onOAuthConnect?.(provider);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('invoke') || errorMsg.includes('undefined')) {
        setError('Please run with "npm run tauri dev" for OAuth');
      } else {
        setError(errorMsg);
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const selectClass = " rounded-lg px-2 py-1 text-xs cursor-pointer dark:bg-zinc-800 dark:text-black";

  return (
    <div className="fixed inset-0 bg-white/90 dark:bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-50">
      <div className="backdrop-blur-2xl bg-white dark:bg-zinc-900/95 border border-zinc-200 dark:border-white/[0.08] rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <Xmark className="w-5 h-5 text-zinc-500 dark:text-white/60" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-zinc-500 dark:text-white/40 uppercase tracking-wider">
              Active Providers
            </div>
            <button
              onClick={() => setShowAddProvider(!showAddProvider)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-white/[0.05] border border-zinc-300 dark:border-white/[0.08] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-700 dark:text-white/80 rounded-lg text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Provider
            </button>
          </div>

          {showAddProvider && (
            <GlassCard className="p-4 mb-3">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search providers..."
                    className="w-full bg-zinc-100 dark:bg-white/[0.03] border border-zinc-300 dark:border-white/[0.08] rounded-lg pl-10 pr-3 py-2 
                             text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-white/20
                             focus:outline-none focus:border-zinc-400 dark:focus:border-white/20"
                    autoFocus
                  />
                </div>
                
                {filteredProviders.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredProviders.map((def) => {
                      const isSupported = def.id === 'anthropic';
                      return (
                        <button
                          key={def.id}
                          onClick={() => {
                            if (!isSupported) return;
                            onAddProvider(def.id);
                            setShowAddProvider(false);
                            setSearchQuery('');
                          }}
                          disabled={!isSupported}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                            isSupported
                              ? 'bg-zinc-100 dark:bg-white/[0.03] hover:bg-zinc-200 dark:hover:bg-white/[0.08] cursor-pointer'
                              : 'bg-zinc-50 dark:bg-white/[0.01] opacity-50 cursor-not-allowed grayscale'
                          }`}
                        >
                          <ProviderLogo provider={def.id} size={20} className="w-8 h-8 rounded-lg" />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-zinc-900 dark:text-white">{def.name}</div>
                            <div className="text-[10px] text-zinc-500 dark:text-white/50">{def.description}</div>
                          </div>
                          {isSupported ? (
                            <Plus className="w-4 h-4 text-zinc-400 dark:text-white/40" />
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-white/[0.08] text-[9px] font-semibold text-zinc-400 dark:text-white/30 whitespace-nowrap">
                              Coming Soon
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-zinc-400 dark:text-white/40">
                    {searchQuery ? 'No providers found' : 'All providers are already added'}
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {providers.length === 0 && !showAddProvider && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <SadPixelCharacter size={96} />
              <div className="text-sm text-zinc-400 dark:text-white/40">
                Add provider to get started
              </div>
            </div>
          )}

          {providers.map((provider) => (
            <GlassCard key={provider.provider} className="p-4 relative">
              <button
                onClick={() => {
                  if (confirm(`Remove ${provider.name}? This will delete all configuration.`)) {
                    onRemoveKey(provider.provider);
                  }
                }}
                className="absolute top-3 right-3 p-1 hover:bg-zinc-200 dark:hover:bg-white/[0.1] rounded transition-all text-zinc-400 dark:text-white/40 hover:text-zinc-600 dark:hover:text-white/60"
                title="Remove provider"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              
              <div className="flex items-center gap-3 mb-3 pr-8">
                <ProviderLogo provider={provider.provider} size={24} className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/[0.05]" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white">{provider.name}</div>
                  <div className={`text-[10px] ${provider.connected ? 'text-green-500' : 'text-zinc-400 dark:text-white/40'}`}>
                    {provider.connected ? '● Connected' : 'Not configured'}
                  </div>
                </div>
              </div>

              {editingProvider === provider.provider ? (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={provider.provider === 'openai' ? 'sk-admin-...' : 'Enter API key...'}
                      className="w-full bg-zinc-100 dark:bg-white/[0.03] border border-zinc-300 dark:border-white/[0.08] rounded-lg px-3 py-2 pr-10 
                               font-mono text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-white/20
                               focus:outline-none focus:border-zinc-400 dark:focus:border-white/20"
                      autoFocus
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-white/30 hover:text-zinc-600 dark:hover:text-white/60"
                    >
                      {showKey ? <EyeClosed className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {error && (
                    <div className="text-[10px] text-red-500 mb-2">{error}</div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(provider.provider)}
                      disabled={!apiKeyInput.trim() || saving}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all
                               ${provider.provider === 'openai' 
                                 ? 'bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-zinc-300 dark:disabled:bg-white/10 disabled:text-zinc-500 dark:disabled:text-white/30'
                                 : 'bg-zinc-900 dark:bg-white text-white dark:text-black disabled:bg-zinc-300 dark:disabled:bg-white/10 disabled:text-zinc-500 dark:disabled:text-white/30'}`}
                    >
                      <FloppyDisk className="w-3.5 h-3.5" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditingProvider(null); setApiKeyInput(''); setError(null); }}
                      className="px-3 py-2 bg-zinc-100 dark:bg-white/[0.05] border border-zinc-300 dark:border-white/[0.08] rounded-lg
                               text-xs font-semibold text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : AVAILABLE_PROVIDERS[provider.provider]?.authType === 'both' ? (
                <div className="space-y-3">
                  {error && (
                    <div className="text-[10px] text-red-500">{error}</div>
                  )}
                  
                  {!provider.connected && (
                    <>
                      <div className="text-[10px] font-semibold text-zinc-500 dark:text-white/50 uppercase tracking-wider">
                        Choose Authentication Method
                      </div>
                      
                      <button
                        onClick={() => handleOAuthConnect(provider.provider)}
                        disabled={oauthLoading}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2
                                 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg text-xs font-semibold
                                 hover:from-orange-400 hover:to-amber-400
                                 disabled:from-zinc-300 disabled:to-zinc-300 dark:disabled:from-white/10 dark:disabled:to-white/10 disabled:text-zinc-500 dark:disabled:text-white/30 transition-all"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        {oauthLoading ? 'Connecting...' : `Connect with OAuth`}
                      </button>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-zinc-200 dark:border-white/[0.08]"></div>
                        </div>
                        <div className="relative flex justify-center text-[9px] uppercase">
                          <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 dark:text-white/40">or</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setEditingProvider(provider.provider)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2
                                 bg-zinc-100 dark:bg-white/[0.05] border border-zinc-300 dark:border-white/[0.08] rounded-lg
                                 text-xs font-semibold text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-all"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Use API Key
                      </button>
                    </>
                  )}
                  
                  {provider.connected && (
                    <div className="flex gap-2">
                      <button
                        disabled
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                                 bg-zinc-100 dark:bg-white/[0.05] border border-zinc-300 dark:border-white/[0.08] rounded-lg text-xs font-semibold text-zinc-500 dark:text-white/40"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        Connected
                      </button>
                    </div>
                  )}

                  {provider.connected && provider.provider === 'anthropic' && (
                    <UsageAlerts
                      alerts={alerts}
                      onAlertsChange={onAlertsChange}
                      notificationsEnabled={notificationsEnabled}
                      onToggleNotifications={onToggleNotifications}
                    />
                  )}
                </div>
              ) : provider.provider === 'openai' ? (
                <div className="space-y-3">
                  {(error || provider.error) && (
                    <div className="p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg">
                      <div className="text-[10px] text-red-600 dark:text-red-400 leading-relaxed">
                        {error || provider.error}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setEditingProvider('openai')}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2
                             bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-xs font-semibold
                             hover:from-emerald-500 hover:to-teal-500 transition-all"
                  >
                    <Key className="w-3.5 h-3.5" />
                    {provider.connected ? 'Update Admin Key' : 'Add Admin Key'}
                  </button>
                  {!provider.connected && (
                    <div className="text-[9px] text-zinc-400 dark:text-white/30 text-center leading-relaxed">
                      Requires Admin API key from platform.openai.com/settings with organization usage permissions
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setEditingProvider(provider.provider)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2
                           bg-zinc-100 dark:bg-white/[0.05] border border-zinc-300 dark:border-white/[0.08] rounded-lg
                           text-xs font-semibold text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-all"
                >
                  <Key className="w-3.5 h-3.5" />
                  {provider.connected ? 'Update Key' : 'Add Key'}
                </button>
              )}
            </GlassCard>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <div className="text-xs font-semibold text-zinc-500 dark:text-white/40 uppercase tracking-wider mb-3">
            Preferences
          </div>

          <GlassCard className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <HalfMoon className="w-4 h-4 text-zinc-400 dark:text-white/40" />
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-900 dark:text-white">Appearance</div>
                <div className="text-[10px] text-zinc-500 dark:text-white/40">Light, dark, or sync with system</div>
              </div>
              <select
                value={preference}
                onChange={(e) => setPreference(e.target.value as 'system' | 'light' | 'dark')}
                className={selectClass}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div className="border-t border-zinc-200 dark:border-white/[0.05] pt-4 flex items-center gap-3">
              <Timer className="w-4 h-4 text-zinc-400 dark:text-white/40" />
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-900 dark:text-white">Refresh Interval</div>
                <div className="text-[10px] text-zinc-500 dark:text-white/40">How often to check usage</div>
              </div>
              <select
                value={pollingInterval}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPollingInterval(val);
                  savePollingInterval(val);
                }}
                className={selectClass}
              >
                <option value={30}>30s</option>
                <option value={60}>1 min</option>
                <option value={120}>2 min</option>
                <option value={300}>5 min</option>
              </select>
            </div>
          </GlassCard>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-white/[0.05]">
          <div className="text-[10px] text-zinc-400 dark:text-white/30 text-center">
            API keys are stored securely in your system keychain
          </div>
        </div>
      </div>
    </div>
  );
}
