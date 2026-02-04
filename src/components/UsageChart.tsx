import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import GlassCard from './GlassCard';

interface UsageDataPoint {
  timestamp: number;
  tokens: number;
}

interface UsageChartProps {
  data: UsageDataPoint[];
}

export default function UsageChart({ data }: UsageChartProps) {
  return (
    <GlassCard className="p-5">
      <h3 className="text-xs font-semibold text-white/60 tracking-wider uppercase mb-4">
        Token Usage Over Time
      </h3>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gradient-usage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity={0.2}/>
              <stop offset="100%" stopColor="white" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255,255,255,0.03)"
            vertical={false}
          />
          <XAxis
            dataKey="timestamp"
            stroke="rgba(255,255,255,0.2)"
            fontSize={9}
            tickLine={false}
            axisLine={false}
            tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.2)"
            fontSize={9}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.75rem',
              fontSize: '0.75rem',
              padding: '8px 12px',
              color: 'white'
            }}
            labelFormatter={(ts) => new Date(ts).toLocaleString()}
            formatter={(value: number | undefined) => value ? [value.toLocaleString(), 'Tokens'] : ['0', 'Tokens']}
          />
          <Area
            type="monotone"
            dataKey="tokens"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={2}
            fill="url(#gradient-usage)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}
