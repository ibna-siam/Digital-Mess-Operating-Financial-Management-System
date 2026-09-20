import React, { useState } from 'react';

interface ExpenseItem {
  category: string;
  amount: number;
  percentage: number;
}

interface ExpenseDonutChartProps {
  data: ExpenseItem[];
  totalAmount: number;
  title?: string;
}

const PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#64748b', // slate
];

export const ExpenseDonutChart: React.FC<ExpenseDonutChartProps> = ({
  data,
  totalAmount,
  title = 'Expense Distribution by Category',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0 || totalAmount <= 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[280px]">
        <p className="text-xs text-neutral-400">No category expenditure recorded for this period.</p>
      </div>
    );
  }

  // Calculate SVG arc paths
  const radius = 70;
  const strokeWidth = 24;
  const center = 100;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm mb-4">
        {title}
      </h3>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-auto">
        {/* SVG Donut */}
        <div className="relative w-48 h-48 shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
            {/* Background ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-neutral-100 dark:text-neutral-800"
            />
            {data.map((item, idx) => {
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.percentage;
              const color = PALETTE[idx % PALETTE.length];
              const isHovered = hoveredIdx === idx;

              return (
                <circle
                  key={item.category}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              {hoveredIdx !== null ? data[hoveredIdx].category : 'Total'}
            </span>
            <span className="text-base font-bold font-mono text-neutral-900 dark:text-neutral-100">
              ৳{hoveredIdx !== null ? data[hoveredIdx].amount.toLocaleString() : totalAmount.toLocaleString()}
            </span>
            <span className="text-[10px] text-neutral-400">
              {hoveredIdx !== null ? `${data[hoveredIdx].percentage.toFixed(1)}%` : '100% share'}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2">
          {data.map((item, idx) => {
            const color = PALETTE[idx % PALETTE.length];
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={item.category}
                className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                  isHovered
                    ? 'bg-neutral-100 dark:bg-neutral-800'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    {item.category}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-neutral-900 dark:text-neutral-100">
                    ৳{item.amount.toLocaleString()}
                  </span>
                  <span className="text-neutral-400 w-10 text-right font-medium">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
