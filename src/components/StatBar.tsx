import { useState } from 'react';

interface StatBarProps {
  type: 'hp' | 'mp';
  utilization: number;
  label?: string;
  resetTime?: Date;
}

function formatTimeUntil(resetTime: Date): string {
  const now = new Date();
  const diffMs = resetTime.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'resetting...';
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `resets in ${diffDays}d ${diffHours % 24}h`;
  } else if (diffHours > 0) {
    return `resets in ${diffHours}h ${diffMins % 60}m`;
  } else {
    return `resets in ${diffMins}m`;
  }
}

function getHpColor(remaining: number): { gradient: string; label: string; pulse: string } {
  if (remaining >= 75) {
    return { gradient: 'from-green-400 to-emerald-600', label: 'text-green-600 dark:text-green-400/80', pulse: 'bg-green-500/20' };
  } else if (remaining >= 50) {
    return { gradient: 'from-yellow-400 to-amber-500', label: 'text-yellow-600 dark:text-yellow-400/80', pulse: 'bg-yellow-500/20' };
  } else if (remaining >= 25) {
    return { gradient: 'from-orange-400 to-orange-600', label: 'text-orange-600 dark:text-orange-400/80', pulse: 'bg-orange-500/20' };
  } else {
    return { gradient: 'from-red-400 to-red-600', label: 'text-red-600 dark:text-red-400/80', pulse: 'bg-red-500/20' };
  }
}

function getMpColor(remaining: number): { gradient: string; label: string } {
  if (remaining >= 75) {
    return { gradient: 'from-blue-500 to-indigo-600', label: 'text-blue-600 dark:text-blue-400/80' };
  } else if (remaining >= 50) {
    return { gradient: 'from-blue-400 to-blue-500', label: 'text-blue-600 dark:text-blue-400/80' };
  } else if (remaining >= 25) {
    return { gradient: 'from-sky-400 to-blue-400', label: 'text-sky-600 dark:text-sky-400/80' };
  } else {
    return { gradient: 'from-cyan-300 to-sky-400', label: 'text-cyan-600 dark:text-cyan-300/80' };
  }
}

export default function StatBar({ type, utilization, label, resetTime }: StatBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const remaining = Math.max(0, Math.min(100, 100 - utilization));
  
  const isLow = remaining < 25;

  const hpColors = getHpColor(remaining);
  const mpColors = getMpColor(remaining);
  const barGradient = type === 'hp' ? hpColors.gradient : mpColors.gradient;
  const labelColor = type === 'hp' ? hpColors.label : mpColors.label;

  return (
    <div className="space-y-1 relative">
      <div className="flex items-center justify-between text-[10px] font-bold tracking-wider">
        <span className={labelColor}>
          {label || (type === 'hp' ? 'HP' : 'MP')}
        </span>
        <span className="font-mono text-[var(--text-muted)]">
          {Math.round(remaining)}%
        </span>
      </div>
      
      <div 
        className="relative h-3 bg-zinc-200 dark:bg-black/40 border border-zinc-300 dark:border-white/10 overflow-hidden cursor-pointer"
        style={{ imageRendering: 'pixelated' }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="absolute inset-0 flex">
          {Array.from({ length: 20 }).map((_, i) => {
            const segmentPercentage = (i + 1) * 5;
            const isFilled = remaining >= segmentPercentage;
            
            return (
              <div
                key={i}
                className={`flex-1 border-r border-zinc-300 dark:border-black/30 last:border-r-0 transition-all duration-300
                  ${isFilled ? `bg-gradient-to-b ${barGradient}` : 'bg-transparent'}`}
              />
            );
          })}
        </div>
        
        {isLow && type === 'hp' && (
          <div className={`absolute inset-0 animate-pulse ${hpColors.pulse}`} />
        )}

        {showTooltip && resetTime && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 
                        bg-zinc-800 dark:bg-black/90 border border-zinc-600 dark:border-white/10 rounded text-[9px] text-white 
                        whitespace-nowrap z-10 pointer-events-none">
            {formatTimeUntil(resetTime)}
          </div>
        )}
      </div>
    </div>
  );
}
