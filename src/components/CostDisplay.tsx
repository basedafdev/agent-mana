import { Dollar } from 'iconoir-react';
import { BillingInfo } from '../types/api';

interface CostDisplayProps {
  billing: BillingInfo;
}

export default function CostDisplay({ billing }: CostDisplayProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
      <div className="flex items-center gap-2 text-white/40 text-xs font-medium">
        <div className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center">
          <Dollar className="w-3.5 h-3.5" />
        </div>
        <span>Cost</span>
      </div>
      <div className="font-mono font-semibold text-white">
        ${billing.amount.toFixed(4)} <span className="text-white/40 text-xs">{billing.currency.toUpperCase()}</span>
      </div>
    </div>
  );
}
