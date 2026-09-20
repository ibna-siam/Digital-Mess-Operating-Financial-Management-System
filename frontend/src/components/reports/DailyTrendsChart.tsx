import React, { useState } from 'react';
import { Utensils, ShoppingBag, Calendar } from 'lucide-react';
import { DailyTrendsReport, DailyTrendItem } from '../../types/index.js';

interface DailyTrendsChartProps {
  report: DailyTrendsReport;
}

export const DailyTrendsChart: React.FC<DailyTrendsChartProps> = ({ report }) => {
  const [hoveredDay, setHoveredDay] = useState<DailyTrendItem | null>(null);

  const { days, summary } = report;

  if (!days || days.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 text-center text-xs text-neutral-400">
        No daily records available for this month.
      </div>
    );
  }

  const maxExpense = Math.max(...days.map((d) => d.totalExpense), 100);
  const maxMeals = Math.max(...days.map((d) => d.meals), 10);

  const chartHeight = 160;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
            Daily Activity Rhythms: Meals Consumed vs Market Expenses
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Temporal distribution of daily food preparation and procurement outflows
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-500/80" />
            <span className="text-neutral-600 dark:text-neutral-300">Market Expense (৳)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-neutral-600 dark:text-neutral-300">Meal Count</span>
          </div>
        </div>
      </div>

      {/* Highlights summary pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
          <Calendar className="w-4 h-4 text-neutral-500 shrink-0" />
          <div>
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Active Days</span>
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {summary.totalDaysWithActivity} recorded days
            </span>
          </div>
        </div>

        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3">
          <Utensils className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="text-[10px] text-emerald-600/80 uppercase tracking-wider block">Peak Meals Day</span>
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              {summary.peakMealCount} meals {summary.peakMealDate ? `(${summary.peakMealDate.slice(5)})` : ''}
            </span>
          </div>
        </div>

        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-center gap-3">
          <ShoppingBag className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="text-[10px] text-amber-600/80 uppercase tracking-wider block">Peak Market Bazar</span>
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              ৳{summary.peakMarketExpense.toLocaleString()} {summary.peakMarketDate ? `(${summary.peakMarketDate.slice(5)})` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Bar & Trend Graph */}
      <div className="relative">
        <div
          className="flex items-end gap-1.5 sm:gap-2 h-44 w-full pt-4 pb-6 overflow-x-auto"
          onMouseLeave={() => setHoveredDay(null)}
        >
          {days.map((day) => {
            const barHeightPct = Math.max(4, (day.totalExpense / maxExpense) * 100);
            const mealDotBottom = Math.max(8, (day.meals / maxMeals) * chartHeight);
            const dayNum = day.date.split('-')[2] || day.date;
            const isHovered = hoveredDay?.date === day.date;

            return (
              <div
                key={day.date}
                className="flex-1 min-w-[20px] max-w-[40px] flex flex-col items-center h-full relative cursor-pointer group"
                onMouseEnter={() => setHoveredDay(day)}
              >
                {/* Meal Count Indicator Dot */}
                <div
                  className={`absolute z-10 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-neutral-900 transition-all ${
                    day.meals > 0 ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
                  } ${isHovered ? 'scale-150 ring-2 ring-emerald-300' : ''}`}
                  style={{ bottom: `${mealDotBottom + 20}px` }}
                />

                {/* Market Expense Bar */}
                <div className="w-full flex-1 flex items-end justify-center">
                  <div
                    className={`w-full rounded-t-sm transition-all ${
                      isHovered
                        ? 'bg-amber-500'
                        : 'bg-amber-400/80 dark:bg-amber-500/70 hover:bg-amber-500'
                    }`}
                    style={{ height: `${barHeightPct}%` }}
                  />
                </div>

                {/* Day label */}
                <span className={`text-[10px] mt-2 font-mono ${isHovered ? 'font-bold text-amber-600' : 'text-neutral-400'}`}>
                  {dayNum}
                </span>
              </div>
            );
          })}
        </div>

        {/* Floating Tooltip */}
        {hoveredDay && (
          <div className="absolute top-0 right-0 p-3 rounded-xl bg-neutral-900 text-white text-xs shadow-lg border border-neutral-700 animate-in fade-in zoom-in-95 pointer-events-none z-20">
            <span className="font-semibold block mb-1">{hoveredDay.date}</span>
            <div className="space-y-0.5 text-neutral-300 text-[11px]">
              <div className="flex items-center justify-between gap-4">
                <span>Meals Served:</span>
                <span className="font-mono font-bold text-emerald-400">{hoveredDay.meals}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Market Bazar:</span>
                <span className="font-mono font-bold text-amber-400">৳{hoveredDay.marketExpense.toFixed(2)}</span>
              </div>
              {hoveredDay.otherExpense > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span>Other Outflow:</span>
                  <span className="font-mono font-bold text-neutral-200">৳{hoveredDay.otherExpense.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
