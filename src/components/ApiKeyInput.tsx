import { useState } from 'react';
import { Eye, EyeClosed, Key, FloppyDisk } from 'iconoir-react';
import { Provider } from '../types/api';

interface ApiKeyInputProps {
  provider: Provider;
  onSave: (apiKey: string) => void;
  onCancel: () => void;
}

export default function ApiKeyInput({ provider, onSave, onCancel }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const providerName = provider === 'anthropic' ? 'Anthropic' : 'OpenAI';
  const placeholder = provider === 'anthropic' ? 'sk-ant-...' : 'sk-...';

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    await onSave(apiKey);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
      <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 w-full max-w-md space-y-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
            <Key className="w-5 h-5 text-white/60" />
          </div>
          <h2 className="text-xl font-semibold text-white">Configure {providerName}</h2>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-white/50">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-white/[0.03] border border-white/[0.08]
                       rounded-xl px-4 py-3 pr-12 font-mono text-sm 
                       focus:outline-none focus:border-white/20 focus:bg-white/[0.05]
                       text-white placeholder-white/20
                       transition-all duration-200"
              autoFocus
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 
                       text-white/30 hover:text-white/60
                       p-1.5 rounded-lg hover:bg-white/[0.05] transition-all"
            >
              {showKey ? <EyeClosed className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-white/30 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-white/40" />
            Stored securely in your system keychain
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || saving}
            className="flex-1 flex items-center justify-center gap-2 
                     bg-white text-black
                     disabled:bg-white/10 disabled:text-white/30
                     px-5 py-3 rounded-xl font-semibold
                     transition-all duration-200 hover:bg-white/90
                     disabled:hover:bg-white/10"
          >
            <FloppyDisk className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Key'}
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-3 
                     bg-white/[0.05] border border-white/[0.08]
                     hover:bg-white/[0.1]
                     rounded-xl font-semibold text-white/70 hover:text-white
                     transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
