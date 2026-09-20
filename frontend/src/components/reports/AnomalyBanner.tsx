import React from 'react';
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';
import { FinancialAnomaly } from '../../types/index.js';

interface AnomalyBannerProps {
  anomalies: FinancialAnomaly[];
}

export const AnomalyBanner: React.FC<AnomalyBannerProps> = ({ anomalies }) => {
  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-800 dark:text-emerald-300 mb-6">
        <ShieldAlert className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div>
          <h4 className="font-semibold text-sm">No Financial Anomalies Detected</h4>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
            All transaction amounts, member balances, and expenditure variances remain within expected parameters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
          Financial Intelligence Flags ({anomalies.length} Items Require Review)
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {anomalies.map((a) => {
          const isHigh = a.severity === 'HIGH';
          const isMed = a.severity === 'MEDIUM';

          const bgClass = isHigh
            ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200'
            : isMed
            ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
            : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-200';

          const badgeClass = isHigh
            ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
            : isMed
            ? 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
            : 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200';

          return (
            <div
              key={a.id}
              className={`p-4 border rounded-xl flex items-start gap-3 transition-all ${bgClass}`}
            >
              {isHigh ? (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm">{a.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeClass}`}>
                    {a.severity}
                  </span>
                </div>
                <p className="text-xs opacity-90 leading-relaxed">{a.description}</p>
                {a.amount !== undefined && (
                  <div className="mt-2 text-xs font-mono font-medium">
                    Flagged Amount: ৳{a.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
