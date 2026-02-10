import { useState } from 'react';
import { Bell, Plus, Trash, WarningTriangle } from 'iconoir-react';
import { UsageAlert } from '../types/api';
import GlassCard from './GlassCard';

interface UsageAlertsProps {
  alerts: UsageAlert[];
  onAlertsChange: (alerts: UsageAlert[]) => void;
  notificationsEnabled: boolean;
  onToggleNotifications: (enabled: boolean) => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function UsageAlerts({
  alerts,
  onAlertsChange,
  notificationsEnabled,
  onToggleNotifications,
}: UsageAlertsProps) {
  const [addingType, setAddingType] = useState<'period' | 'weekly' | null>(null);
  const [newThreshold, setNewThreshold] = useState(80);
  const [newLabel, setNewLabel] = useState('');

  const handleAdd = () => {
    if (!addingType) return;
    const alert: UsageAlert = {
      id: generateId(),
      type: addingType,
      threshold: newThreshold,
      enabled: true,
      label: newLabel.trim() || undefined,
    };
    onAlertsChange([...alerts, alert]);
    setAddingType(null);
    setNewThreshold(80);
    setNewLabel('');
  };

  const handleRemove = (id: string) => {
    onAlertsChange(alerts.filter(a => a.id !== id));
  };

  const handleToggle = (id: string) => {
    onAlertsChange(alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const periodAlerts = alerts.filter(a => a.type === 'period');
  const weeklyAlerts = alerts.filter(a => a.type === 'weekly');

  return (
    <div className="border-t border-zinc-200 dark:border-white/[0.05] pt-3 mt-3">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-3.5 h-3.5 text-zinc-400 dark:text-white/40" />
        <span className="text-xs font-medium text-zinc-700 dark:text-white/70">Usage Alerts</span>
        <div className="flex-1" />
        <button
          onClick={() => onToggleNotifications(!notificationsEnabled)}
          className={`w-9 h-5 rounded-full transition-colors ${
            notificationsEnabled ? 'bg-green-500' : 'bg-zinc-300 dark:bg-white/20'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white transition-transform mx-0.5 ${
              notificationsEnabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {notificationsEnabled && (
        <div className="space-y-3">
          {periodAlerts.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[9px] font-semibold text-zinc-400 dark:text-white/30 uppercase tracking-widest">
                5-Hour Limit
              </div>
              {periodAlerts.map(alert => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  accentColor="blue"
                  onToggle={() => handleToggle(alert.id)}
                  onRemove={() => handleRemove(alert.id)}
                />
              ))}
            </div>
          )}

          {weeklyAlerts.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[9px] font-semibold text-zinc-400 dark:text-white/30 uppercase tracking-widest">
                Weekly Limit
              </div>
              {weeklyAlerts.map(alert => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  accentColor="green"
                  onToggle={() => handleToggle(alert.id)}
                  onRemove={() => handleRemove(alert.id)}
                />
              ))}
            </div>
          )}

          {alerts.length === 0 && (
            <div className="text-[10px] text-zinc-400 dark:text-white/30 text-center py-2">
              No alerts configured yet
            </div>
          )}

          {addingType ? (
            <GlassCard className="p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-white/70">
                  New {addingType === 'period' ? '5-Hour' : 'Weekly'} Alert
                </span>
                <button
                  onClick={() => { setAddingType(null); setNewLabel(''); setNewThreshold(80); }}
                  className="text-[10px] text-zinc-400 dark:text-white/40 hover:text-zinc-600 dark:hover:text-white/60"
                >
                  Cancel
                </button>
              </div>

              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Label (optional)"
                className="w-full bg-zinc-100 dark:bg-white/[0.03] border border-zinc-300 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5
                         text-[11px] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-white/20
                         focus:outline-none focus:border-zinc-400 dark:focus:border-white/20"
              />

              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={newThreshold}
                  onChange={e => setNewThreshold(Number(e.target.value))}
                  className={`flex-1 h-1 rounded-full appearance-none
                    ${addingType === 'period'
                      ? 'bg-zinc-300 dark:bg-white/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500'
                      : 'bg-zinc-300 dark:bg-white/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500'
                    }`}
                />
                <span className="text-[11px] font-mono text-zinc-700 dark:text-white/80 w-8 text-right">
                  {newThreshold}%
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-white/30">
                Notify when you've used {newThreshold}% of your {addingType === 'period' ? '5-hour' : 'weekly'} limit
              </p>

              <button
                onClick={handleAdd}
                className="w-full py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg text-[11px] font-semibold
                         hover:bg-zinc-700 dark:hover:bg-white/90 transition-all"
              >
                Add Alert
              </button>
            </GlassCard>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setAddingType('period')}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5
                         bg-zinc-100 dark:bg-white/[0.03] border border-zinc-300 dark:border-white/[0.08]
                         hover:bg-zinc-200 dark:hover:bg-white/[0.08] rounded-lg text-[10px] font-semibold
                         text-zinc-600 dark:text-white/60 transition-all"
              >
                <Plus className="w-3 h-3" />
                5-Hour Alert
              </button>
              <button
                onClick={() => setAddingType('weekly')}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5
                         bg-zinc-100 dark:bg-white/[0.03] border border-zinc-300 dark:border-white/[0.08]
                         hover:bg-zinc-200 dark:hover:bg-white/[0.08] rounded-lg text-[10px] font-semibold
                         text-zinc-600 dark:text-white/60 transition-all"
              >
                <Plus className="w-3 h-3" />
                Weekly Alert
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AlertRow({
  alert,
  accentColor,
  onToggle,
  onRemove,
}: {
  alert: UsageAlert;
  accentColor: 'blue' | 'green';
  onToggle: () => void;
  onRemove: () => void;
}) {
  const colors = accentColor === 'blue'
    ? { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' }
    : { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' };

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all ${
        alert.enabled
          ? `${colors.bg} border border-transparent`
          : 'bg-zinc-100/50 dark:bg-white/[0.01] border border-zinc-200 dark:border-white/[0.05] opacity-50'
      }`}
    >
      {alert.triggered && alert.enabled && (
        <WarningTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 animate-pulse" />
      )}
      {!alert.triggered && (
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${alert.enabled ? colors.dot : 'bg-zinc-400 dark:bg-white/30'}`} />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-[11px] font-mono font-bold ${alert.enabled ? colors.text : 'text-zinc-400 dark:text-white/40'}`}>
            {alert.threshold}%
          </span>
          {alert.label && (
            <span className="text-[10px] text-zinc-500 dark:text-white/40 truncate">
              {alert.label}
            </span>
          )}
        </div>
        <div className="text-[9px] text-zinc-400 dark:text-white/25 mt-0.5">
          Notify when {alert.threshold}% used
        </div>
      </div>

      <button
        onClick={onToggle}
        className={`w-7 h-4 rounded-full transition-colors flex-shrink-0 ${
          alert.enabled ? 'bg-green-500' : 'bg-zinc-300 dark:bg-white/20'
        }`}
      >
        <div
          className={`w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${
            alert.enabled ? 'translate-x-3' : 'translate-x-0'
          }`}
        />
      </button>

      <button
        onClick={onRemove}
        className="p-0.5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded transition-all text-zinc-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0"
      >
        <Trash className="w-3 h-3" />
      </button>
    </div>
  );
}
