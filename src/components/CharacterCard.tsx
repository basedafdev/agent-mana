import PixelCharacter from './PixelCharacter';
import StatBar from './StatBar';
import GlassCard from './GlassCard';

export interface CharacterStats {
  provider: 'anthropic' | 'openai' | 'google';
  name: string;
  weeklyUtilization: number;
  weeklyResetTime?: Date;
  periodUtilization: number;
  periodResetTime?: Date;
  periodName: string;
  connected: boolean;
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
              <span className="text-[8px] font-bold text-white/40 bg-black/60 px-1">OFF</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white/40 mb-2">{stats.name}</div>
            <div className="text-[10px] text-white/30">Not configured</div>
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
          <div className="text-sm font-bold text-white">{stats.name}</div>
          
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
          
          <div className="flex items-center justify-between text-[9px] text-white/30 pt-1">
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
