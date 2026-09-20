import React, { useState, useEffect } from 'react';
import {
  Calendar,
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
import { PageLoader } from '../components/ui/StateComponents.js';
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
  const messId = activeMess?.id || 'c3a66302-28a7-48a9-bb71-f500b36e6ea0';

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

  if (isLoading) {
    return <PageLoader message="Loading Month-End Review Center..." />;
  }

  const isClosed = period?.status === 'CLOSED';
  const isFinalized = period?.status === 'FINALIZED';
  const isUnderReview = period?.status === 'UNDER_REVIEW';
  const hasBlockingIssues = (validation?.blockingIssues?.length || 0) > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Header & Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          backgroundColor: '#ffffff',
          padding: '20px 24px',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Month-End Review Center
            </h1>
            {getStatusBadge(period?.status)}
          </div>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
            Authoritative financial closing, reconciliation, audit trail and historical period management.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Period Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="#64748b" />
            <select
              value={selectedPeriodKey}
              onChange={(e) => setSelectedPeriodKey(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 14,
                fontWeight: 600,
                color: '#1e293b',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              {periods.length > 0 ? (
                periods.map((p) => (
                  <option key={p.periodKey} value={p.periodKey}>
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
            icon={<History size={16} />}
            onClick={() => setShowEventsModal(true)}
            className="text-xs py-2 px-3"
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
              className="text-xs py-2 px-3"
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
              className="text-xs py-2 px-3"
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
              className="text-xs py-2 px-3"
            >
              Close Month & Lock
            </Button>
          )}

          {isClosed && (
            <Button
              variant="secondary"
              icon={<Unlock size={16} />}
              onClick={() => setShowReopenModal(true)}
              className="text-xs py-2 px-3"
            >
              Request Reopen
            </Button>
          )}
        </div>
      </div>

      {/* Closed Banner */}
      {isClosed && (
        <div
          style={{
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: 12,
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            color: '#334155',
          }}
        >
          <Lock size={22} color="#475569" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>
              Financial Period {selectedPeriodKey} is CLOSED & IMMUTABLE
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Closed on {period?.closedAt ? new Date(period.closedAt).toLocaleDateString() : '—'}. Operations for this month are locked.
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Alerts */}
      {errorMessage && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '14px 20px',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <XCircle size={20} color="#dc2626" />
          <span style={{ fontSize: 14 }}>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 12,
            padding: '14px 20px',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <CheckCircle2 size={20} color="#16a34a" />
          <span style={{ fontSize: 14 }}>{successMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            padding: 18,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13, marginBottom: 8 }}>
            <Utensils size={16} /> Total Meals
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
            {validation?.summary.totalMeals.toFixed(1) || '0.0'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Food Cost: ৳{validation?.summary.totalFoodCost.toFixed(2) || '0.00'}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            padding: 18,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13, marginBottom: 8 }}>
            <TrendingUp size={16} /> Calculated Meal Rate
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>
            ৳{validation?.summary.mealRate.toFixed(2) || '0.00'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Per counted meal
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            padding: 18,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13, marginBottom: 8 }}>
            <Receipt size={16} /> Total Expenses
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
            ৳{validation?.summary.totalExpenses.toFixed(2) || '0.00'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Fixed & variable overhead
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            padding: 18,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13, marginBottom: 8 }}>
            <Wallet size={16} /> Total Contributions
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>
            ৳{validation?.summary.totalContributions.toFixed(2) || '0.00'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Deposits & Bazar
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            padding: 18,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13, marginBottom: 8 }}>
            <AlertTriangle size={16} /> Outstanding Debt
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>
            ৳{validation?.summary.outstandingBalance.toFixed(2) || '0.00'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Settlement pending pool
          </div>
        </div>
      </div>

      {/* Main Content Layout: Checklist & Validation Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Automated Month-End Checklist */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 24,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Automated Month-End Checklist
            </h2>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Live evaluation from Phase 3 Financial Engine
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {validation?.checklist?.map((item) => {
              let icon = <CheckCircle2 size={18} color="#16a34a" />;
              let badgeVariant: 'success' | 'warning' | 'danger' = 'success';

              if (item.status === 'WARNING') {
                icon = <AlertTriangle size={18} color="#f59e0b" />;
                badgeVariant = 'warning';
              } else if (item.status === 'BLOCKED') {
                icon = <XCircle size={18} color="#dc2626" />;
                badgeVariant = 'danger';
              }

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 10,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {icon}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{item.details}</div>
                    </div>
                  </div>
                  <Badge variant={badgeVariant}>{item.status}</Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Validation Issues & Blocking Banners */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 24,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Audit & Closing Readiness
          </h2>

          {/* Blocking Issues */}
          {validation?.blockingIssues && validation.blockingIssues.length > 0 ? (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991b1b', fontWeight: 600, marginBottom: 8 }}>
                <XCircle size={18} color="#dc2626" />
                BLOCKING ISSUES ({validation.blockingIssues.length})
              </div>
              <p style={{ fontSize: 13, color: '#7f1d1d', margin: '0 0 10px 0' }}>
                Cannot finalize or close this period until the following issues are resolved:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#991b1b' }}>
                {validation.blockingIssues.map((b, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    {b.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <CheckCircle2 size={22} color="#16a34a" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#166534' }}>
                  Zero Blocking Issues
                </div>
                <div style={{ fontSize: 12, color: '#15803d' }}>
                  Financial reconciliation passed. Period is eligible for finalization.
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {validation?.warnings && validation.warnings.length > 0 && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', fontWeight: 600, marginBottom: 8 }}>
                <AlertTriangle size={18} color="#d97706" />
                WARNINGS ({validation.warnings.length})
              </div>
              <p style={{ fontSize: 13, color: '#78350f', margin: '0 0 8px 0' }}>
                Non-blocking items recommended for review before closing:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#92400e' }}>
                {validation.warnings.map((w, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reconciliation Status Card */}
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                Zero-Sum Shared Ledger Reconciliation
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 10,
              padding: 14,
              color: '#92400e',
              fontSize: 13,
            }}
          >
            <strong>Important Safety Notice:</strong> Closing a financial month is a formal accounting action.
            All meals, expenses, bazar and bills for this period will become strictly <strong>read-only</strong>.
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 10, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#64748b' }}>Period Key:</span>
              <span style={{ fontWeight: 600 }}>{selectedPeriodKey}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#64748b' }}>Total Expenses:</span>
              <span style={{ fontWeight: 600 }}>৳{validation?.summary.totalExpenses.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#64748b' }}>Meal Rate:</span>
              <span style={{ fontWeight: 600 }}>৳{validation?.summary.mealRate.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Outstanding Debt:</span>
              <span style={{ fontWeight: 600, color: '#dc2626' }}>৳{validation?.summary.outstandingBalance.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ fontSize: 13, color: '#475569' }}>
            Closing will automatically carry forward each member's closing balance into the next month's opening balance as an immutable ledger record.
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              fontSize: 13,
              fontWeight: 600,
              color: '#0f172a',
              cursor: 'pointer',
              backgroundColor: '#f1f5f9',
              padding: 12,
              borderRadius: 8,
            }}
          >
            <input
              type="checkbox"
              checked={confirmUnderstood}
              onChange={(e) => setConfirmUnderstood(e.target.checked)}
              style={{ marginTop: 2, cursor: 'pointer' }}
            />
            <span>I understand that closing this month will make financial records read-only.</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Reopening a closed month unlocks financial records for authorized corrections. Every reopening action is permanently logged to the audit trail with the requester's name, timestamp, and reason.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Explanatory Reason for Reopening *
            </label>
            <textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="e.g. Correcting two incorrectly recorded lunch entries from Bazar day..."
              rows={3}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0', maxHeight: 400, overflowY: 'auto' }}>
          {auditEvents.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: 20 }}>
              No audit events recorded for this period yet.
            </p>
          ) : (
            auditEvents.map((event) => (
              <div
                key={event.id}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge variant="neutral">{event.eventType}</Badge>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#1e293b', marginTop: 4 }}>
                  {event.notes || 'No extra notes provided'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
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
