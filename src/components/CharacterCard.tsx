import PixelCharacter from './PixelCharacter';
import StatBar from './StatBar';
import GlassCard from './GlassCard';
import { ProviderId } from '../types/providers';

export interface CodexUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
}

export interface CharacterStats {
  provider: ProviderId;
  name: string;
  weeklyUtilization: number;
  weeklyResetTime?: Date;
  periodUtilization: number;
  periodResetTime?: Date;
  periodName: string;
  connected: boolean;
  codexUsage?: CodexUsage;
}

interface CharacterCardProps {
  stats: CharacterStats;
}

export default function CharacterCard({ stats }: CharacterCardProps) {
  const weeklyRemaining = 100 - stats.weeklyUtilization;
  const periodRemaining = 100 - stats.periodUtilization;
  const isLow = weeklyRemaining < 25 || periodRemaining < 25;

  if (!stats.connected) {
    return (
      <GlassCard className="p-4 opacity-40">
        <div className="flex items-center gap-4">
          <div className="relative">
            <PixelCharacter provider={stats.provider} size={48} isLow={true} isActive={false} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[8px] font-bold text-[var(--text-muted)] bg-[var(--bg-card)] px-1">OFF</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-[var(--text-muted)] mb-2">{stats.name}</div>
            <div className="text-[10px] text-[var(--text-muted)]">Not configured</div>
          </div>
        </div>
      </GlassCard>
    );
  }

  if (stats.codexUsage) {
    const { inputTokens, outputTokens, totalTokens, totalCost, totalRequests } = stats.codexUsage;
    const formatNumber = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toString();
    
    return (
      <GlassCard hover className="p-4 relative overflow-hidden">
        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0">
            <PixelCharacter provider={stats.provider} size={56} isLow={false} isActive={true} />
          </div>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-[var(--text-primary)]">{stats.name}</div>
              <div className="text-[10px] font-mono text-emerald-500 font-bold">${totalCost.toFixed(2)}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-emerald-500/10 rounded-lg px-2 py-1.5">
                <div className="text-emerald-400 font-semibold text-[9px] uppercase">Input</div>
                <div className="text-[var(--text-primary)] font-mono font-bold">{formatNumber(inputTokens)}</div>
              </div>
              <div className="bg-teal-500/10 rounded-lg px-2 py-1.5">
                <div className="text-teal-400 font-semibold text-[9px] uppercase">Output</div>
                <div className="text-[var(--text-primary)] font-mono font-bold">{formatNumber(outputTokens)}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] pt-1">
              <span className="font-mono">{formatNumber(totalTokens)} tokens</span>
              <span className="font-mono">{formatNumber(totalRequests)} requests</span>
            </div>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard hover className="p-4 relative overflow-hidden">
      <div className="relative flex items-start gap-4">
        <div className="flex-shrink-0">
          <PixelCharacter provider={stats.provider} size={56} isLow={isLow} isActive={true} />
        </div>
        
        <div className="flex-1 min-w-0 space-y-2">
          <div className="text-sm font-bold text-[var(--text-primary)]">{stats.name}</div>
          
          <StatBar
            type="hp"
            utilization={stats.weeklyUtilization}
            label="WEEKLY"
            resetTime={stats.weeklyResetTime}
          />
          
          <StatBar
            type="mp"
            utilization={stats.periodUtilization}
            label={stats.periodName}
            resetTime={stats.periodResetTime}
          />
          
          <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] pt-1">
            <span className="font-mono">
              {Math.round(weeklyRemaining)}% remaining
            </span>
            <span className="font-mono">
              {Math.round(periodRemaining)}% remaining
            </span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
