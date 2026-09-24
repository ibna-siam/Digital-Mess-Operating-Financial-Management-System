import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  Unlock,
  FileCheck,
  History,
  TrendingUp,
  Utensils,
  Receipt,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { AppViewSkeleton } from '../components/ui/StateComponents.js';
import { useDataSync } from '../hooks/useDataSync.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import {
  FinancialPeriod,
  FinancialValidationResult,
  PeriodAuditEvent,
} from '../types/index.js';

export const MonthEndPage: React.FC = () => {
  const { activeMess } = useAuth();
  const messId = activeMess?.id || '';

  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [period, setPeriod] = useState<FinancialPeriod | null>(null);
  const [validation, setValidation] = useState<FinancialValidationResult | null>(null);
  const [auditEvents, setAuditEvents] = useState<PeriodAuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [confirmUnderstood, setConfirmUnderstood] = useState<boolean>(false);
  const [showReopenModal, setShowReopenModal] = useState<boolean>(false);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [showEventsModal, setShowEventsModal] = useState<boolean>(false);

  // Load periods and data concurrently
  const loadPeriodData = async (key: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [periodListRes, periodDetailRes, valResultRes, eventsRes] = await Promise.allSettled([
        apiClient<FinancialPeriod[]>(`/messes/${messId}/financial-periods`),
        apiClient<{ period: FinancialPeriod; snapshot: any }>(`/messes/${messId}/financial-periods/${key}`),
        apiClient<FinancialValidationResult>(`/messes/${messId}/financial-periods/${key}/validation`),
        apiClient<PeriodAuditEvent[]>(`/messes/${messId}/financial-periods/${key}/events`),
      ]);

      if (periodListRes.status === 'fulfilled') {
        setPeriods(periodListRes.value);
      }

      if (periodDetailRes.status === 'fulfilled' && periodDetailRes.value?.period) {
        setPeriod(periodDetailRes.value.period);
      } else {
        // Fallback to active current if key not yet created
        const cur = await apiClient<FinancialPeriod>(`/messes/${messId}/financial-periods/current`).catch(() => null);
        if (cur) setPeriod(cur);
      }

      if (valResultRes.status === 'fulfilled') {
        setValidation(valResultRes.value);
      }

      if (eventsRes.status === 'fulfilled') {
        setAuditEvents(eventsRes.value);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load month-end data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPeriodData(selectedPeriodKey);
  }, [messId, selectedPeriodKey]);

  // Real-time synchronization across financial mutations
  useDataSync(['periods', 'expenses', 'meals', 'bazar', 'settlements', 'bills'], () => {
    loadPeriodData(selectedPeriodKey);
  });

  // Actions
  const handleStartReview = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await apiClient(`/messes/${messId}/financial-periods/${selectedPeriodKey}/review`, { method: 'POST' });
      setSuccessMessage(`Period ${selectedPeriodKey} is now UNDER REVIEW.`);
      await loadPeriodData(selectedPeriodKey);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizeMonth = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await apiClient(`/messes/${messId}/financial-periods/${selectedPeriodKey}/finalize`, { method: 'POST' });
      setSuccessMessage(`Period ${selectedPeriodKey} finalized successfully. Financial snapshot created.`);
      await loadPeriodData(selectedPeriodKey);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseMonth = async () => {
    if (!confirmUnderstood) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<{ period: FinancialPeriod; carriedForwardCount: number }>(
        `/messes/${messId}/financial-periods/${selectedPeriodKey}/close`,
        { method: 'POST' }
      );
      setShowCloseModal(false);
      setConfirmUnderstood(false);
      setSuccessMessage(
        `Financial period ${selectedPeriodKey} is now CLOSED and locked. Carried forward ${res.carriedForwardCount} opening balance(s) to next month.`
      );
      await loadPeriodData(selectedPeriodKey);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReopenMonth = async () => {
    if (reopenReason.trim().length < 5) {
      setErrorMessage('A reason of at least 5 characters is required to reopen.');
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await apiClient(`/messes/${messId}/financial-periods/${selectedPeriodKey}/reopen`, {
        method: 'POST',
        body: JSON.stringify({ reason: reopenReason.trim() }),
      });
      setShowReopenModal(false);
      setReopenReason('');
      setSuccessMessage(`Financial period ${selectedPeriodKey} has been reopened with audit log.`);
      await loadPeriodData(selectedPeriodKey);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">ACTIVE</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="warning">UNDER REVIEW</Badge>;
      case 'FINALIZED':
        return <Badge variant="info">FINALIZED</Badge>;
      case 'CLOSED':
        return <Badge variant="neutral">CLOSED & LOCKED</Badge>;
      case 'REOPENED':
        return <Badge variant="danger">REOPENED</Badge>;
      default:
        return <Badge variant="neutral">{status || 'OPEN'}</Badge>;
    }
  };

  if (isLoading && !period) {
    return <AppViewSkeleton title="Month-End Closing & Audit" />;
  }

  const isClosed = period?.status === 'CLOSED';
  const isFinalized = period?.status === 'FINALIZED';
  const isUnderReview = period?.status === 'UNDER_REVIEW';
  const hasBlockingIssues = (validation?.blockingIssues?.length || 0) > 0;

  return (
    <div className="space-y-6 page-enter pb-16">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 flex-shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Month-End Review Center
              </h1>
              {getStatusBadge(period?.status)}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Authoritative financial closing, reconciliation, audit trail and historical period management.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Period Selector */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
            <select
              value={selectedPeriodKey}
              onChange={(e) => setSelectedPeriodKey(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              {periods.length > 0 ? (
                periods.map((p) => (
                  <option key={p.periodKey} value={p.periodKey} className="dark:bg-slate-900">
                    {p.periodKey} ({p.status})
                  </option>
                ))
              ) : (
                <option value={selectedPeriodKey} className="dark:bg-slate-900">{selectedPeriodKey}</option>
              )}
            </select>
          </div>

          <Button
            variant="secondary"
            icon={<History size={15} />}
            onClick={() => setShowEventsModal(true)}
            className="text-xs font-semibold py-2 px-3 rounded-xl shadow-sm"
          >
            Audit History ({auditEvents.length})
          </Button>

          {/* Action buttons based on status */}
          {!isClosed && !isFinalized && !isUnderReview && (
            <Button
              variant="secondary"
              icon={<FileCheck size={16} />}
              onClick={handleStartReview}
              isLoading={isProcessing}
              className="text-xs font-semibold py-2 px-3.5 rounded-xl shadow-sm"
            >
              Start Review
            </Button>
          )}

          {!isClosed && !isFinalized && isUnderReview && (
            <Button
              variant="primary"
              icon={<ShieldCheck size={16} />}
              onClick={handleFinalizeMonth}
              disabled={hasBlockingIssues}
              isLoading={isProcessing}
              className="text-xs font-semibold py-2 px-3.5 rounded-xl shadow-sm"
            >
              Finalize Month
            </Button>
          )}

          {!isClosed && isFinalized && (
            <Button
              variant="danger"
              icon={<Lock size={16} />}
              onClick={() => setShowCloseModal(true)}
              isLoading={isProcessing}
              className="text-xs font-semibold py-2 px-3.5 rounded-xl shadow-sm"
            >
              Close Month & Lock
            </Button>
          )}

          {isClosed && (
            <Button
              variant="secondary"
              icon={<Unlock size={16} />}
              onClick={() => setShowReopenModal(true)}
              className="text-xs font-semibold py-2 px-3.5 rounded-xl shadow-sm"
            >
              Request Reopen
            </Button>
          )}
        </div>
      </div>

      {/* Closed Banner */}
      {isClosed && (
        <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex-shrink-0">
            <Lock size={20} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">
              Financial Period {selectedPeriodKey} is CLOSED & IMMUTABLE
            </div>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Closed on {period?.closedAt ? new Date(period.closedAt).toLocaleDateString() : '—'}. Operations for this month are locked.
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Alerts */}
      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 flex items-center gap-3 text-rose-800 dark:text-rose-300 text-sm">
          <XCircle size={18} className="text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Meals */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Meals</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Utensils size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {validation?.summary.totalMeals.toFixed(1) || '0.0'}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1">
              Food Cost: ৳{validation?.summary.totalFoodCost.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>

        {/* Card 2: Calculated Meal Rate */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Calculated Meal Rate</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              ৳{validation?.summary.mealRate.toFixed(2) || '0.00'}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1">
              Per counted meal
            </div>
          </div>
        </div>

        {/* Card 3: Total Expenses */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Expenses</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Receipt size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              ৳{validation?.summary.totalExpenses.toFixed(2) || '0.00'}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1">
              Fixed & variable overhead
            </div>
          </div>
        </div>

        {/* Card 4: Total Contributions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Contributions</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              ৳{validation?.summary.totalContributions.toFixed(2) || '0.00'}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1">
              Deposits & Bazar
            </div>
          </div>
        </div>

        {/* Card 5: Full Width Outstanding Debt Pool / Settlement Banner */}
        <div className="col-span-2 lg:col-span-4 bg-gradient-to-r from-rose-50/70 via-white to-amber-50/40 dark:from-rose-950/20 dark:via-slate-900 dark:to-amber-950/10 rounded-2xl p-4 sm:p-5 border border-rose-200/80 dark:border-rose-900/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Settlement Debt Pool
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-medium">
                  Pending Transfers
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Total outstanding member obligations pending peer-to-peer settlement clearing.
              </p>
            </div>
          </div>
          <div className="sm:text-right flex sm:flex-col items-baseline sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-rose-100 dark:border-rose-900/30">
            <div className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              ৳{validation?.summary.outstandingBalance.toFixed(2) || '0.00'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Reconciliation: {validation?.summary.isReconciled ? '✓ Zero-sum verified' : 'Discrepancy pending'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Checklist & Validation Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Automated Month-End Checklist */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Automated Month-End Checklist
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Live evaluation from Phase 3 Financial Engine
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {validation?.checklist?.map((item) => {
                let icon = <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />;
                let badgeVariant: 'success' | 'warning' | 'danger' = 'success';

                if (item.status === 'WARNING') {
                  icon = <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />;
                  badgeVariant = 'warning';
                } else if (item.status === 'BLOCKED') {
                  icon = <XCircle size={18} className="text-rose-500 flex-shrink-0" />;
                  badgeVariant = 'danger';
                }

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {icon}
                      <div className="min-w-0">
                        <div className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                          {item.details}
                        </div>
                      </div>
                    </div>
                    <Badge variant={badgeVariant}>{item.status}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Validation Issues & Blocking Banners */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Audit & Closing Readiness
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Eligibility verification for ledger locking
              </p>
            </div>
          </div>

          {/* Blocking Issues */}
          {validation?.blockingIssues && validation.blockingIssues.length > 0 ? (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-semibold text-xs sm:text-sm mb-2">
                <XCircle size={18} className="text-rose-600 flex-shrink-0" />
                BLOCKING ISSUES ({validation.blockingIssues.length})
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-400 mb-2">
                Cannot finalize or close this period until the following issues are resolved:
              </p>
              <ul className="space-y-1 pl-5 list-disc text-xs text-rose-800 dark:text-rose-300">
                {validation.blockingIssues.map((b, idx) => (
                  <li key={idx}>
                    {b.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="font-semibold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                  Zero Blocking Issues
                </div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400">
                  Financial reconciliation passed. Period is eligible for finalization.
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {validation?.warnings && validation.warnings.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs sm:text-sm mb-2">
                <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
                WARNINGS ({validation.warnings.length})
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                Non-blocking items recommended for review before closing:
              </p>
              <ul className="space-y-1 pl-5 list-disc text-xs text-amber-800 dark:text-amber-300">
                {validation.warnings.map((w, idx) => (
                  <li key={idx}>
                    {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reconciliation Status Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                Zero-Sum Shared Ledger Reconciliation
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Debits and credits must balance within ৳0.05
              </div>
            </div>
            <Badge variant={validation?.summary.isReconciled ? 'success' : 'danger'}>
              {validation?.summary.isReconciled ? 'RECONCILED' : 'DISCREPANCY'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Closing Month */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title={`Close & Lock Financial Period ${selectedPeriodKey}?`}
      >
        <div className="space-y-4 py-2">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3.5 text-xs text-amber-800 dark:text-amber-300">
            <strong>Important Safety Notice:</strong> Closing a financial month is a formal accounting action.
            All meals, expenses, bazar and bills for this period will become strictly <strong>read-only</strong>.
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-xs space-y-2 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Period Key:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPeriodKey}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Total Expenses:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">৳{validation?.summary.totalExpenses.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Meal Rate:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">৳{validation?.summary.mealRate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-750">
              <span className="text-slate-500 dark:text-slate-400">Outstanding Debt:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">৳{validation?.summary.outstandingBalance.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Closing will automatically carry forward each member's closing balance into the next month's opening balance as an immutable ledger record.
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700">
            <input
              type="checkbox"
              checked={confirmUnderstood}
              onChange={(e) => setConfirmUnderstood(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>I understand that closing this month will permanently lock operations and make all financial records read-only.</span>
          </label>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="secondary" onClick={() => setShowCloseModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!confirmUnderstood}
              isLoading={isProcessing}
              onClick={handleCloseMonth}
            >
              Confirm & Close Month
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal for Reopening Month */}
      <Modal
        isOpen={showReopenModal}
        onClose={() => setShowReopenModal(false)}
        title={`Reopen Financial Period ${selectedPeriodKey}`}
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Reopening a closed month unlocks financial records for authorized corrections. Every reopening action is permanently logged to the audit trail with the requester's name, timestamp, and reason.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Explanatory Reason for Reopening *
            </label>
            <textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="e.g. Correcting two incorrectly recorded lunch entries from Bazar day..."
              rows={3}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="secondary" onClick={() => setShowReopenModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={reopenReason.trim().length < 5}
              isLoading={isProcessing}
              onClick={handleReopenMonth}
            >
              Confirm Reopen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal for Audit Events Log */}
      <Modal
        isOpen={showEventsModal}
        onClose={() => setShowEventsModal(false)}
        title={`Audit Trail History - ${selectedPeriodKey}`}
        maxWidth={640}
      >
        <div className="space-y-3 py-2 max-h-[420px] overflow-y-auto">
          {auditEvents.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-8">
              No audit events recorded for this period yet.
            </p>
          ) : (
            auditEvents.map((event) => (
              <div
                key={event.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5"
              >
                <div className="flex justify-between items-center">
                  <Badge variant="neutral">{event.eventType}</Badge>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                  {event.notes || 'No extra notes provided'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Actor: {event.actorName || event.actorId || 'System Administrator'}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};
