import React from 'react';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { CashFlowReport } from '../../types/index.js';

interface CashFlowChartProps {
  report: CashFlowReport;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ report }) => {
  const { openingBalance, inflows, outflows, netCashFlow, closingBalance, isReconciled } = report;

  // Max calculation for bar scaling
  const maxVal = Math.max(
    Math.abs(openingBalance),
    inflows.totalInflow,
    outflows.totalOutflow,
    Math.abs(closingBalance),
    1
  );

  const getBarHeight = (val: number) => {
    return Math.min(100, Math.max(12, (Math.abs(val) / maxVal) * 100));
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">
            Authoritative Cash Flow Statement
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Formula Invariant: Opening Balance (৳{openingBalance.toFixed(2)}) + Inflows (৳{inflows.totalInflow.toFixed(2)}) - Outflows (৳{outflows.totalOutflow.toFixed(2)}) = Closing Balance (৳{closingBalance.toFixed(2)})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isReconciled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Fully Reconciled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600" /> Discrepancy Found
            </span>
          )}
        </div>
      </div>

      {/* Visual Waterfall/Flow Diagram */}
      <div className="py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Opening */}
        <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between">
          <span className="text-xs font-medium text-neutral-500">1. Opening Balance</span>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-neutral-800 dark:text-neutral-100">
              ৳{openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-neutral-400 mt-1">Carried forward from prior period</p>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-neutral-500 h-full rounded-full"
              style={{ width: `${getBarHeight(openingBalance)}%` }}
            />
          </div>
        </div>

        {/* Total Inflows */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">2. Total Inflows</span>
            <ArrowDownRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
              +৳{inflows.totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">Bazar, advances & payments</p>
          </div>
          <div className="w-full bg-emerald-200/60 dark:bg-emerald-900/40 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${getBarHeight(inflows.totalInflow)}%` }}
            />
          </div>
        </div>

        {/* Total Outflows */}
        <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-700 dark:text-rose-400">3. Total Outflows</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-rose-700 dark:text-rose-300">
              -৳{outflows.totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-1">Market, bills & salaries</p>
          </div>
          <div className="w-full bg-rose-200/60 dark:bg-rose-900/40 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full"
              style={{ width: `${getBarHeight(outflows.totalOutflow)}%` }}
            />
          </div>
        </div>

        {/* Closing Balance */}
        <div className="bg-primary-50/40 dark:bg-primary-950/20 p-4 rounded-xl border border-primary-200/60 dark:border-primary-900/40 flex flex-col justify-between">
          <span className="text-xs font-medium text-primary-700 dark:text-primary-300">4. Closing Balance</span>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-primary-800 dark:text-primary-200">
              ৳{closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-primary-600/80 dark:text-primary-400 mt-1">
              Net Shift: {netCashFlow >= 0 ? '+' : ''}৳{netCashFlow.toFixed(2)}
            </p>
          </div>
          <div className="w-full bg-primary-200/60 dark:bg-primary-900/40 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-primary-600 h-full rounded-full"
              style={{ width: `${getBarHeight(closingBalance)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Detailed Inflow / Outflow Breakdown Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-6 border-t border-neutral-100 dark:border-neutral-800">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3 flex items-center justify-between">
            <span>Inflow Components</span>
            <span className="font-mono">৳{inflows.totalInflow.toFixed(2)}</span>
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-xs">
              <span className="text-neutral-600 dark:text-neutral-300">Bazar Cash Contributions</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                ৳{inflows.bazarContributions.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-xs">
              <span className="text-neutral-600 dark:text-neutral-300">Advance Rent & Utility Deposits</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                ৳{inflows.advanceDeposits.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-xs">
              <span className="text-neutral-600 dark:text-neutral-300">Settlement Debt Collections</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                ৳{inflows.settlementPayments.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-3 flex items-center justify-between">
            <span>Outflow Allocation</span>
            <span className="font-mono">৳{outflows.totalOutflow.toFixed(2)}</span>
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-xs">
              <span className="text-neutral-600 dark:text-neutral-300">Bazar Market Expenditures</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                ৳{outflows.market.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-xs">
              <span className="text-neutral-600 dark:text-neutral-300">Flat / Apartment Rent Paid</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                ৳{outflows.rent.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-xs">
              <span className="text-neutral-600 dark:text-neutral-300">Utilities (Electricity, Gas, WiFi, Water)</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                ৳{outflows.utilities.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-xs">
              <span className="text-neutral-600 dark:text-neutral-300">Staff Salaries (Maid / Cook)</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                ৳{outflows.salary.toFixed(2)}
              </span>
            </div>
            {outflows.other > 0 && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-xs">
                <span className="text-neutral-600 dark:text-neutral-300">Other Miscellaneous Expenses</span>
                <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                  ৳{outflows.other.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
