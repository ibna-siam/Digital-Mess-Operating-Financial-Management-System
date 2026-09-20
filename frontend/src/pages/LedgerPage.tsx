import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Filter,
  Calendar,
  DollarSign,
  CheckCircle2,
  RotateCcw,
  User,
  Search,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  CreditCard,
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
  LedgerEntryDTO,
  LedgerEntryType,
  MemberBalanceReport,
  MessFinancialSummary,
  MessMember,
} from '../types/index.js';

export const LedgerPage: React.FC = () => {
  const { activeMess, user } = useAuth();
  const messId = activeMess?.id || '';

  const [billingPeriod, setBillingPeriod] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [members, setMembers] = useState<MessMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntryDTO[]>([]);
  const [financialSummary, setFinancialSummary] = useState<MessFinancialSummary | null>(null);
  const [memberBalance, setMemberBalance] = useState<MemberBalanceReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Record Advance Modal
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceMemberId, setAdvanceMemberId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceMethod, setAdvanceMethod] = useState('CASH');
  const [advanceRef, setAdvanceRef] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [isSubmittingAdvance, setIsSubmittingAdvance] = useState(false);
  const [advanceSuccessMsg, setAdvanceSuccessMsg] = useState<string | null>(null);

  // Selected Entry Audit Trail Modal
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntryDTO | null>(null);
  const [isReversing, setIsReversing] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [membersRes, summaryRes] = await Promise.all([
        apiClient<MessMember[]>(`/messes/${messId}/members`).catch(() => []),
        apiClient<MessFinancialSummary>(
          `/messes/${messId}/financial-summary?period=${billingPeriod}`
        ).catch(() => null),
      ]);

      const activeMems = membersRes.filter((m) => m.status === 'ACTIVE');
      setMembers(activeMems);

      if (summaryRes) {
        setFinancialSummary(summaryRes);
      }

      // Set initial selected member to current logged in user's member ID or first active member
      const myMem = activeMems.find((m) => m.userId === user?.id);
      const targetMemId = myMem?.id || (activeMems.length > 0 ? activeMems[0].id : 'mem-2');
      setSelectedMemberId((prev) => prev || targetMemId);
      setAdvanceMemberId(targetMemId);
    } catch (err) {
      console.error('Failed loading financial ledger data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [messId, billingPeriod, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load ledger entries for selected member
  const fetchLedger = React.useCallback(async () => {
    if (!selectedMemberId) return;
    try {
      const entries = await apiClient<LedgerEntryDTO[]>(
        `/messes/${messId}/ledger?memberId=${selectedMemberId}&period=${billingPeriod}`
      );
      setLedgerEntries(entries || []);
    } catch {
      setLedgerEntries([]);
    }

    // Update specific member balance
    if (financialSummary?.memberBalances) {
      const memBal = financialSummary.memberBalances.find((m) => m.memberId === selectedMemberId);
      if (memBal) setMemberBalance(memBal);
    }
  }, [messId, selectedMemberId, billingPeriod, financialSummary]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  useDataSync(['ledger', 'settlements', 'expenses', 'bazar', 'bills'], () => {
    loadData();
    fetchLedger();
  });

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      const matchesType = filterType === 'ALL' || entry.entryType === filterType;
      const matchesSearch =
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.referenceType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.entryType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [ledgerEntries, filterType, searchQuery]);

  // Submit Advance Handler
  const handleRecordAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceAmount || parseFloat(advanceAmount) <= 0) return;

    setIsSubmittingAdvance(true);
    setAdvanceSuccessMsg(null);
    try {
      await apiClient(`/messes/${messId}/advances`, {
        method: 'POST',
        body: JSON.stringify({
          memberId: advanceMemberId || selectedMemberId,
          amount: parseFloat(advanceAmount),
          paymentMethod: advanceMethod,
          reference: advanceRef || undefined,
          billingPeriod,
          notes: advanceNotes || undefined,
        }),
      });

      setAdvanceSuccessMsg('Advance recorded successfully! Ledger updated with credit entry.');
      setAdvanceAmount('');
      setAdvanceRef('');
      setAdvanceNotes('');
      setTimeout(() => {
        setIsAdvanceModalOpen(false);
        setAdvanceSuccessMsg(null);
        // Refresh
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to record advance');
    } finally {
      setIsSubmittingAdvance(false);
    }
  };

  // Reversal Handler
  const handleReverseEntry = async () => {
    if (!selectedEntry || !reversalReason) return;
    setIsSubmittingReversal(true);
    try {
      await apiClient(`/messes/${messId}/financial/ledger/${selectedEntry.id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason: reversalReason }),
      });
      alert('Entry reversed successfully. Offsetting ledger record created.');
      setIsReversing(false);
      setSelectedEntry(null);
      setReversalReason('');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to reverse entry');
    } finally {
      setIsSubmittingReversal(false);
    }
  };

  const getEntryBadge = (type: LedgerEntryType) => {
    switch (type) {
      case 'FOOD_SHARE':
        return <Badge variant="warning">Food Share</Badge>;
      case 'RENT_SHARE':
        return <Badge variant="neutral">Rent Share</Badge>;
      case 'UTILITY_SHARE':
        return <Badge variant="neutral">Utility Share</Badge>;
      case 'VARIABLE_EXPENSE_SHARE':
        return <Badge variant="info">Expense Share</Badge>;
      case 'BAZAR_CONTRIBUTION':
        return <Badge variant="success">Bazar Paid</Badge>;
      case 'ADVANCE_DEPOSIT':
        return <Badge variant="success">Advance Deposit</Badge>;
      case 'SETTLEMENT_PAYMENT':
        return <Badge variant="info">Settlement</Badge>;
      case 'ADJUSTMENT':
        return <Badge variant="neutral">Adjustment</Badge>;
      case 'REVERSAL':
        return <Badge variant="danger">Reversal</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading authoritative shared ledger..." />;
  }

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const currentNet = memberBalance ? memberBalance.netBalance : -2400.0;
  const isSurplus = currentNet > 0;
  const isBalanced = Math.abs(currentNet) < 0.01;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-600/10 rounded-xl border border-primary-500/20 text-primary-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Shared Financial Ledger
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-600 border border-primary-500/20 font-medium">
                  Authoritative
                </span>
              </h1>
              <p className="text-sm text-text-muted mt-0.5">
                Double-entry transaction audit trail, member charges, deposits, and real-time net balances.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Billing Period Selector */}
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
            variant="primary"
            onClick={() => setIsAdvanceModalOpen(true)}
            className="flex items-center gap-2 shadow-lg shadow-primary-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Record Advance</span>
          </Button>
        </div>
      </div>

      {/* Member Selector Tabs */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-2.5 flex items-center gap-2 overflow-x-auto shadow-sm">
        <div className="text-xs font-semibold text-slate-500 px-3 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          <span>Statement:</span>
        </div>
        {members.map((mem) => {
          const isSelected = mem.id === selectedMemberId;
          return (
            <button
              key={mem.id}
              onClick={() => setSelectedMemberId(mem.id)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                isSelected
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                  : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <span className="font-semibold">{mem.name || 'Member'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-md ${
                isSelected ? 'bg-primary-700 text-primary-100' : 'bg-slate-100 text-slate-600 font-medium'
              }`}>
                {mem.role}
              </span>
            </button>
          );
        })}
      </div>

      {/* KPI Cards: Individual Position for Selected Member */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Food Share */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Food Charges</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            ৳ {memberBalance ? memberBalance.foodShare.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '2,400.00'}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            Rate: <span className="text-amber-600 font-semibold">৳ {financialSummary?.currentMealRate?.toFixed(2) || '60.00'}/meal</span>
          </p>
        </div>

        {/* 2. Fixed Overheads */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Fixed Rent & Utility</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            ৳ {memberBalance ? (memberBalance.rentShare + memberBalance.utilityShare).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '5,000.00'}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Rent (৳ 4,000) + Utilities (৳ 1,000)
          </p>
        </div>

        {/* 3. Paid & Deposited */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Paid & Deposited</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight">
            ৳ {memberBalance ? memberBalance.totalContributions.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '5,000.00'}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            Advances + bazar contributed
          </p>
        </div>

        {/* 4. Net Settlement Position */}
        <div className={`rounded-2xl p-5 relative overflow-hidden shadow-sm border transition-all ${
          isBalanced
            ? 'bg-white border-slate-200'
            : isSurplus
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-rose-50/70 border-rose-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isBalanced ? 'Settlement Position' : isSurplus ? 'You Receive (Surplus)' : 'You Owe (Deficit)'}
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isBalanced ? 'bg-slate-100 text-slate-600' : isSurplus ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
            }`}>
              {isSurplus ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-2xl font-black tracking-tight ${
            isBalanced ? 'text-slate-900' : isSurplus ? 'text-emerald-700' : 'text-rose-600'
          }`}>
            ৳ {Math.abs(currentNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isBalanced ? 'bg-slate-100 text-slate-700' : isSurplus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {isBalanced ? 'Balanced' : isSurplus ? 'Creditor' : 'Debtor'}
            </span>
            <span className="text-xs text-slate-500 font-medium">Net = Credits - Debits</span>
          </div>
        </div>
      </div>

      {/* Ledger Filter & Search Toolbar */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {['ALL', 'FOOD_SHARE', 'RENT_SHARE', 'UTILITY_SHARE', 'ADVANCE_DEPOSIT', 'SETTLEMENT_PAYMENT', 'REVERSAL'].map(
            (type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterType === type
                    ? 'bg-slate-900 text-white font-semibold shadow-sm border border-slate-900'
                    : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {type === 'ALL' ? 'All Transactions' : type.replace(/_/g, ' ')}
              </button>
            )
          )}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search description or ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span>Transaction Audit Log for {selectedMember?.name || 'Selected Member'}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
              {filteredEntries.length} Records
            </span>
          </h2>
          <span className="text-xs text-slate-500">Click row for full immutable audit details</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <th className="py-3 px-6">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-6">Description</th>
                <th className="py-3 px-4 text-right">Debit (Charge)</th>
                <th className="py-3 px-4 text-right">Credit (Deposit)</th>
                <th className="py-3 px-6 text-right">Running Balance</th>
                <th className="py-3 px-4 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <BookOpen className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
                      <p className="font-semibold text-slate-800">No ledger records found</p>
                      <p className="text-xs text-slate-500">
                        No transactions match the selected filter criteria for this period.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isDebit = entry.direction === 'DEBIT';
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-6 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {entry.effectiveDate?.slice(0, 10) || entry.createdAt?.slice(0, 10)}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getEntryBadge(entry.entryType)}
                      </td>

                      {/* Description & Reference */}
                      <td className="py-3.5 px-6 max-w-md">
                        <div className="text-slate-900 font-medium truncate">{entry.description}</div>
                        {entry.referenceId && (
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            Ref: {entry.referenceType} #{entry.referenceId}
                          </div>
                        )}
                      </td>

                      {/* Debit (Charge) */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium whitespace-nowrap">
                        {isDebit ? (
                          <span className="text-rose-600 font-semibold">-৳ {entry.amount.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Credit (Deposit/Paid) */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium whitespace-nowrap">
                        {!isDebit ? (
                          <span className="text-emerald-600 font-semibold">+৳ {entry.amount.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Running Balance */}
                      <td className="py-3.5 px-6 text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            entry.balanceAfter > 0
                              ? 'text-emerald-600'
                              : entry.balanceAfter < 0
                              ? 'text-rose-600'
                              : 'text-slate-600'
                          }
                        >
                          ৳ {entry.balanceAfter.toFixed(2)}
                        </span>
                      </td>

                      {/* Audit Arrow */}
                      <td className="py-3.5 px-4 text-center">
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-transform group-hover:translate-x-0.5 inline-block" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Record Advance Deposit */}
      <Modal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        title="Record Member Advance / Deposit"
        subtitle="Credit member balance directly with cash, mobile money, or bank transfer."
        icon={<Wallet className="w-5 h-5 text-emerald-600" />}
        maxWidth={580}
      >
        <form onSubmit={handleRecordAdvance} className="space-y-4">
          {advanceSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-sm flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-medium">{advanceSuccessMsg}</span>
            </div>
          )}

          {/* Context Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Deposits directly credit the member's account. This payment increases total mess contributions and reduces outstanding member debt in the zero-sum ledger.
            </p>
          </div>

          {/* Member Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Select Member</span>
            </label>
            <div className="relative">
              <select
                value={advanceMemberId}
                onChange={(e) => setAdvanceMemberId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs appearance-none transition-all cursor-pointer"
                required
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id} className="bg-white text-slate-900 py-1">
                    {m.name} ({m.role}){m.roomNo ? ` • ${m.roomNo}` : ''}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>

          {/* Deposit Amount with Quick Fill Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Deposit Amount (BDT)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg select-none">
                ৳
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="0.00"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all"
                required
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                Quick:
              </span>
              {[1000, 3000, 5000, 8000, 10000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAdvanceAmount(amt.toString())}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all shrink-0 cursor-pointer ${
                    advanceAmount === amt.toString()
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  +৳{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Grid: Payment Method & Billing Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Payment Method</span>
              </label>
              <div className="relative">
                <select
                  value={advanceMethod}
                  onChange={(e) => setAdvanceMethod(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs appearance-none transition-all cursor-pointer"
                >
                  <option value="CASH">💵 Cash in Hand</option>
                  <option value="BKASH">📱 bKash</option>
                  <option value="NAGAD">🔶 Nagad</option>
                  <option value="ROCKET">🚀 Rocket</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Billing Period</span>
              </label>
              <input
                type="month"
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all"
                required
              />
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Transaction ID / Reference <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. TRX-BKASH-98AB721 or Bank Slip #104"
              value={advanceRef}
              onChange={(e) => setAdvanceRef(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Notes & Remarks <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Advance deposit for monthly living expenses, rent and bazar pool"
              value={advanceNotes}
              onChange={(e) => setAdvanceNotes(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all resize-none"
            />
          </div>

          {/* Financial Impact Preview */}
          {Number(advanceAmount) > 0 && (
            <div className="p-3 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Credit Impact
                </span>
                <span className="text-xs text-emerald-700">
                  {members.find((m) => m.id === advanceMemberId)?.name || 'Member'} account
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-base text-emerald-600 block">
                  +৳ {Number(advanceAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-600/90 font-medium">
                  Instant Ledger Credit
                </span>
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdvanceModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAdvance || !advanceAmount || Number(advanceAmount) <= 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSubmittingAdvance ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Post Credit Entry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Entry Audit Trail & Reversal */}
      <Modal
        isOpen={!!selectedEntry}
        onClose={() => {
          setSelectedEntry(null);
          setIsReversing(false);
        }}
        title="Ledger Entry Details & Audit Trail"
      >
        {selectedEntry && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 uppercase font-medium">Entry ID</span>
                <span className="font-mono text-xs text-slate-800">{selectedEntry.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 uppercase font-medium">Type</span>
                <div>{getEntryBadge(selectedEntry.entryType)}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 uppercase font-medium">Direction</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    selectedEntry.direction === 'CREDIT'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {selectedEntry.direction}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 uppercase font-medium">Amount</span>
                <span className="font-mono font-bold text-base text-slate-900">
                  ৳ {selectedEntry.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 uppercase font-medium">Balance After</span>
                <span className="font-mono font-bold text-sm text-emerald-600">
                  ৳ {selectedEntry.balanceAfter.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 uppercase font-medium">Effective Date</span>
                <span className="text-xs text-slate-600 font-mono">
                  {selectedEntry.effectiveDate || selectedEntry.createdAt}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-500 uppercase font-medium block mb-1">Description</span>
              <p className="text-sm text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {selectedEntry.description}
              </p>
            </div>

            {selectedEntry.entryType !== 'REVERSAL' && (
              <div className="pt-2 border-t border-slate-200">
                {!isReversing ? (
                  <button
                    type="button"
                    onClick={() => setIsReversing(true)}
                    className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1.5 transition-colors font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reverse this entry (Creates equal & opposite entry)</span>
                  </button>
                ) : (
                  <div className="space-y-3 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                    <p className="text-xs text-rose-800 font-medium">
                      Enter mandatory reason for reversing this financial entry:
                    </p>
                    <input
                      type="text"
                      placeholder="e.g. Erroneous bill amount entered by manager"
                      value={reversalReason}
                      onChange={(e) => setReversalReason(e.target.value)}
                      className="w-full bg-white border border-rose-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsReversing(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={handleReverseEntry}
                        isLoading={isSubmittingReversal}
                        disabled={!reversalReason.trim()}
                      >
                        Confirm Reversal
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
