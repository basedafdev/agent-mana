import { useState } from 'react';
import { Bell, FloppyDisk } from 'iconoir-react';
import { NotificationThreshold, Provider } from '../types/api';

interface ThresholdConfigProps {
  provider: Provider;
  currentThreshold?: NotificationThreshold;
  onSave: (threshold: NotificationThreshold) => void;
  onCancel: () => void;
}

export default function ThresholdConfig({ provider, currentThreshold, onSave, onCancel }: ThresholdConfigProps) {
  const [enabled, setEnabled] = useState(currentThreshold?.enabled ?? true);
  const [tokenLimit, setTokenLimit] = useState(currentThreshold?.token_limit?.toString() ?? '');
  const [costLimit, setCostLimit] = useState(currentThreshold?.cost_limit?.toString() ?? '');
  const [rateLimitPct, setRateLimitPct] = useState(currentThreshold?.rate_limit_percentage?.toString() ?? '80');
  const [periodThreshold, setPeriodThreshold] = useState(currentThreshold?.period_utilization_threshold?.toString() ?? '80');
  const [weeklyThreshold, setWeeklyThreshold] = useState(currentThreshold?.weekly_utilization_threshold?.toString() ?? '80');

  const providerName = provider === 'anthropic' ? 'Anthropic' : 'OpenAI';
  const isAnthropic = provider === 'anthropic';

  const handleSave = () => {
    onSave({
      provider,
      enabled,
      token_limit: tokenLimit ? parseInt(tokenLimit) : undefined,
      cost_limit: costLimit ? parseFloat(costLimit) : undefined,
      rate_limit_percentage: rateLimitPct ? parseInt(rateLimitPct) : undefined,
      period_utilization_threshold: periodThreshold ? parseFloat(periodThreshold) : undefined,
      weekly_utilization_threshold: weeklyThreshold ? parseFloat(weeklyThreshold) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
      <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 w-full max-w-md space-y-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
            <Bell className="w-5 h-5 text-white/60" />
          </div>
          <h2 className="text-xl font-semibold text-white">{providerName} Notifications</h2>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-white/50">Enable notifications</span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`w-11 h-6 rounded-full transition-all duration-200 ${enabled ? 'bg-white' : 'bg-white/10'}`}
          >
            <div className={`w-4 h-4 rounded-full transition-all duration-200 ${enabled ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white/40'}`} />
          </button>
        </div>

        {enabled && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/50">Token Limit</label>
              <input
                type="number"
                value={tokenLimit}
                onChange={(e) => setTokenLimit(e.target.value)}
                placeholder="e.g., 1000000"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 font-mono text-sm 
                         focus:outline-none focus:border-white/20 focus:bg-white/[0.05]
                         text-white placeholder-white/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/50">Cost Limit (USD)</label>
              <input
                type="number"
                step="0.01"
                value={costLimit}
                onChange={(e) => setCostLimit(e.target.value)}
                placeholder="e.g., 50.00"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 font-mono text-sm 
                         focus:outline-none focus:border-white/20 focus:bg-white/[0.05]
                         text-white placeholder-white/20 transition-all"
              />
            </div>

            {!isAnthropic && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/50">Rate Limit Warning (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rateLimitPct}
                  onChange={(e) => setRateLimitPct(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 font-mono text-sm 
                           focus:outline-none focus:border-white/20 focus:bg-white/[0.05]
                           text-white placeholder-white/20 transition-all"
                />
                <p className="text-xs text-white/30">
                  Alert when API rate limit drops below this percentage
                </p>
              </div>
            )}

            {isAnthropic && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/50">5-Hour Usage Alert (%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={periodThreshold}
                    onChange={(e) => setPeriodThreshold(e.target.value)}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-xs text-white/30">
                    <span>0%</span>
                    <span className="text-amber-400 font-mono">{periodThreshold}%</span>
                    <span>100%</span>
                  </div>
                  <p className="text-xs text-white/30">
                    Alert when 5-hour utilization reaches this level
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/50">Weekly Usage Alert (%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weeklyThreshold}
                    onChange={(e) => setWeeklyThreshold(e.target.value)}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-white/30">
                    <span>0%</span>
                    <span className="text-purple-400 font-mono">{weeklyThreshold}%</span>
                    <span>100%</span>
                  </div>
                  <p className="text-xs text-white/30">
                    Alert when weekly utilization reaches this level
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 
                     bg-white text-black
                     px-5 py-3 rounded-xl font-semibold
                     transition-all duration-200 hover:bg-white/90"
          >
            <FloppyDisk className="w-4 h-4" />
            Save
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
