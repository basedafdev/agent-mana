import { WarningTriangle, Clock } from 'iconoir-react';
import { RateLimitInfo } from '../types/api';

interface RateLimitIndicatorProps {
  rateLimit: RateLimitInfo;
}

export default function RateLimitIndicator({ rateLimit }: RateLimitIndicatorProps) {
  const percentage = rateLimit.limit && rateLimit.remaining
    ? (rateLimit.remaining / rateLimit.limit) * 100
    : 100;

  const isLow = percentage < 20;

  const resetTime = rateLimit.reset_at
    ? new Date(rateLimit.reset_at * 1000).toLocaleTimeString()
    : 'Unknown';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-white/40 flex items-center gap-1.5">
          {isLow && <WarningTriangle className="w-3 h-3 text-white/60" />}
          Rate Limit
        </span>
        <span className="font-mono text-white/70">
          {rateLimit.remaining?.toLocaleString() ?? '?'} / {rateLimit.limit?.toLocaleString() ?? '?'}
        </span>
      </div>
      
      <div className="relative w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-white/80 to-white/40 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {rateLimit.reset_at && (
        <div className="text-xs text-white/30 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Resets at {resetTime}
        </div>
      )}
    </div>
  );
}
