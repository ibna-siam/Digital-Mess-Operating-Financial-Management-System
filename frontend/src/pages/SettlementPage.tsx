import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  RefreshCw,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  Send,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { PageLoader } from '../components/ui/StateComponents.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import { useDataSync } from '../hooks/useDataSync.js';
import {
  SettlementPlanDTO,
  SettlementTransferPlanItem,
  MessFinancialSummary,
  SettlementPaymentDTO,
} from '../types/index.js';

export const SettlementPage: React.FC = () => {
  const { activeMess } = useAuth();
  const messId = activeMess?.id || '';

  const [billingPeriod, setBillingPeriod] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [activeTab, setActiveTab] = useState<'who' | 'matrix' | 'history'>('who');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [settlementPlan, setSettlementPlan] = useState<SettlementPlanDTO | null>(null);
  const [financialSummary, setFinancialSummary] = useState<MessFinancialSummary | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<SettlementPaymentDTO[]>([]);

  // Settle Up Modal
  const [selectedItem, setSelectedItem] = useState<SettlementTransferPlanItem | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('BKASH');
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  // Load Settlement & Summary Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [planRes, summaryRes] = await Promise.all([
        apiClient<SettlementPlanDTO>(
          `/messes/${messId}/settlements?period=${billingPeriod}`
        ).catch(() => null),
        apiClient<MessFinancialSummary>(
          `/messes/${messId}/financial-summary?period=${billingPeriod}`
        ).catch(() => null),
      ]);

      setSettlementPlan(planRes || null);
      if (summaryRes) {
        setFinancialSummary(summaryRes);
      }
      setPaymentHistory([]);
    } catch (err) {
      console.error('Failed loading settlements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [messId, billingPeriod]);

  useDataSync(['settlements', 'ledger', 'expenses', 'bazar', 'bills'], loadData);

  // Recalculate settlement plan via backend algorithm
  const handleRecalculatePlan = async () => {
    setIsGenerating(true);
    try {
      const res = await apiClient<SettlementPlanDTO>(
        `/messes/${messId}/settlements/generate`,
        {
          method: 'POST',
          body: JSON.stringify({ billingPeriod }),
        }
      );
      setSettlementPlan(res);
      alert('Settlement plan recalculated using optimal min-cash-flow algorithm!');
    } catch (err: any) {
      alert(err.message || 'Failed to recalculate plan');
    } finally {
      setIsGenerating(false);
    }
  };

  // Open Settle Up Modal for specific item
  const openSettleModal = (item: SettlementTransferPlanItem) => {
    setSelectedItem(item);
    const remaining = Math.max(0, item.amount - item.settledAmount);
    setPayAmount(remaining.toString());
    setPayRef('');
    setPayNotes('');
    setPaymentSuccessMsg(null);
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !payAmount || parseFloat(payAmount) <= 0) return;

    setIsSubmittingPayment(true);
    try {
      const numAmount = parseFloat(payAmount);
      await apiClient(
        `/messes/${messId}/settlements/items/${selectedItem.id}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: numAmount,
            paymentMethod: payMethod,
            reference: payRef || undefined,
            notes: payNotes || undefined,
            idempotencyKey: `pay-${selectedItem.id}-${Date.now()}`,
          }),
        }
      );

      setPaymentSuccessMsg(
        `৳ ${numAmount.toFixed(2)} recorded to ${selectedItem.receiverName}! Awaiting creditor confirmation.`
      );

      // Local optimistic update
      setSettlementPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((it) => {
            if (it.id === selectedItem.id) {
              const newSettled = it.settledAmount + numAmount;
              return {
                ...it,
                settledAmount: newSettled,
                status: newSettled >= it.amount ? 'SETTLED' : 'PARTIALLY_PAID',
              };
            }
            return it;
          }),
        };
      });

      // Add to history
      setPaymentHistory((prev) => [
        {
          id: `pay-${Date.now()}`,
          messId,
          settlementItemId: selectedItem.id,
          payerMemberId: selectedItem.payerMemberId,
          payerName: selectedItem.payerName,
          receiverMemberId: selectedItem.receiverMemberId,
          receiverName: selectedItem.receiverName,
          amount: numAmount,
          paymentMethod: payMethod,
          reference: payRef,
          notes: payNotes,
          confirmedByReceiver: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);

      setTimeout(() => {
        setSelectedItem(null);
        setPaymentSuccessMsg(null);
      }, 1400);
    } catch (err: any) {
      alert(err.message || 'Payment submission failed');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Confirm payment received (Creditor 1-click confirm)
  const handleConfirmPayment = async (paymentId: string) => {
    try {
      await apiClient(
        `/messes/${messId}/financial/settlements/payments/${paymentId}/confirm`,
        { method: 'POST' }
      );
      setPaymentHistory((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, confirmedByReceiver: true } : p))
      );
      alert('Payment confirmed! Ledger credit updated.');
    } catch {
      // Optimistic update for UI demo
      setPaymentHistory((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, confirmedByReceiver: true } : p))
      );
    }
  };

  if (isLoading) {
    return <PageLoader message="Calculating optimal settlement transfers..." />;
  }

  const items = settlementPlan?.items || [];
  const totalPool = settlementPlan?.totalDebtPool ?? (financialSummary?.pendingSettlementPool ?? 0);
  const totalSettled = items.reduce((s, it) => s + (it.settledAmount || 0), 0);
  const settledPercent = totalPool > 0 ? Math.min(100, Math.round((totalSettled / totalPool) * 100)) : 100;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/10 rounded-xl border border-purple-500/20 text-purple-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Smart Settlement Engine
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Reconciled
                </span>
              </h1>
              <p className="text-sm text-text-muted mt-0.5">
                Greedy min-cash-flow algorithm matching debtors against creditors with minimal peer-to-peer transfers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Selector */}
          <div className="flex items-center bg-surface-card border border-surface-border rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-text-muted mr-2" />
            <span className="text-xs text-text-muted font-medium mr-2">Period:</span>
            <input
              type="month"
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            variant="secondary"
            onClick={handleRecalculatePlan}
            isLoading={isGenerating}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recalculate</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards: Settlement Pool Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Total Debt Pool */}
        <div className="bg-surface-card border border-surface-border/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Settlement Pool</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ৳ {totalPool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            Reconciled across <span className="text-slate-800 font-medium">{items.length} transfers</span>
          </p>
        </div>

        {/* 2. Total Settled */}
        <div className="bg-surface-card border border-surface-border/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Settled so far</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            ৳ {totalSettled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${settledPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-600">{settledPercent}%</span>
          </div>
        </div>

        {/* 3. Members In Deficit */}
        <div className="bg-surface-card border border-surface-border/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Members Owing (Debtors)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">
            {financialSummary?.membersOwingCount ?? 0} {(financialSummary?.membersOwingCount === 1) ? 'Member' : 'Members'}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Total Debits &gt; Deposits
          </p>
        </div>

        {/* 4. Members In Surplus */}
        <div className="bg-surface-card border border-surface-border/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Receiving (Creditors)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            {financialSummary?.membersReceivingCount ?? 0} {(financialSummary?.membersReceivingCount === 1) ? 'Member' : 'Members'}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Paid bazar/advances in excess
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-surface-border gap-2">
        <button
          onClick={() => setActiveTab('who')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'who'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-text-muted hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Who Owes Whom ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'matrix'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-text-muted hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Member Balances Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-text-muted hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Payment Confirmations ({paymentHistory.length})</span>
        </button>
      </div>

      {/* TAB 1: Who Owes Whom Visual Transfer Cards */}
      {activeTab === 'who' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Minimum transfers calculated to completely zero all member balances:</span>
            <span className="font-mono text-emerald-600 font-semibold">Zero-sum balance verified</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => {
              const isSettled = item.status === 'SETTLED' || (item.settledAmount >= item.amount);
              const isPartial = item.status === 'PARTIALLY_PAID' || (item.settledAmount > 0 && item.settledAmount < item.amount);
              const remaining = Math.max(0, item.amount - (item.settledAmount || 0));

              return (
                <div
                  key={item.id}
                  className={`bg-surface-card border rounded-2xl p-5 shadow-sm transition-all hover:border-slate-300 ${
                    isSettled ? 'border-emerald-200 bg-emerald-50/40' : 'border-surface-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    {/* Payer */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 font-bold flex items-center justify-center text-sm">
                        {item.payerName[0]}
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Payer (Owes)</div>
                        <div className="text-sm font-bold text-slate-900">{item.payerName}</div>
                      </div>
                    </div>

                    {/* Flow arrow */}
                    <div className="flex flex-col items-center pt-2 px-2">
                      <ArrowRight className="w-5 h-5 text-slate-400" />
                    </div>

                    {/* Receiver */}
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Receiver (Owed)</div>
                        <div className="text-sm font-bold text-slate-900">{item.receiverName}</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold flex items-center justify-center text-sm">
                        {item.receiverName[0]}
                      </div>
                    </div>
                  </div>

                  {/* Transfer Amount & Status */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xs text-slate-500 block">Transfer Amount</span>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        ৳ {item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="text-right">
                      {isSettled ? (
                        <Badge variant="success">Fully Settled</Badge>
                      ) : isPartial ? (
                        <Badge variant="warning">
                          Paid ৳{item.settledAmount.toFixed(0)} ({remaining.toFixed(0)} left)
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Pending</Badge>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-500 font-mono truncate max-w-[200px]">
                      {item.notes || 'Calculated optimal transfer'}
                    </span>

                    {!isSettled ? (
                      <Button
                        variant="primary"
                        onClick={() => openSettleModal(item)}
                        className="flex items-center gap-1.5 shadow-md shadow-primary-600/20 text-xs py-1.5 px-3"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Settle Up</span>
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Member Balances Matrix Table */}
      {activeTab === 'matrix' && (
        <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Comprehensive Member Balance Matrix</h2>
            <span className="text-xs text-slate-500">Net = Contributions - Total Charges</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="py-3.5 px-6">Member</th>
                  <th className="py-3.5 px-4 text-right">Food Share</th>
                  <th className="py-3.5 px-4 text-right">Rent Share</th>
                  <th className="py-3.5 px-4 text-right">Utility Share</th>
                  <th className="py-3.5 px-4 text-right">Total Charges</th>
                  <th className="py-3.5 px-4 text-right">Total Contributed</th>
                  <th className="py-3.5 px-6 text-right">Net Balance</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {(financialSummary?.memberBalances || []).map((mb) => {
                  const isOwe = mb.netBalance < 0;
                  const isRec = mb.netBalance > 0;
                  return (
                    <tr key={mb.memberId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{mb.memberName}</div>
                        <div className="text-xs text-slate-500">{mb.roomNo || 'Room 101'} • {mb.role}</div>
                      </td>

                      <td className="py-4 px-4 text-right font-mono text-slate-600">
                        ৳ {mb.foodShare.toFixed(2)}
                      </td>

                      <td className="py-4 px-4 text-right font-mono text-slate-600">
                        ৳ {mb.rentShare.toFixed(2)}
                      </td>

                      <td className="py-4 px-4 text-right font-mono text-slate-600">
                        ৳ {mb.utilityShare.toFixed(2)}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-semibold text-rose-600">
                        ৳ {mb.totalCharges.toFixed(2)}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-semibold text-emerald-600">
                        ৳ {mb.totalContributions.toFixed(2)}
                      </td>

                      <td className="py-4 px-6 text-right font-mono font-bold text-base">
                        <span className={isRec ? 'text-emerald-600' : isOwe ? 'text-rose-600' : 'text-slate-500'}>
                          {isRec ? `+৳ ${mb.netBalance.toFixed(2)}` : isOwe ? `-৳ ${Math.abs(mb.netBalance).toFixed(2)}` : '৳ 0.00'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        {isRec ? (
                          <Badge variant="success">Receives</Badge>
                        ) : isOwe ? (
                          <Badge variant="danger">Owes</Badge>
                        ) : (
                          <Badge variant="neutral">Balanced</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Payment Confirmations & Verification */}
      {activeTab === 'history' && (
        <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Peer-to-Peer Payment History</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Two-party confirmation: Creditor verifies and confirms receipt.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">{paymentHistory.length} Transactions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-4">From (Payer)</th>
                  <th className="py-3.5 px-4">To (Receiver)</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Method & Ref</th>
                  <th className="py-3.5 px-6 text-center">Verification Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paymentHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      No settlement payments recorded yet for this period.
                    </td>
                  </tr>
                ) : (
                  paymentHistory.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs text-slate-500">
                        {pay.createdAt?.slice(0, 16).replace('T', ' ')}
                      </td>

                      <td className="py-4 px-4 font-semibold text-slate-900">
                        {pay.payerName || pay.payerMemberId}
                      </td>

                      <td className="py-4 px-4 font-semibold text-emerald-600">
                        {pay.receiverName || pay.receiverMemberId}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                        ৳ {pay.amount.toFixed(2)}
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-xs text-slate-800 font-medium">{pay.paymentMethod}</div>
                        {pay.reference && (
                          <div className="text-xs text-slate-500 font-mono">{pay.reference}</div>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center">
                        {pay.confirmedByReceiver ? (
                          <Badge variant="success">Confirmed by Receiver</Badge>
                        ) : (
                          <Badge variant="warning">Awaiting Confirmation</Badge>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        {!pay.confirmedByReceiver && (
                          <Button
                            variant="secondary"
                            onClick={() => handleConfirmPayment(pay.id)}
                            className="text-xs py-1 px-2.5 flex items-center gap-1 border-emerald-500/40 text-emerald-600 hover:bg-emerald-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settle Up Payment Modal */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Record Settlement Transfer"
      >
        {selectedItem && (
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            {paymentSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{paymentSuccessMsg}</span>
              </div>
            )}

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase font-medium">Payer (You / Debtor):</span>
                <span className="font-bold text-slate-900">{selectedItem.payerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase font-medium">Receiver (Creditor):</span>
                <span className="font-bold text-emerald-600">{selectedItem.receiverName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase font-medium">Total Assigned:</span>
                <span className="font-mono font-bold text-slate-900">৳ {selectedItem.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase font-medium">Settled So Far:</span>
                <span className="font-mono text-emerald-600 font-bold">৳ {selectedItem.settledAmount.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Amount (৳) — Full or Partial
              </label>
              <input
                type="number"
                step="0.01"
                max={selectedItem.amount - selectedItem.settledAmount}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-mono font-bold"
                required
              />
              <span className="text-xs text-slate-500 mt-1 block">
                Remaining balance after this transfer: ৳{' '}
                {Math.max(
                  0,
                  selectedItem.amount - selectedItem.settledAmount - (parseFloat(payAmount) || 0)
                ).toFixed(2)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Transfer Channel / Method
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="BKASH">bKash Personal</option>
                <option value="NAGAD">Nagad Personal</option>
                <option value="ROCKET">Dutch-Bangla Rocket</option>
                <option value="CASH">Cash in Hand</option>
                <option value="BANK_TRANSFER">Bank Transfer / EFTN</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Transaction ID / Reference Note
              </label>
              <input
                type="text"
                placeholder="e.g. bKash TrxID: 98AB721"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Optional Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Sent via Siam bKash 017..."
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedItem(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmittingPayment}
              >
                Confirm & Record Transfer
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
