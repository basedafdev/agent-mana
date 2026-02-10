import { Clock, GraphDown, Flash } from 'iconoir-react';
import GlassCard from './GlassCard';

export default function DowntimeAnalysis() {
  const skeletonBarHeights = [35, 20, 15, 10, 8, 12, 25, 55, 80, 70, 60, 50, 45, 55, 65, 75, 85, 90, 70, 55, 40, 30, 25, 38];

  return (
    <GlassCard className="p-5 space-y-4 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] tracking-wider uppercase">
          Downtime Analysis
        </h3>
        <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-white/[0.08] text-[10px] font-semibold text-zinc-500 dark:text-white/40">
          Coming Soon
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 opacity-40 pointer-events-none select-none">
        <div className="p-3 rounded-xl bg-zinc-100 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.05]">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-1">
            <GraphDown className="w-3 h-3" />
            <span className="text-xs font-medium">Low</span>
          </div>
          <div className="h-5 w-8 rounded bg-zinc-200 dark:bg-white/[0.06] animate-pulse" />
          <div className="text-xs text-[var(--text-muted)] mt-1">hours</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-100 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.05]">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-1">
            <Flash className="w-3 h-3" />
            <span className="text-xs font-medium">Peak</span>
          </div>
          <div className="h-5 w-6 rounded bg-zinc-200 dark:bg-white/[0.06] animate-pulse" />
          <div className="text-xs text-[var(--text-muted)] mt-1">hours</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-100 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.05]">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-medium">Avg</span>
          </div>
          <div className="h-5 w-10 rounded bg-zinc-200 dark:bg-white/[0.06] animate-pulse" />
          <div className="text-xs text-[var(--text-muted)] mt-1">req/hr</div>
        </div>
      </div>

      <div className="pt-2 opacity-30 pointer-events-none select-none">
        <div className="flex items-end gap-[3px] h-[120px] px-8">
          {skeletonBarHeights.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-zinc-300 dark:bg-white/[0.08] animate-pulse"
              style={{
                height: `${h}%`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between px-8 mt-1">
          <span className="text-[9px] text-[var(--text-muted)]">0:00</span>
          <span className="text-[9px] text-[var(--text-muted)]">6:00</span>
          <span className="text-[9px] text-[var(--text-muted)]">12:00</span>
          <span className="text-[9px] text-[var(--text-muted)]">18:00</span>
        </div>
      </div>
    </GlassCard>
  );
}
