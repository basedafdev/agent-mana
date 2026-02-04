import { Activity, WarningCircle, GraphUp, Sparks } from 'iconoir-react';
import { ProviderStatus } from '../types/api';
import RateLimitIndicator from './RateLimitIndicator';
import CostDisplay from './CostDisplay';
import GlassCard from './GlassCard';

interface ProviderCardProps {
  status: ProviderStatus;
  onConfigure: () => void;
}

export default function ProviderCard({ status, onConfigure }: ProviderCardProps) {
  const providerName = status.provider === 'anthropic' ? 'Anthropic' : 'OpenAI';

  return (
    <GlassCard hover className="p-5 space-y-4 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${status.connected ? 'bg-white' : 'bg-white/30'}`} />
            {status.connected && (
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-white animate-ping opacity-50" />
            )}
          </div>
          <h3 className="font-semibold text-lg text-white">
            {providerName}
          </h3>
        </div>
        <button
          onClick={onConfigure}
          className="px-3 py-1.5 text-xs font-medium rounded-lg
                     bg-white/[0.05] border border-white/[0.08]
                     hover:bg-white/[0.1] hover:border-white/[0.15]
                     transition-all duration-200
                     text-white/70 hover:text-white"
        >
          <Sparks className="w-3 h-3 inline mr-1.5 opacity-50" />
          Configure
        </button>
      </div>

      {status.error && (
        <div className="flex items-center gap-2 text-xs text-white/50
                        bg-white/[0.03] backdrop-blur-sm p-3 rounded-xl 
                        border border-white/[0.05]">
          <WarningCircle className="w-4 h-4 flex-shrink-0 opacity-50" />
          <span className="font-medium">{status.error}</span>
        </div>
      )}

      {status.connected && status.usage && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="text-white/40 text-xs font-medium flex items-center gap-1.5 mb-1">
                <Activity className="w-3 h-3" />
                Input
              </div>
              <div className="font-mono font-semibold text-lg text-white">
                {status.usage.input_tokens.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="text-white/40 text-xs font-medium flex items-center gap-1.5 mb-1">
                <GraphUp className="w-3 h-3" />
                Output
              </div>
              <div className="font-mono font-semibold text-lg text-white">
                {status.usage.output_tokens.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.05]">
            <div className="text-white/40 text-xs font-medium mb-1">Total Tokens</div>
            <div className="font-mono text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              {status.usage.total_tokens.toLocaleString()}
            </div>
          </div>

          {status.billing && <CostDisplay billing={status.billing} />}
          
          {status.rate_limit && (
            <RateLimitIndicator rateLimit={status.rate_limit} />
          )}
        </>
      )}

      {!status.connected && (
        <div className="text-center py-8 text-white/30 text-sm font-medium">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
            <Sparks className="w-5 h-5 text-white/20" />
          </div>
          Configure API key to start monitoring
        </div>
      )}
    </GlassCard>
  );
}
