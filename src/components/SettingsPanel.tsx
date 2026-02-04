import { useState } from 'react';
import { Xmark, Key, Eye, EyeClosed, FloppyDisk, Trash, Link as LinkIcon } from 'iconoir-react';
import { invoke } from '@tauri-apps/api/core';
import GlassCard from './GlassCard';
import PixelCharacter from './PixelCharacter';

interface ProviderConfig {
  provider: 'anthropic' | 'openai' | 'google';
  name: string;
  apiKey: string;
  connected: boolean;
  oauthConnected?: boolean;
}

interface SettingsPanelProps {
  providers: ProviderConfig[];
  onSaveKey: (provider: string, apiKey: string) => Promise<void>;
  onRemoveKey: (provider: string) => void;
  onOAuthConnect?: (provider: string) => Promise<void>;
  onClose: () => void;
}

export default function SettingsPanel({ providers, onSaveKey, onRemoveKey, onOAuthConnect, onClose }: SettingsPanelProps) {
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-50">
      <div className="backdrop-blur-2xl bg-zinc-900/95 border border-white/[0.08] rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Xmark className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Provider Configuration
          </div>
          
          {providers.map((provider) => (
            <GlassCard key={provider.provider} className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <PixelCharacter provider={provider.provider} size={32} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">{provider.name}</div>
                  <div className={`text-[10px] ${provider.connected ? 'text-green-400' : 'text-white/40'}`}>
                    {provider.connected ? '● Connected' : 'Not configured'}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${provider.connected ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-white/20'}`} />
              </div>

              {editingProvider === provider.provider ? (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Enter API key..."
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 pr-10 
                               font-mono text-xs text-white placeholder-white/20
                               focus:outline-none focus:border-white/20"
                      autoFocus
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      {showKey ? <EyeClosed className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {error && (
                    <div className="text-[10px] text-red-400 mb-2">{error}</div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(provider.provider)}
                      disabled={!apiKeyInput.trim() || saving}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                               bg-white text-black rounded-lg text-xs font-semibold
                               disabled:bg-white/10 disabled:text-white/30 transition-all"
                    >
                      <FloppyDisk className="w-3.5 h-3.5" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditingProvider(null); setApiKeyInput(''); }}
                      className="px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg
                               text-xs font-semibold text-white/60 hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : provider.provider === 'anthropic' ? (
                <div className="space-y-2">
                  {error && (
                    <div className="text-[10px] text-red-400">{error}</div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOAuthConnect('anthropic')}
                      disabled={oauthLoading || provider.connected}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                               bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg text-xs font-semibold
                               hover:from-orange-400 hover:to-amber-400
                               disabled:from-white/10 disabled:to-white/10 disabled:text-white/30 transition-all"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      {oauthLoading ? 'Connecting...' : provider.connected ? 'Connected' : 'Connect with Claude'}
                    </button>
                    {provider.connected && (
                      <button
                        onClick={() => onRemoveKey(provider.provider)}
                        className="p-2 bg-white/[0.05] border border-white/[0.08] rounded-lg
                                 text-white/40 hover:text-white hover:bg-white/[0.1] transition-all"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {!provider.connected && (
                    <div className="text-[9px] text-white/30 text-center">
                      Uses your Claude.ai account credentials
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingProvider(provider.provider)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                             bg-white/[0.05] border border-white/[0.08] rounded-lg
                             text-xs font-semibold text-white/60 hover:text-white hover:bg-white/[0.1] transition-all"
                  >
                    <Key className="w-3.5 h-3.5" />
                    {provider.connected ? 'Update Key' : 'Add Key'}
                  </button>
                  {provider.connected && (
                    <button
                      onClick={() => onRemoveKey(provider.provider)}
                      className="p-2 bg-white/[0.05] border border-white/[0.08] rounded-lg
                               text-white/40 hover:text-white hover:bg-white/[0.1] transition-all"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </GlassCard>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/[0.05]">
          <div className="text-[10px] text-white/30 text-center">
            API keys are stored securely in your system keychain
          </div>
        </div>
      </div>
    </div>
  );
}
