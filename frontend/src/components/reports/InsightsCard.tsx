import React from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AnalyticalInsight } from '../../types/index.js';

interface InsightsCardProps {
  insights: AnalyticalInsight[];
}

export const InsightsCard: React.FC<InsightsCardProps> = ({ insights }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs mb-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
            Automated Factual Observations
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Data-backed financial insights derived from authoritative ledger and meal tracking
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((ins) => {
          return (
            <div
              key={ins.id}
              className="p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-neutral-200/70 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 uppercase">
                  {ins.category}
                </span>
                {ins.trend === 'UP' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {ins.deltaPercent !== undefined && `${Math.abs(ins.deltaPercent).toFixed(1)}%`}
                  </span>
                )}
                {ins.trend === 'DOWN' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <TrendingDown className="w-3.5 h-3.5" />
                    {ins.deltaPercent !== undefined && `${Math.abs(ins.deltaPercent).toFixed(1)}%`}
                  </span>
                )}
                {ins.trend === 'NEUTRAL' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500">
                    <Minus className="w-3.5 h-3.5" /> Steady
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-normal">
                {ins.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
