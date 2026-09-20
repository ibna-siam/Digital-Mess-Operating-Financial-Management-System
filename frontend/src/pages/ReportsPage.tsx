import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Download,
  Printer,
  ShieldCheck,
  DollarSign,
  PieChart,
  Zap,
  Clock,
  Users,
  FileText,
  Receipt,
  Scale,
  Activity,
  Layers,
  Sparkles,
  ShoppingBag,
  BookOpen,
  Archive,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { PageLoader } from '../components/ui/StateComponents.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import { useSocketEvent } from '../context/SocketContext.js';
import { useDataSync } from '../hooks/useDataSync.js';
import { AnomalyBanner } from '../components/reports/AnomalyBanner.js';
import { InsightsCard } from '../components/reports/InsightsCard.js';
import { CashFlowChart } from '../components/reports/CashFlowChart.js';
import { ExpenseDonutChart } from '../components/reports/ExpenseDonutChart.js';
import { DailyTrendsChart } from '../components/reports/DailyTrendsChart.js';
import {
  MonthlyFinancialReport,
  MemberStatement,
  FoodCostReport,
  SettlementReport,
  MessMember,
  FinancialPeriod,
  ExecutiveDashboardData,
  CashFlowReport,
  CostStructureReport,
  UtilityAnalyticsReport,
  DailyTrendsReport,
  MemberComparisonReport,
} from '../types/index.js';

export type ReportTabType =
  | 'executive'
  | 'cash-flow'
  | 'cost-structure'
  | 'utilities'
  | 'daily-trends'
  | 'member-comparison'
  | 'monthly'
  | 'member'
  | 'meals'
  | 'settlement'
  | 'expenses'
  | 'fixed-bills'
  | 'bazar-summary'
  | 'ledger'
  | 'month-end';

export const ReportsPage: React.FC = () => {
  const { activeMess } = useAuth();
  const messId = activeMess?.id || 'c3a66302-28a7-48a9-bb71-f500b36e6ea0';

  const [activeTab, setActiveTab] = useState<ReportTabType>('executive');
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [members, setMembers] = useState<MessMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Phase 10 Intelligence Data states
  const [executiveData, setExecutiveData] = useState<ExecutiveDashboardData | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowReport | null>(null);
  const [costStructureData, setCostStructureData] = useState<CostStructureReport | null>(null);
  const [utilityData, setUtilityData] = useState<UtilityAnalyticsReport | null>(null);
  const [dailyTrendsData, setDailyTrendsData] = useState<DailyTrendsReport | null>(null);
  const [memberComparisonData, setMemberComparisonData] = useState<MemberComparisonReport | null>(null);

  // Phase 4 Operational Data states
  const [monthlyReport, setMonthlyReport] = useState<MonthlyFinancialReport | null>(null);
  const [memberStatement, setMemberStatement] = useState<MemberStatement | null>(null);
  const [mealReport, setMealReport] = useState<FoodCostReport | null>(null);
  const [settlementReport, setSettlementReport] = useState<SettlementReport | null>(null);
  const [periodExpenses, setPeriodExpenses] = useState<any[]>([]);

  // Phase 14 Advanced Reports states
  const [fixedBillsData, setFixedBillsData] = useState<{
    periodKey: string;
    summary: { totalAmount: number; paidAmount: number; pendingAmount: number; totalCount: number };
    bills: Array<{
      id: string;
      title: string;
      category: string;
      amount: number;
      dueDate: string;
      paidDate: string | null;
      status: string;
      paidByName: string | null;
    }>;
  } | null>(null);

  const [bazarSummaryData, setBazarSummaryData] = useState<{
    periodKey: string;
    summary: { totalCost: number; totalTrips: number; totalItems: number; averagePerTrip: number };
    shopperBreakdown: Array<{ name: string; total: number; count: number }>;
    entries: Array<{
      id: string;
      date: string;
      shopperName: string;
      totalCost: number;
      itemCount: number;
      items: Array<{ id: string; itemName: string; quantity: number; unit: string; cost: number }>;
    }>;
  } | null>(null);

  const [ledgerData, setLedgerData] = useState<{
    periodKey: string;
    summary: { totalEntries: number; totalCredits: number; totalDebits: number; netFlow: number };
    entries: Array<{
      id: string;
      effectiveDate: string;
      memberName: string;
      entryType: string;
      direction: string;
      amount: number;
      balanceAfter: number;
      description: string;
    }>;
  } | null>(null);

  const [monthEndData, setMonthEndData] = useState<{
    periodKey: string;
    status: string;
    snapshot: {
      totalMeals: number;
      mealRate: number;
      totalFoodCost: number;
      totalFixedExpenses: number;
      totalVariableExpenses: number;
      totalExpenses: number;
      totalContributions: number;
      totalAdvances: number;
      outstandingBalance: number;
      isReconciled: boolean;
      createdAt: string;
    } | null;
    liveSummary: any;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load available periods and members
  useEffect(() => {
    const initPeriods = async () => {
      try {
        const [periodList, memberList] = await Promise.all([
          apiClient<FinancialPeriod[]>(`/messes/${messId}/financial-periods`).catch(() => []),
          apiClient<MessMember[]>(`/messes/${messId}/members`).catch(() => []),
        ]);

        setPeriods(periodList);
        if (periodList.length > 0 && !periodList.find((p) => p.periodKey === selectedPeriodKey)) {
          setSelectedPeriodKey(periodList[0].periodKey);
        }

        setMembers(memberList);
        if (memberList.length > 0) {
          setSelectedMemberId(memberList[0].id);
        }
      } catch {
        // Fallback safe
      }
    };
    initPeriods();
  }, [messId]);

  // Load report data based on active tab & period
  const loadReports = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (activeTab === 'executive') {
        const data = await apiClient<ExecutiveDashboardData>(
          `/messes/${messId}/reports/executive?periodKey=${selectedPeriodKey}`
        );
        setExecutiveData(data);
      } else if (activeTab === 'cash-flow') {
        const data = await apiClient<CashFlowReport>(
          `/messes/${messId}/reports/cash-flow?periodKey=${selectedPeriodKey}`
        );
        setCashFlowData(data);
      } else if (activeTab === 'cost-structure') {
        const data = await apiClient<CostStructureReport>(
          `/messes/${messId}/reports/cost-structure?periodKey=${selectedPeriodKey}`
        );
        setCostStructureData(data);
      } else if (activeTab === 'utilities') {
        const data = await apiClient<UtilityAnalyticsReport>(
          `/messes/${messId}/reports/utilities?periodKey=${selectedPeriodKey}`
        );
        setUtilityData(data);
      } else if (activeTab === 'daily-trends') {
        const data = await apiClient<DailyTrendsReport>(
          `/messes/${messId}/reports/daily-trends?periodKey=${selectedPeriodKey}`
        );
        setDailyTrendsData(data);
      } else if (activeTab === 'member-comparison') {
        const data = await apiClient<MemberComparisonReport>(
          `/messes/${messId}/reports/member-comparison?periodKey=${selectedPeriodKey}`
        );
        setMemberComparisonData(data);
      } else if (activeTab === 'monthly') {
        const data = await apiClient<MonthlyFinancialReport>(
          `/messes/${messId}/reports/monthly?periodKey=${selectedPeriodKey}`
        );
        setMonthlyReport(data);
      } else if (activeTab === 'member') {
        if (selectedMemberId) {
          const stmt = await apiClient<MemberStatement>(
            `/messes/${messId}/reports/members/${selectedMemberId}/statement?periodKey=${selectedPeriodKey}`
          );
          setMemberStatement(stmt);
        }
      } else if (activeTab === 'meals') {
        const data = await apiClient<FoodCostReport>(
          `/messes/${messId}/reports/meals?periodKey=${selectedPeriodKey}`
        );
        setMealReport(data);
      } else if (activeTab === 'settlement') {
        const data = await apiClient<SettlementReport>(
          `/messes/${messId}/reports/settlements?periodKey=${selectedPeriodKey}`
        );
        setSettlementReport(data);
      } else if (activeTab === 'expenses') {
        const data = await apiClient<any[]>(
          `/messes/${messId}/reports/expenses?periodKey=${selectedPeriodKey}`
        );
        setPeriodExpenses(data);
      } else if (activeTab === 'fixed-bills') {
        const data = await apiClient<any>(
          `/messes/${messId}/reports/fixed-bills?periodKey=${selectedPeriodKey}`
        );
        setFixedBillsData(data);
      } else if (activeTab === 'bazar-summary') {
        const data = await apiClient<any>(
          `/messes/${messId}/reports/bazar-summary?periodKey=${selectedPeriodKey}`
        );
        setBazarSummaryData(data);
      } else if (activeTab === 'ledger') {
        const data = await apiClient<any>(
          `/messes/${messId}/reports/ledger?periodKey=${selectedPeriodKey}`
        );
        setLedgerData(data);
      } else if (activeTab === 'month-end') {
        const data = await apiClient<any>(
          `/messes/${messId}/reports/month-end?periodKey=${selectedPeriodKey}`
        );
        setMonthEndData(data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate financial report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [messId, activeTab, selectedPeriodKey, selectedMemberId]);

  // Real-time socket event subscription for report invalidation
  useSocketEvent(`mess:${messId}:reports`, () => {
    loadReports();
  });

  // Cross-view automatic synchronization
  useDataSync(['reports', 'expenses', 'meals', 'bazar', 'settlements', 'bills'], () => {
    loadReports();
  });

  // Comprehensive CSV Export for all report types
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      let exportType: string = activeTab;
      if (exportType === 'member') exportType = 'statement';

      const token = localStorage.getItem('messmate_token');
      const url = `/api/v1/messes/${messId}/reports/export?type=${exportType}&periodKey=${selectedPeriodKey}${
        exportType === 'statement' ? `&memberId=${selectedMemberId}` : ''
      }`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Failed to download CSV');

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      let filename = `messmate_${exportType}_${selectedPeriodKey}.csv`;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename="([^"]+)"/.exec(disposition);
        if (matches && matches[1]) filename = matches[1];
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="reports-page-root flex flex-col gap-5 pb-16">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-report-area, .printable-report-area * {
            visibility: visible;
          }
          .printable-report-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #ffffff !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Header & Period Switcher */}
      <div className="no-print bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 m-0">
              Financial Intelligence & Reports
            </h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Authoritative financial analytics, cash flow reconciliation, expense structures, and member statements.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <select
              value={selectedPeriodKey}
              onChange={(e) => setSelectedPeriodKey(e.target.value)}
              className="bg-transparent text-xs font-semibold text-neutral-800 dark:text-neutral-200 border-none outline-none cursor-pointer"
            >
              {periods.length > 0 ? (
                periods.map((p) => (
                  <option key={p.periodKey} value={p.periodKey} className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800">
                    {p.periodKey} ({p.status})
                  </option>
                ))
              ) : (
                <option value={selectedPeriodKey}>{selectedPeriodKey}</option>
              )}
            </select>
          </div>

          <Button
            variant="secondary"
            icon={<Printer size={15} />}
            onClick={handlePrint}
            className="text-xs py-1.5 px-3 rounded-xl"
          >
            Print
          </Button>

          <Button
            variant="primary"
            icon={<Download size={15} />}
            isLoading={isExporting}
            onClick={handleExportCsv}
            className="text-xs py-1.5 px-3 rounded-xl"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Tab Navigation Segmented Bar */}
      <div className="no-print space-y-2">
        {/* Intelligence Group */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-1 shrink-0">
            Analytics
          </span>
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-xl">
            {[
              { id: 'executive', label: 'Executive Dashboard', icon: Activity },
              { id: 'cash-flow', label: 'Cash Flow Statement', icon: Scale },
              { id: 'cost-structure', label: 'Cost Structure', icon: Layers },
              { id: 'utilities', label: 'Utility Analytics', icon: Zap },
              { id: 'daily-trends', label: 'Daily Rhythms', icon: Clock },
              { id: 'member-comparison', label: 'Member Comparison', icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ReportTabType)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Operational Statements Group */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-1 shrink-0">
            Statements
          </span>
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-xl">
            {[
              { id: 'monthly', label: 'Monthly Summary', icon: FileText },
              { id: 'member', label: 'Member Statements', icon: Users },
              { id: 'meals', label: 'Food Cost & Meals', icon: PieChart },
              { id: 'settlement', label: 'Settlements', icon: DollarSign },
              { id: 'expenses', label: 'Itemized Expenses', icon: Receipt },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ReportTabType)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Operations & Ledger Group */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-1 shrink-0">
            Operations & Ledger
          </span>
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-xl">
            {[
              { id: 'fixed-bills', label: 'Fixed Bills', icon: CheckCircle2 },
              { id: 'bazar-summary', label: 'Bazar Log Summary', icon: ShoppingBag },
              { id: 'ledger', label: 'Shared Ledger', icon: BookOpen },
              { id: 'month-end', label: 'Month-End Closing', icon: Archive },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ReportTabType)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading ? (
        <PageLoader message="Synthesizing financial intelligence..." />
      ) : errorMsg ? (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-sm">
          {errorMsg}
        </div>
      ) : (
        <div className="printable-report-area">
          {/* Print Title Header */}
          <div className="hidden print:block pb-4 mb-4 border-b border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-900 m-0">
              MessMate Financial Report — {activeMess?.name || 'Mess'}
            </h2>
            <div className="text-xs text-neutral-500 mt-1">
              Period: {selectedPeriodKey} | Report: {activeTab.toUpperCase()} | Generated: {new Date().toLocaleDateString()}
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: EXECUTIVE FINANCIAL DASHBOARD                      */}
          {/* ========================================================= */}
          {activeTab === 'executive' && executiveData && (
            <div className="space-y-6">
              {/* Anomalies Banner */}
              <AnomalyBanner anomalies={executiveData.anomalies} />

              {/* Automated Insights */}
              <InsightsCard insights={executiveData.insights} />

              {/* High-level KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">Total Income</span>
                  <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    ৳{executiveData.summary.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">Bazar + advances</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">Total Expenses</span>
                  <div className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1">
                    ৳{executiveData.summary.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">All approved costs</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">Current Cash Position</span>
                  <div className={`text-lg font-bold font-mono mt-1 ${
                    executiveData.summary.currentCashPosition >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    ৳{executiveData.summary.currentCashPosition.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">Liquid cash in pool</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">Meal Rate</span>
                  <div className="text-lg font-bold font-mono text-primary-600 dark:text-primary-400 mt-1">
                    ৳{executiveData.summary.mealRate.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    {executiveData.summary.totalMeals.toFixed(1)} meals
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">Member Due</span>
                  <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                    ৳{executiveData.summary.totalMemberDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">Receivable debt</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">Settlement Remaining</span>
                  <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                    ৳{executiveData.summary.pendingSettlementAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">Pending transfers</span>
                </div>
              </div>

              {/* Donut Chart & Category Split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ExpenseDonutChart
                  data={executiveData.expenseBreakdown}
                  totalAmount={executiveData.summary.totalExpenses}
                  title="Operating Expenditure Breakdown"
                />

                {/* Structure Quick Preview */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm mb-1">
                      Fixed vs Variable Allocation
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">
                      Mess operation cost sensitivity breakdown
                    </p>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">
                            Fixed Costs (Rent, WiFi, Salaries)
                          </span>
                          <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                            ৳{executiveData.summary.fixedCosts.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{
                              width: `${
                                executiveData.summary.totalExpenses > 0
                                  ? Math.min(100, (executiveData.summary.fixedCosts / executiveData.summary.totalExpenses) * 100)
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">
                            Variable Costs (Food Bazar, Gas, Sundry)
                          </span>
                          <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                            ৳{(executiveData.summary.variableCosts + executiveData.summary.totalMarketCost).toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{
                              width: `${
                                executiveData.summary.totalExpenses > 0
                                  ? Math.min(
                                      100,
                                      ((executiveData.summary.variableCosts + executiveData.summary.totalMarketCost) /
                                        executiveData.summary.totalExpenses) *
                                        100
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                    <span>Active Residents: {executiveData.summary.activeMembersCount}</span>
                    <span className="font-mono">Period: {executiveData.periodKey} ({executiveData.periodStatus})</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: CASH FLOW STATEMENT                                */}
          {/* ========================================================= */}
          {activeTab === 'cash-flow' && cashFlowData && (
            <CashFlowChart report={cashFlowData} />
          )}

          {/* ========================================================= */}
          {/* TAB 3: COST STRUCTURE ANALYSIS                            */}
          {/* ========================================================= */}
          {activeTab === 'cost-structure' && costStructureData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
                  <span className="text-xs text-neutral-500 font-medium">Total Mess Expenditure</span>
                  <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1">
                    ৳{costStructureData.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-1 block">100% of recognized operational outlays</span>
                </div>

                <div className="p-5 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-200/60 dark:border-blue-900/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Fixed Costs</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-200/70 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {costStructureData.fixedCost.percentage}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-blue-900 dark:text-blue-100 mt-2">
                    ৳{costStructureData.fixedCost.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-1 block">
                    House rent, staff wages & recurring bills
                  </span>
                </div>

                <div className="p-5 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-900/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Variable Costs</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                      {costStructureData.variableCost.percentage}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-100 mt-2">
                    ৳{costStructureData.variableCost.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1 block">
                    Food bazar, supplies & per-unit consumption
                  </span>
                </div>
              </div>

              {/* Progress Bar of Fixed vs Variable */}
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
                  Cost Proportion Bar
                </h4>
                <div className="w-full h-4 rounded-full overflow-hidden flex bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="bg-blue-600 h-full transition-all"
                    style={{ width: `${costStructureData.fixedCost.percentage}%` }}
                    title={`Fixed: ${costStructureData.fixedCost.percentage}%`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{ width: `${costStructureData.variableCost.percentage}%` }}
                    title={`Variable: ${costStructureData.variableCost.percentage}%`}
                  />
                </div>
                <div className="flex items-center justify-between text-xs mt-2 text-neutral-500">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span>Fixed ({costStructureData.fixedCost.percentage}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Variable ({costStructureData.variableCost.percentage}%)</span>
                  </div>
                </div>
              </div>

              <ExpenseDonutChart
                data={costStructureData.categoryBreakdown}
                totalAmount={costStructureData.totalCost}
                title="Categorical Breakdown of Cost Elements"
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: UTILITY ANALYTICS                                  */}
          {/* ========================================================= */}
          {activeTab === 'utilities' && utilityData && (
            <div className="space-y-6">
              <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Total Utility Incurred for Period {utilityData.periodKey}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Aggregated across electricity, water, gas cylinders, maid salaries, and broadband
                  </p>
                </div>
                <div className="text-2xl font-bold font-mono text-primary-600 dark:text-primary-400">
                  ৳{utilityData.totalUtilityCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              {utilityData.categories.length === 0 ? (
                <div className="p-8 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-center text-xs text-neutral-400">
                  No utility bills posted for this period.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {utilityData.categories.map((c) => (
                    <div
                      key={c.category}
                      className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                            {c.category}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            {c.count} {c.count === 1 ? 'bill' : 'bills'}
                          </span>
                        </div>
                        <div className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mb-1">
                          ৳{c.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-neutral-500">
                          Average: ৳{c.average.toFixed(2)} / bill
                        </div>
                      </div>

                      {c.bills.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
                          {c.bills.map((b) => (
                            <div key={b.id} className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                              <span className="truncate max-w-[150px]">{b.title}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                                  ৳{b.amount.toFixed(2)}
                                </span>
                                <Badge variant={b.status === 'POSTED' || b.status === 'APPROVED' ? 'success' : 'warning'}>
                                  {b.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: DAILY FINANCIAL TRENDS                             */}
          {/* ========================================================= */}
          {activeTab === 'daily-trends' && dailyTrendsData && (
            <div className="space-y-6">
              <DailyTrendsChart report={dailyTrendsData} />

              {/* Day by Day Tabular Log */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6">
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                  Daily Chronological Log ({dailyTrendsData.days.length} Days)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-center">Meals Served</th>
                        <th className="py-2.5 px-3 text-right">Market Bazar (৳)</th>
                        <th className="py-2.5 px-3 text-right">Other Expenses (৳)</th>
                        <th className="py-2.5 px-3 text-right">Daily Total (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                      {dailyTrendsData.days.map((day) => (
                        <tr key={day.date} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                          <td className="py-2 px-3 font-mono font-medium text-neutral-800 dark:text-neutral-200">
                            {day.date}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {day.meals}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-neutral-800 dark:text-neutral-200">
                            ৳{day.marketExpense.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-neutral-500">
                            ৳{day.otherExpense.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                            ৳{day.totalExpense.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: MEMBER COMPARISON MATRIX (NON-JUDGMENTAL)           */}
          {/* ========================================================= */}
          {activeTab === 'member-comparison' && memberComparisonData && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/30 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                Objective comparison of member consumption shares, contributed bazar funding, advance deposits, and settlement balances.
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b-2 border-neutral-200 dark:border-neutral-800 text-neutral-500 font-medium">
                        <th className="py-3 px-3">Member</th>
                        <th className="py-3 px-3">Room</th>
                        <th className="py-3 px-3 text-right">Meals</th>
                        <th className="py-3 px-3 text-right">Food Share</th>
                        <th className="py-3 px-3 text-right">Fixed Share</th>
                        <th className="py-3 px-3 text-right">Total Charges</th>
                        <th className="py-3 px-3 text-right">Bazar Paid</th>
                        <th className="py-3 px-3 text-right">Advance Paid</th>
                        <th className="py-3 px-3 text-right">Total Paid</th>
                        <th className="py-3 px-3 text-right">Net Balance</th>
                        <th className="py-3 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                      {memberComparisonData.members.map((m) => (
                        <tr key={m.memberId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                          <td className="py-2.5 px-3 font-semibold text-neutral-900 dark:text-neutral-100">
                            {m.memberName}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-500">
                            {m.roomNo || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium">
                            {m.mealsCount.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-neutral-700 dark:text-neutral-300">
                            ৳{m.foodCost.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-neutral-700 dark:text-neutral-300">
                            ৳{m.fixedCostShare.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                            ৳{m.totalCostShare.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                            ৳{m.bazarPaid.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                            ৳{m.advancePaid.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ৳{m.totalPaid.toFixed(2)}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                            m.netBalance > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : m.netBalance < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-neutral-600'
                          }`}>
                            {m.netBalance > 0 ? '+' : ''}৳{m.netBalance.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant={
                                m.status === 'SURPLUS'
                                  ? 'success'
                                  : m.status === 'DEFICIT'
                                  ? 'danger'
                                  : 'neutral'
                              }
                            >
                              {m.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-neutral-300 dark:border-neutral-700 font-bold bg-neutral-50 dark:bg-neutral-800/60">
                        <td className="py-3 px-3" colSpan={2}>
                          Consolidated Total ({memberComparisonData.totals.totalMembers} Members)
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          {memberComparisonData.totals.totalMeals.toFixed(1)}
                        </td>
                        <td className="py-3 px-3 text-right" colSpan={2}>—</td>
                        <td className="py-3 px-3 text-right font-mono text-neutral-900 dark:text-neutral-100">
                          ৳{memberComparisonData.totals.totalCost.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right" colSpan={2}>—</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          ৳{memberComparisonData.totals.totalPaid.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs">
                          Due: ৳{memberComparisonData.totals.totalReceivable.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center text-[11px] text-neutral-400">—</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 7: MONTHLY FINANCIAL STATEMENT                        */}
          {/* ========================================================= */}
          {activeTab === 'monthly' && monthlyReport && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {monthlyReport.isSnapshot && (
                <div
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    padding: '10px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <ShieldCheck size={18} color="#059669" />
                  <span>
                    Viewing finalized snapshot for {selectedPeriodKey}. Calculations are locked and immutable.
                  </span>
                </div>
              )}

              {/* KPI Summary Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 14,
                }}
              >
                <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Total Expenses</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                    ৳{monthlyReport.summary.totalExpenses.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Food: ৳{monthlyReport.summary.foodCost.toFixed(2)} | Fixed: ৳{monthlyReport.summary.fixedCosts.toFixed(2)}
                  </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Meal Rate</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
                    ৳{monthlyReport.summary.mealRate.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {monthlyReport.summary.totalMeals.toFixed(1)} total counted meals
                  </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Average / Member</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                    ৳{monthlyReport.summary.averageCostPerMember.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Across {monthlyReport.summary.activeMembersCount} active members
                  </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Total Collected / Bazar</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                    ৳{monthlyReport.summary.totalContributions.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Settled payments: ৳{monthlyReport.summary.totalPayments.toFixed(2)}
                  </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Outstanding Debt Pool</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
                    ৳{monthlyReport.summary.outstandingAmount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Pending transfers
                  </div>
                </div>
              </div>

              {/* Month to Month Comparison & Expense Categories */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Month to Month Comparison */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 14,
                    padding: 20,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 14px 0' }}>
                    Month-to-Month Trend
                  </h3>
                  {monthlyReport.comparison.hasPrevious ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b' }}>Comparing with:</span>
                        <span style={{ fontWeight: 600 }}>{monthlyReport.comparison.prevPeriodKey}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b' }}>Expenses Delta:</span>
                        <span
                          style={{
                            fontWeight: 600,
                            color: monthlyReport.comparison.totalExpensesDelta >= 0 ? '#dc2626' : '#16a34a',
                          }}
                        >
                          {monthlyReport.comparison.totalExpensesDelta >= 0 ? '+' : ''}
                          ৳{monthlyReport.comparison.totalExpensesDelta.toFixed(2)} ({monthlyReport.comparison.totalExpensesDeltaPercent}%)
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b' }}>Meal Rate Delta:</span>
                        <span
                          style={{
                            fontWeight: 600,
                            color: monthlyReport.comparison.mealRateDelta >= 0 ? '#ea580c' : '#16a34a',
                          }}
                        >
                          {monthlyReport.comparison.mealRateDelta >= 0 ? '+' : ''}
                          ৳{monthlyReport.comparison.mealRateDelta.toFixed(2)} ({monthlyReport.comparison.mealRateDeltaPercent}%)
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                        <span style={{ color: '#64748b' }}>Meals Count Delta:</span>
                        <span style={{ fontWeight: 600 }}>
                          {monthlyReport.comparison.mealsDelta >= 0 ? '+' : ''}
                          {monthlyReport.comparison.mealsDelta.toFixed(1)} meals
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748b', fontSize: 13 }}>
                      No previous financial period available for trend comparison.
                    </div>
                  )}
                </div>

                {/* Category Breakdown */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 14,
                    padding: 20,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 14px 0' }}>
                    Expense Breakdown by Category
                  </h3>
                  {monthlyReport.expenseBreakdown.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 30, color: '#64748b', fontSize: 13 }}>
                      No categorized expenses found for this period.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {monthlyReport.expenseBreakdown.map((item, idx) => (
                        <div key={idx} style={{ fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.category}</span>
                            <span style={{ color: '#475569' }}>
                              ৳{item.amount.toFixed(2)} ({item.percentage}%)
                            </span>
                          </div>
                          <div style={{ width: '100%', height: 6, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(100, item.percentage)}%`,
                                height: '100%',
                                backgroundColor: '#3b82f6',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 8: MEMBER FINANCIAL STATEMENTS                        */}
          {/* ========================================================= */}
          {activeTab === 'member' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Select Member:</span>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    color: '#1e293b',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                  }}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role}) - {m.roomNo || 'No room'}
                    </option>
                  ))}
                </select>
              </div>

              {memberStatement ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Statement Header Card */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 14,
                      padding: 24,
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Individual Financial Statement
                      </div>
                      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0' }}>
                        {memberStatement.memberName}
                      </h2>
                      <div style={{ fontSize: 13, color: '#475569' }}>
                        Room: {memberStatement.roomNo} | Role: {memberStatement.role} | Period: {memberStatement.periodKey}
                      </div>
                    </div>

                    {/* Prominent Status Badge */}
                    <div
                      style={{
                        padding: '12px 20px',
                        borderRadius: 12,
                        textAlign: 'right',
                        backgroundColor:
                          memberStatement.statusBadge.status === 'OWES'
                            ? '#fef2f2'
                            : memberStatement.statusBadge.status === 'RECEIVES'
                            ? '#f0fdf4'
                            : '#f8fafc',
                        border: `1px solid ${
                          memberStatement.statusBadge.status === 'OWES'
                            ? '#fecaca'
                            : memberStatement.statusBadge.status === 'RECEIVES'
                            ? '#bbf7d0'
                            : '#e2e8f0'
                        }`,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                        Net Settlement Position
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color:
                            memberStatement.statusBadge.status === 'OWES'
                              ? '#dc2626'
                              : memberStatement.statusBadge.status === 'RECEIVES'
                              ? '#16a34a'
                              : '#475569',
                          marginTop: 2,
                        }}
                      >
                        {memberStatement.statusBadge.label}
                      </div>
                    </div>
                  </div>

                  {/* Member Summary Breakdown */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: 12,
                    }}
                  >
                    <div style={{ backgroundColor: '#fff', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Opening Balance</div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                        ৳{memberStatement.summary.openingBalance.toFixed(2)}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#fff', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        Food Share ({memberStatement.summary.totalMeals.toFixed(1)} meals)
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb', marginTop: 2 }}>
                        ৳{memberStatement.summary.foodShare.toFixed(2)}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#fff', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Rent & Utilities</div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                        ৳{(memberStatement.summary.rentShare + memberStatement.summary.utilityShare).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#fff', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Total Obligations</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', marginTop: 2 }}>
                        ৳{memberStatement.summary.totalObligations.toFixed(2)}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#fff', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Total Contributions</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>
                        ৳{memberStatement.summary.totalContributions.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Itemized Chronological Ledger Table */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 14,
                      padding: 20,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 14px 0' }}>
                      Itemized Transaction History
                    </h3>

                    {memberStatement.transactions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 30, color: '#64748b', fontSize: 13 }}>
                        No financial transactions recorded for this period.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                              <th style={{ padding: '10px 12px' }}>Date</th>
                              <th style={{ padding: '10px 12px' }}>Description</th>
                              <th style={{ padding: '10px 12px' }}>Reference</th>
                              <th style={{ padding: '10px 12px' }}>Type</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Debit (Consumed)</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Credit (Paid)</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Running Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberStatement.transactions.map((tx) => (
                              <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 12px', color: '#475569' }}>{tx.date}</td>
                                <td style={{ padding: '10px 12px', fontWeight: 500, color: '#1e293b' }}>
                                  {tx.description}
                                </td>
                                <td style={{ padding: '10px 12px', color: '#64748b' }}>{tx.reference}</td>
                                <td style={{ padding: '10px 12px' }}>
                                  <Badge variant="neutral">{tx.entryType}</Badge>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                                  {tx.debit !== null ? `৳${tx.debit.toFixed(2)}` : '—'}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                                  {tx.credit !== null ? `৳${tx.credit.toFixed(2)}` : '—'}
                                </td>
                                <td
                                  style={{
                                    padding: '10px 12px',
                                    textAlign: 'right',
                                    fontWeight: 700,
                                    color: tx.runningBalance >= 0 ? '#16a34a' : '#dc2626',
                                  }}
                                >
                                  ৳{tx.runningBalance.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  Please select a member to display their statement.
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 9: FOOD COST & MEALS                                  */}
          {/* ========================================================= */}
          {activeTab === 'meals' && mealReport && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 16,
                }}
              >
                <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Total Food Cost</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                    ৳{mealReport.totalFoodCost.toFixed(2)}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Total Counted Meals</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                    {mealReport.totalMeals.toFixed(1)}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Meal Rate (Per Meal)</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
                    ৳{mealReport.mealRate.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Members Table */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 14px 0' }}>
                  Member Consumption Distribution
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: '10px 12px' }}>Member Name</th>
                      <th style={{ padding: '10px 12px' }}>Room</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Meals Consumed</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Food Share (BDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mealReport.members.map((m) => (
                      <tr key={m.memberId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{m.name}</td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>{m.roomNo}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                          {m.meals.toFixed(1)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                          ৳{m.foodShare.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 10: SETTLEMENT REPORT                                 */}
          {/* ========================================================= */}
          {activeTab === 'settlement' && settlementReport && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 16,
                }}
              >
                <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Total Debt Pool</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
                    ৳{settlementReport.summary.totalOwedAmount.toFixed(2)}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Total Receivable</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                    ৳{settlementReport.summary.totalReceivableAmount.toFixed(2)}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Total Settled</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
                    ৳{settlementReport.summary.totalSettledAmount.toFixed(2)}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Remaining Unsettled</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>
                    ৳{settlementReport.summary.remainingAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Member Settlement Status Table */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 14px 0' }}>
                  Member Settlement Balances
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: '10px 12px' }}>Member</th>
                      <th style={{ padding: '10px 12px' }}>Room</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Owed</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Receivable</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Settled Paid</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Remaining</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlementReport.memberSummaries.map((ms) => (
                      <tr key={ms.memberId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{ms.name}</td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>{ms.roomNo}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                          ৳{ms.totalOwed.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                          ৳{ms.totalReceivable.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          ৳{ms.paid.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                          ৳{ms.remaining.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <Badge
                            variant={
                              ms.status === 'SETTLED'
                                ? 'success'
                                : ms.status === 'PARTIALLY_PAID'
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {ms.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 11: EXPENSE BREAKDOWN                                 */}
          {/* ========================================================= */}
          {activeTab === 'expenses' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 14px 0' }}>
                Itemized Expenses for {selectedPeriodKey}
              </h3>
              {periodExpenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748b', fontSize: 13 }}>
                  No expense records found for this period.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: '10px 12px' }}>Date</th>
                      <th style={{ padding: '10px 12px' }}>Description</th>
                      <th style={{ padding: '10px 12px' }}>Category</th>
                      <th style={{ padding: '10px 12px' }}>Type</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodExpenses.map((exp) => (
                      <tr key={exp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {exp.date ? exp.date.slice(0, 10) : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 500, color: '#1e293b' }}>
                          {exp.description}
                        </td>
                        <td style={{ padding: '10px 12px' }}>{exp.category}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <Badge variant={exp.type === 'FIXED' ? 'neutral' : 'info'}>{exp.type}</Badge>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                          ৳{Number(exp.amount).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <Badge variant={exp.status === 'APPROVED' ? 'success' : 'warning'}>
                            {exp.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 12: FIXED & RECURRING BILLS REPORT                    */}
          {/* ========================================================= */}
          {activeTab === 'fixed-bills' && fixedBillsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Fixed Bills</div>
                  <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    ৳{fixedBillsData.summary.totalAmount.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Settled / Paid</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    ৳{fixedBillsData.summary.paidAmount.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Pending Dues</div>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    ৳{fixedBillsData.summary.pendingAmount.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Invoices</div>
                  <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    {fixedBillsData.summary.totalCount}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  Fixed Bills Schedule for {selectedPeriodKey}
                </h3>
                {fixedBillsData.bills.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400 text-sm">
                    No fixed bills recorded for period {selectedPeriodKey}.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 text-xs uppercase">
                          <th className="py-2.5 px-3">Title</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3">Paid Date</th>
                          <th className="py-2.5 px-3">Paid By</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fixedBillsData.bills.map((b) => (
                          <tr key={b.id} className="border-b border-neutral-100 dark:border-neutral-700/50">
                            <td className="py-2.5 px-3 font-semibold text-neutral-900 dark:text-neutral-100">{b.title}</td>
                            <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-300">{b.category}</td>
                            <td className="py-2.5 px-3 text-neutral-500 dark:text-neutral-400 text-xs">
                              {b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-500 dark:text-neutral-400 text-xs">
                              {b.paidDate ? new Date(b.paidDate).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-300">{b.paidByName || 'Mess Fund'}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                              ৳{b.amount.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge variant={b.status === 'PAID' ? 'success' : 'warning'}>{b.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 13: BAZAR & MARKET LOG SUMMARY                        */}
          {/* ========================================================= */}
          {activeTab === 'bazar-summary' && bazarSummaryData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Bazar Spend</div>
                  <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    ৳{bazarSummaryData.summary.totalCost.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Shopping Trips</div>
                  <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    {bazarSummaryData.summary.totalTrips}
                  </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Items Bought</div>
                  <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    {bazarSummaryData.summary.totalItems}
                  </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Average Per Trip</div>
                  <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    ৳{bazarSummaryData.summary.averagePerTrip.toFixed(2)}
                  </div>
                </div>
              </div>

              {bazarSummaryData.shopperBreakdown.length > 0 && (
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-3">
                    Shopper Contributions
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {bazarSummaryData.shopperBreakdown.map((sb, idx) => (
                      <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                        <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">{sb.name}</div>
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                          ৳{sb.total.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{sb.count} trips</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  Market Purchase Log ({selectedPeriodKey})
                </h3>
                {bazarSummaryData.entries.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400 text-sm">
                    No bazar shopping records logged for this period.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 text-xs uppercase">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Shopper</th>
                          <th className="py-2.5 px-3">Items Summary</th>
                          <th className="py-2.5 px-3 text-center">Items Count</th>
                          <th className="py-2.5 px-3 text-right">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bazarSummaryData.entries.map((entry) => (
                          <tr key={entry.id} className="border-b border-neutral-100 dark:border-neutral-700/50">
                            <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                              {entry.date ? new Date(entry.date).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                              {entry.shopperName}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-neutral-600 dark:text-neutral-400">
                              {entry.items.map((i) => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ') || 'General Groceries'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge variant="neutral">{entry.itemCount}</Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                              ৳{entry.totalCost.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 14: SHARED LEDGER AUDIT REPORT                        */}
          {/* ========================================================= */}
          {activeTab === 'ledger' && ledgerData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Ledger Entries</div>
                  <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    {ledgerData.summary.totalEntries}
                  </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Credits (Inflow)</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    ৳{ledgerData.summary.totalCredits.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Debits (Outflow)</div>
                  <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                    ৳{ledgerData.summary.totalDebits.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Net Period Flow</div>
                  <div className={`text-xl font-bold mt-1 ${ledgerData.summary.netFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    ৳{ledgerData.summary.netFlow.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  Ledger Transactions ({selectedPeriodKey})
                </h3>
                {ledgerData.entries.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400 text-sm">
                    No ledger transactions recorded for this period.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 text-xs uppercase">
                          <th className="py-2.5 px-3">Effective Date</th>
                          <th className="py-2.5 px-3">Member</th>
                          <th className="py-2.5 px-3">Entry Type</th>
                          <th className="py-2.5 px-3">Direction</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-right">Balance After</th>
                          <th className="py-2.5 px-3">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerData.entries.map((le) => (
                          <tr key={le.id} className="border-b border-neutral-100 dark:border-neutral-700/50">
                            <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400 text-xs whitespace-nowrap">
                              {le.effectiveDate ? new Date(le.effectiveDate).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                              {le.memberName}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant="neutral">{le.entryType}</Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant={le.direction === 'CREDIT' ? 'success' : 'danger'}>
                                {le.direction}
                              </Badge>
                            </td>
                            <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${le.direction === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {le.direction === 'CREDIT' ? '+' : '-'}৳{le.amount.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                              ৳{le.balanceAfter.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-xs">
                              {le.description || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 15: MONTH-END CLOSING & SNAPSHOT REPORT               */}
          {/* ========================================================= */}
          {activeTab === 'month-end' && monthEndData && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-bold">
                    Financial Cycle Status
                  </div>
                  <div className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mt-1 flex items-center gap-2">
                    {selectedPeriodKey}
                    <Badge variant={monthEndData.status === 'CLOSED' ? 'success' : monthEndData.status === 'ACTIVE' ? 'info' : 'warning'}>
                      {monthEndData.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 text-right">
                  <div>Ledger Audit Status: <strong className={monthEndData.snapshot?.isReconciled ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                    {monthEndData.snapshot?.isReconciled ? 'Reconciled & Locked' : 'Live Computation'}
                  </strong></div>
                  {monthEndData.snapshot?.createdAt && (
                    <div className="mt-0.5">Finalized At: {new Date(monthEndData.snapshot.createdAt).toLocaleString()}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Final Total Meals</div>
                  <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    {(monthEndData.snapshot ? monthEndData.snapshot.totalMeals : monthEndData.liveSummary?.totalMeals || 0).toFixed(1)}
                  </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Final Meal Rate</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    ৳{(monthEndData.snapshot ? monthEndData.snapshot.mealRate : monthEndData.liveSummary?.mealRate || 0).toFixed(4)}
                  </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Food Cost</div>
                  <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    ৳{(monthEndData.snapshot ? monthEndData.snapshot.totalFoodCost : monthEndData.liveSummary?.foodCost || 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Mess Outflow</div>
                  <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    ৳{(monthEndData.snapshot ? monthEndData.snapshot.totalExpenses : monthEndData.liveSummary?.totalExpenses || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  Month-End Reconciliation Balance Sheet
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700/40 space-y-2.5">
                    <div className="font-semibold text-neutral-800 dark:text-neutral-200 border-b pb-1.5 border-neutral-200 dark:border-neutral-600">
                      Expenditure Breakdown
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Total Food Cost</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        ৳{(monthEndData.snapshot ? monthEndData.snapshot.totalFoodCost : monthEndData.liveSummary?.foodCost || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Total Fixed Bills</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        ৳{(monthEndData.snapshot ? monthEndData.snapshot.totalFixedExpenses : monthEndData.liveSummary?.fixedCosts || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Variable Utilities & Shared</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        ৳{(monthEndData.snapshot ? monthEndData.snapshot.totalVariableExpenses : monthEndData.liveSummary?.variableCosts || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-600 font-bold text-neutral-900 dark:text-neutral-100">
                      <span>Gross Mess Expenditure</span>
                      <span>৳{(monthEndData.snapshot ? monthEndData.snapshot.totalExpenses : monthEndData.liveSummary?.totalExpenses || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700/40 space-y-2.5">
                    <div className="font-semibold text-neutral-800 dark:text-neutral-200 border-b pb-1.5 border-neutral-200 dark:border-neutral-600">
                      Collections & Treasury
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Member Contributions</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        ৳{(monthEndData.snapshot ? monthEndData.snapshot.totalContributions : monthEndData.liveSummary?.totalContributions || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Member Advance Balances</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        ৳{(monthEndData.snapshot ? monthEndData.snapshot.totalAdvances : monthEndData.liveSummary?.totalAdvances || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Outstanding Receivable</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        ৳{(monthEndData.snapshot ? monthEndData.snapshot.outstandingBalance : monthEndData.liveSummary?.outstandingAmount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-600 font-bold text-neutral-900 dark:text-neutral-100">
                      <span>Ledger State</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {monthEndData.snapshot?.isReconciled ? 'Fully Balanced' : 'Synchronized'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
