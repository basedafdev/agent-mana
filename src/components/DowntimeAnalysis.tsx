import { Clock, GraphDown, Flash } from 'iconoir-react';
import GlassCard from './GlassCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HourlyUsage {
  hour: number;
  requests: number;
  tokens: number;
}

interface DowntimeAnalysisProps {
  data: HourlyUsage[];
  provider: string;
}

export default function DowntimeAnalysis({ data, provider }: DowntimeAnalysisProps) {
  const avgUsage = data.reduce((sum, d) => sum + d.requests, 0) / data.length;
  const downtimeHours = data.filter(d => d.requests < avgUsage * 0.3);
  const peakHours = data.filter(d => d.requests > avgUsage * 1.5);

  const getBarOpacity = (requests: number) => {
    if (requests < avgUsage * 0.3) return 0.3;
    if (requests > avgUsage * 1.5) return 1;
    return 0.6;
  };

  const providerName = provider === 'anthropic' ? 'Claude' : 'GPT';

  return (
    <GlassCard className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] tracking-wider uppercase">
          Downtime Analysis
        </h3>
        <div className="text-xs font-medium text-[var(--text-muted)]">
          Last 24 Hours
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-zinc-100 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.05]">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-1">
            <GraphDown className="w-3 h-3" />
            <span className="text-xs font-medium">Low</span>
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)]">
            {downtimeHours.length}
          </div>
          <div className="text-xs text-[var(--text-muted)]">hours</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-100 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.05]">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-1">
            <Flash className="w-3 h-3" />
            <span className="text-xs font-medium">Peak</span>
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)]">
            {peakHours.length}
          </div>
          <div className="text-xs text-[var(--text-muted)]">hours</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-100 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.05]">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-medium">Avg</span>
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)]">
            {avgUsage.toFixed(0)}
          </div>
          <div className="text-xs text-[var(--text-muted)]">req/hr</div>
        </div>
      </div>

      <div className="pt-2">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data} barCategoryGap="15%">
            <CartesianGrid 
              strokeDasharray="3 3" 
              className="stroke-zinc-200 dark:stroke-white/[0.03]"
              vertical={false}
            />
            <XAxis
              dataKey="hour"
              className="fill-zinc-400 dark:fill-white/20"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              tickFormatter={(hour) => hour % 6 === 0 ? `${hour}:00` : ''}
            />
            <YAxis 
              className="fill-zinc-400 dark:fill-white/20"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(39, 39, 42, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.75rem',
                fontSize: '0.75rem',
                padding: '8px 12px',
                color: 'white'
              }}
              cursor={{ fill: 'rgba(0,0,0,0.02)' }}
              labelFormatter={(hour) => `${hour}:00 - ${Number(hour) + 1}:00`}
              formatter={(value: number | undefined) => value ? [`${value} requests`, 'Usage'] : ['0 requests', 'Usage']}
            />
            <Bar dataKey="requests" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  className="fill-zinc-600 dark:fill-white" 
                  opacity={getBarOpacity(entry.requests)} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {downtimeHours.length > 0 && (
        <div className="pt-3 border-t border-zinc-200 dark:border-white/[0.05]">
          <div className="text-xs font-medium text-[var(--text-muted)] mb-2">
            Optimal Windows for {providerName}
          </div>
          <div className="flex flex-wrap gap-2">
            {downtimeHours.slice(0, 6).map((hour) => (
              <div
                key={hour.hour}
                className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.08] text-xs font-medium text-[var(--text-secondary)]"
              >
                {hour.hour}:00
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
