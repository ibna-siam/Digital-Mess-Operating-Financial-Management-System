import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Zap,
  Home,
  Wifi,
  UserCheck,
  Flame,
  Droplet,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Gauge,
  DollarSign,
  Search,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { PageLoader } from '../components/ui/StateComponents.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import { useDataSync } from '../hooks/useDataSync.js';
import { MessMember } from '../types/index.js';

interface UnifiedBillItem {
  id: string;
  source: 'BILL' | 'UTILITY';
  title: string;
  category: string;
  group: 'FIXED' | 'UTILITY';
  amount: number;
  billingPeriod: string;
  dueDate: string;
  billingDate?: string;
  status: string;
  isRecurring?: boolean;
  paidByMemberId?: string | null;
  paidByName?: string | null;
  paidAt?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
  meterIdentifier?: string | null;
  previousReading?: number | null;
  currentReading?: number | null;
  consumedUnits?: number | null;
  unitRate?: number | null;
  fixedCharges?: number | null;
  additionalCharges?: number | null;
  gasType?: string | null;
  cylinderCount?: number | null;
  maidName?: string | null;
  baseSalary?: number | null;
  isPosted?: boolean;
  postedAt?: string | null;
  createdAt: string;
}

interface PaymentHistoryItem {
  id: string;
  billId: string;
  source: 'BILL' | 'UTILITY';
  title: string;
  category: string;
  group: 'FIXED' | 'UTILITY';
  amount: number;
  paidByMemberId: string | null;
  paidByName: string | null;
  paymentMethod: string;
  paidAt: string;
  receiptUrl?: string | null;
  notes?: string | null;
  status: string;
}

interface OverviewData {
  summary: {
    totalMonthlyCost: number;
    totalBills: number;
    totalUtilities: number;
    totalPaid: number;
    totalPending: number;
    billsCount: number;
    currentPeriod: string;
  };
  fixedBills: UnifiedBillItem[];
  utilities: UnifiedBillItem[];
  paymentHistory: PaymentHistoryItem[];
  meterReadings: any[];
  templates: any[];
}

export const BillsUtilitiesPage: React.FC = () => {
  const { activeMess } = useAuth();
  const messId = activeMess?.id || '';
  const isManager = activeMess?.myRole === 'OWNER' || activeMess?.myRole === 'MANAGER';

  // State
  const [currentPeriod, setCurrentPeriod] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'fixed' | 'utilities' | 'payments'>('overview');
  const [data, setData] = useState<OverviewData | null>(null);
  const [members, setMembers] = useState<MessMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addMode, setAddMode] = useState<'FIXED' | 'UTILITY'>('FIXED');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New Bill Form States
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Rent');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newNotes, setNewNotes] = useState('');
  // Meter specifics
  const [meterCurrent, setMeterCurrent] = useState('');
  const [meterPrev, setMeterPrev] = useState('0');
  const [meterRate, setMeterRate] = useState('10.5');
  const [demandCharge, setDemandCharge] = useState('150');

  // Pay Modal
  const [payingItem, setPayingItem] = useState<UnifiedBillItem | null>(null);
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BKASH');
  const [paidAtDate, setPaidAtDate] = useState(new Date().toISOString().split('T')[0]);

  // Load Data
  const loadData = async () => {
    if (!messId) return;
    try {
      setIsLoading(true);
      const [overviewRes, membersRes] = await Promise.all([
        apiClient<OverviewData>(`/messes/${messId}/bills-utilities/overview?periodKey=${currentPeriod}`).catch(
          async () => {
            // Graceful fallback: construct from existing separate APIs
            const [simpleBills, utilityBills] = await Promise.all([
              apiClient<any[]>(`/messes/${messId}/bills?billingPeriod=${currentPeriod}`).catch(() => []),
              apiClient<any[]>(`/messes/${messId}/utilities?periodKey=${currentPeriod}`).catch(() => []),
            ]);

            const fixedList: UnifiedBillItem[] = simpleBills.map((b) => ({
              id: b.id,
              source: 'BILL',
              title: b.name,
              category: b.category,
              group: 'FIXED',
              amount: Number(b.amount),
              billingPeriod: b.billingPeriod,
              dueDate: b.dueDate,
              status: b.status,
              paidByMemberId: b.paidByMemberId,
              paidByName: b.paidByName,
              paidAt: b.paidAt,
              paymentMethod: b.paymentMethod,
              notes: b.notes,
              createdAt: b.dueDate,
            }));

            const utilityList: UnifiedBillItem[] = utilityBills.map((u) => ({
              id: u.id,
              source: 'UTILITY',
              title: u.title,
              category: u.category,
              group: u.category === 'RENT' || u.category === 'WIFI' || u.category === 'MAID' ? 'FIXED' : 'UTILITY',
              amount: Number(u.amount),
              billingPeriod: u.billingPeriod,
              dueDate: u.dueDate,
              status: u.status,
              paidByMemberId: u.paidByMemberId,
              paidByName: u.paidByName,
              paidAt: u.paidAt,
              paymentMethod: u.paymentMethod,
              notes: u.notes,
              meterIdentifier: u.meterIdentifier,
              previousReading: u.previousReading,
              currentReading: u.currentReading,
              consumedUnits: u.consumedUnits,
              unitRate: u.unitRate,
              isPosted: u.isPosted,
              postedAt: u.postedAt,
              createdAt: u.createdAt,
            }));

            const allItems = [...fixedList, ...utilityList];
            const tBills = allItems.filter((i) => i.group === 'FIXED').reduce((s, i) => s + i.amount, 0);
            const tUtils = allItems.filter((i) => i.group === 'UTILITY').reduce((s, i) => s + i.amount, 0);
            const tCost = tBills + tUtils;
            const tPaid = allItems.filter((i) => i.status === 'PAID' || i.isPosted || i.paidAt).reduce((s, i) => s + i.amount, 0);

            return {
              summary: {
                totalMonthlyCost: tCost,
                totalBills: tBills,
                totalUtilities: tUtils,
                totalPaid: tPaid,
                totalPending: Math.max(0, tCost - tPaid),
                billsCount: allItems.length,
                currentPeriod,
              },
              fixedBills: allItems.filter((i) => i.group === 'FIXED'),
              utilities: allItems.filter((i) => i.group === 'UTILITY'),
              paymentHistory: [],
              meterReadings: [],
              templates: [],
            };
          }
        ),
        apiClient<MessMember[]>(`/messes/${messId}/members`).catch(() => []),
      ]);

      setData(overviewRes);
      const activeMembers = membersRes.filter((m) => m.status === 'ACTIVE');
      setMembers(activeMembers);
      if (activeMembers.length > 0 && !paidByMemberId) {
        setPaidByMemberId(activeMembers[0].id);
      }
    } catch (err) {
      console.error('Failed to load Bills & Utilities overview', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [messId, currentPeriod]);

  useDataSync(['bills', 'utilities'], loadData);

  // Category Icon helper
  const getCategoryIcon = (category: string) => {
    const norm = category.toUpperCase();
    if (norm.includes('RENT')) return <Home size={18} className="text-blue-500" />;
    if (norm.includes('WIFI') || norm.includes('INTERNET')) return <Wifi size={18} className="text-indigo-500" />;
    if (norm.includes('MAID') || norm.includes('COOK')) return <UserCheck size={18} className="text-pink-500" />;
    if (norm.includes('ELEC')) return <Zap size={18} className="text-amber-500" />;
    if (norm.includes('GAS')) return <Flame size={18} className="text-orange-500" />;
    if (norm.includes('WATER')) return <Droplet size={18} className="text-cyan-500" />;
    return <Receipt size={18} className="text-emerald-500" />;
  };

  // Status Badge helper
  const getStatusBadge = (status: string, isPosted?: boolean) => {
    if (isPosted || status === 'POSTED') {
      return <Badge variant="success">POSTED TO LEDGER</Badge>;
    }
    switch (status) {
      case 'PAID':
        return <Badge variant="success">PAID</Badge>;
      case 'APPROVED':
        return <Badge variant="primary">APPROVED</Badge>;
      case 'DUE':
        return <Badge variant="warning">DUE SOON</Badge>;
      case 'OVERDUE':
        return <Badge variant="danger">OVERDUE</Badge>;
      default:
        return <Badge variant="info">PENDING</Badge>;
    }
  };

  // Submit New Bill / Utility
  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const amt = parseFloat(newAmount);
    if (!amt || amt <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!newTitle.trim()) {
      setFormError('Please provide a title or description.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (addMode === 'FIXED') {
        // Create in Bill model
        await apiClient(`/messes/${messId}/bills`, {
          method: 'POST',
          body: JSON.stringify({
            name: newTitle.trim(),
            category: newCategory,
            amount: amt,
            billingPeriod: currentPeriod,
            dueDate: newDueDate,
            isRecurring: true,
            notes: newNotes.trim() || undefined,
          }),
        });
      } else {
        // Create in UtilityBill model with meter specifics if electricity
        const curKwh = parseFloat(meterCurrent) || undefined;
        const prevKwh = parseFloat(meterPrev) || 0;
        const consumed = curKwh !== undefined ? Math.max(0, curKwh - prevKwh) : undefined;

        await apiClient(`/messes/${messId}/utilities`, {
          method: 'POST',
          body: JSON.stringify({
            title: newTitle.trim(),
            category: newCategory.toUpperCase(),
            amount: amt,
            billingPeriod: currentPeriod,
            dueDate: newDueDate,
            splitMethod: 'EQUAL',
            currentReading: curKwh,
            previousReading: prevKwh,
            consumedUnits: consumed,
            unitRate: parseFloat(meterRate) || undefined,
            fixedCharges: parseFloat(demandCharge) || undefined,
            notes: newNotes.trim() || undefined,
          }),
        });
      }

      setIsAddModalOpen(false);
      setNewTitle('');
      setNewAmount('');
      setNewNotes('');
      setActionSuccess(`Record "${newTitle}" created successfully!`);
      setTimeout(() => setActionSuccess(null), 4000);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark Paid Action
  const handlePayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingItem) return;

    try {
      setIsSubmitting(true);
      if (payingItem.source === 'BILL') {
        await apiClient(`/messes/${messId}/bills/${payingItem.id}/pay`, {
          method: 'POST',
          body: JSON.stringify({
            paidByMemberId,
            paymentMethod,
            paidAt: paidAtDate,
          }),
        });
      } else {
        // Approve and post utility bill
        await apiClient(`/messes/${messId}/utilities/${payingItem.id}/approve`, { method: 'POST' }).catch(() => null);
        await apiClient(`/messes/${messId}/utilities/${payingItem.id}/post`, { method: 'POST' });
      }

      setPayingItem(null);
      setActionSuccess(`Payment for "${payingItem.title}" recorded successfully!`);
      setTimeout(() => setActionSuccess(null), 4000);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Utility Actions (Approve & Post to Ledger)
  const handleApproveUtility = async (uId: string) => {
    try {
      await apiClient(`/messes/${messId}/utilities/${uId}/approve`, { method: 'POST' });
      setActionSuccess('Utility bill approved.');
      setTimeout(() => setActionSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
    }
  };

  const handlePostUtility = async (uId: string) => {
    try {
      await apiClient(`/messes/${messId}/utilities/${uId}/post`, { method: 'POST' });
      setActionSuccess('Utility bill posted to Shared Ledger!');
      setTimeout(() => setActionSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Posting failed.');
    }
  };

  if (isLoading && !data) {
    return <PageLoader message="Loading Bills & Utilities intelligence..." />;
  }

  const summary = data?.summary || {
    totalMonthlyCost: 0,
    totalBills: 0,
    totalUtilities: 0,
    totalPaid: 0,
    totalPending: 0,
    billsCount: 0,
    currentPeriod,
  };

  // Filter lists
  const filterList = (items: UnifiedBillItem[]) => {
    return items.filter((item) => {
      const matchQuery =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory =
        categoryFilter === 'ALL' || item.category.toUpperCase() === categoryFilter.toUpperCase();
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PAID' && (item.status === 'PAID' || item.isPosted)) ||
        (statusFilter === 'PENDING' && item.status !== 'PAID' && !item.isPosted);
      return matchQuery && matchCategory && matchStatus;
    });
  };

  const filteredFixedBills = filterList(data?.fixedBills || []);
  const filteredUtilities = filterList(data?.utilities || []);

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Header & Global Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Bills & Utilities
            </h1>
            <Badge variant="primary" size="sm">
              Unified Financials
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Single consolidated command center for recurring bills, house rent, utilities & payment vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-xs">
            <Calendar size={15} className="text-slate-400 mr-2 shrink-0" />
            <input
              type="month"
              value={currentPeriod}
              onChange={(e) => setCurrentPeriod(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Manager Action */}
          {isManager && (
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={() => {
                setFormError(null);
                setIsAddModalOpen(true);
              }}
            >
              <span className="hidden sm:inline">Record Bill / Utility</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
        </div>
      </div>

      {/* Action Success Toast */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* 2. Monthly Summary Metrics (Mobile Hero + Desktop 5-Grid) */}
      {/* Mobile Card (< lg) */}
      <div className="block lg:hidden">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white p-5 shadow-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Total Household Commitments
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
              {currentPeriod}
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tracking-tight">
              ৳{summary.totalMonthlyCost.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({summary.billsCount} records)
            </span>
          </div>

          {/* 4-Stat Mobile Sub-Grid */}
          <div className="mt-4 pt-3.5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <Receipt size={11} /> Fixed Bills
              </div>
              <div className="text-sm font-black text-white font-mono mt-0.5">
                ৳{summary.totalBills.toLocaleString()}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <Zap size={11} /> Utilities
              </div>
              <div className="text-sm font-black text-white font-mono mt-0.5">
                ৳{summary.totalUtilities.toLocaleString()}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={11} /> Cleared
              </div>
              <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                ৳{summary.totalPaid.toLocaleString()}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock size={11} /> Pending
              </div>
              <div className="text-sm font-black text-rose-400 font-mono mt-0.5">
                ৳{summary.totalPending.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop 5-Grid (hidden on mobile, lg:grid) */}
      <div className="hidden lg:grid grid-cols-5 gap-3">
        {/* Total Cost */}
        <div className="kpi-card p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Monthly Cost</span>
            <div className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              ৳{summary.totalMonthlyCost.toLocaleString()}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{summary.billsCount} records in {currentPeriod}</p>
          </div>
        </div>

        {/* Fixed Bills */}
        <div className="kpi-card p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">Fixed / Recurring</span>
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-lg">
              <Receipt size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              ৳{summary.totalBills.toLocaleString()}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Rent, WiFi, Maid Salary</p>
          </div>
        </div>

        {/* Variable Utilities */}
        <div className="kpi-card p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Utilities</span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-lg">
              <Zap size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
              ৳{summary.totalUtilities.toLocaleString()}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Electricity, Gas, Water</p>
          </div>
        </div>

        {/* Paid / Cleared */}
        <div className="kpi-card p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Paid / Posted</span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-lg">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              ৳{summary.totalPaid.toLocaleString()}
            </h2>
            <p className="text-[11px] text-emerald-600/80 mt-0.5">Cleared in ledger</p>
          </div>
        </div>

        {/* Pending Action */}
        <div className="kpi-card p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Pending Due</span>
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-lg">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              ৳{summary.totalPending.toLocaleString()}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Awaiting payment / post</p>
          </div>
        </div>
      </div>

      {/* 3. Modern Segmented Tab Navigation Slider */}
      <div className="bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 touch-spring active:scale-95 ${
            activeTab === 'overview'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Gauge size={15} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('fixed')}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 touch-spring active:scale-95 ${
            activeTab === 'fixed'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Receipt size={15} />
          <span>Fixed Bills</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            activeTab === 'fixed'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-black'
              : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}>
            {data?.fixedBills.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('utilities')}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 touch-spring active:scale-95 ${
            activeTab === 'utilities'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Zap size={15} />
          <span>Utilities</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            activeTab === 'utilities'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-black'
              : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}>
            {data?.utilities.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 touch-spring active:scale-95 ${
            activeTab === 'payments'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <CreditCard size={15} />
          <span>Payments</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            activeTab === 'payments'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-black'
              : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}>
            {data?.paymentHistory.length || 0}
          </span>
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Progress / Settlement Ratio Bar */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Monthly Settlement Completion ({currentPeriod})
              </h3>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {summary.totalMonthlyCost > 0
                  ? Math.round((summary.totalPaid / summary.totalMonthlyCost) * 100)
                  : 100}
                % Cleared
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{
                  width: `${
                    summary.totalMonthlyCost > 0
                      ? (summary.totalPaid / summary.totalMonthlyCost) * 100
                      : 0
                  }%`,
                }}
              />
              <div
                className="bg-rose-400 h-full transition-all duration-500"
                style={{
                  width: `${
                    summary.totalMonthlyCost > 0
                      ? (summary.totalPending / summary.totalMonthlyCost) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Paid: ৳{summary.totalPaid.toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                Pending: ৳{summary.totalPending.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Quick Split: Fixed vs Utilities Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fixed Summary Preview */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Receipt className="text-indigo-500" size={18} />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fixed / Recurring Bills</h3>
                </div>
                <button
                  onClick={() => setActiveTab('fixed')}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  View All ({data?.fixedBills.length || 0}) <ArrowUpRight size={12} />
                </button>
              </div>

              <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-700/60">
                {(data?.fixedBills || []).slice(0, 4).map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{item.title}</div>
                        <div className="text-[11px] text-slate-500">Due: {item.dueDate}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        ৳{item.amount.toLocaleString()}
                      </div>
                      <div>{getStatusBadge(item.status, item.isPosted)}</div>
                    </div>
                  </div>
                ))}

                {(data?.fixedBills || []).length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-400">No fixed bills recorded for {currentPeriod}.</p>
                )}
              </div>
            </div>

            {/* Utilities Summary Preview */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Zap className="text-amber-500" size={18} />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Variable Utilities</h3>
                </div>
                <button
                  onClick={() => setActiveTab('utilities')}
                  className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
                >
                  View All ({data?.utilities.length || 0}) <ArrowUpRight size={12} />
                </button>
              </div>

              <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-700/60">
                {(data?.utilities || []).slice(0, 4).map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{item.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.consumedUnits ? `${item.consumedUnits} kWh units • ` : ''}
                          Due: {item.dueDate}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        ৳{item.amount.toLocaleString()}
                      </div>
                      <div>{getStatusBadge(item.status, item.isPosted)}</div>
                    </div>
                  </div>
                ))}

                {(data?.utilities || []).length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-400">No variable utilities recorded for {currentPeriod}.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FIXED / RECURRING BILLS */}
      {activeTab === 'fixed' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search rent, wifi, maid salary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">Paid / Posted</option>
                <option value="PENDING">Pending / Due</option>
              </select>
            </div>
          </div>

          {/* List Feed */}
          <div className="space-y-2.5">
            {filteredFixedBills.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                      <Badge variant="info" size="sm">{item.category}</Badge>
                      {item.isRecurring && <Badge variant="neutral" size="sm">Recurring</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span>Due: {item.dueDate}</span>
                      <span>•</span>
                      <span>Period: {item.billingPeriod}</span>
                      {item.notes && (
                        <>
                          <span>•</span>
                          <span className="italic truncate max-w-xs">{item.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700">
                  <div className="sm:text-right">
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                      ৳{item.amount.toLocaleString()}
                    </div>
                    <div>{getStatusBadge(item.status, item.isPosted)}</div>
                  </div>

                  {isManager && item.status !== 'PAID' && !item.isPosted && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<CheckCircle2 size={14} />}
                      onClick={() => {
                        setPayingItem(item);
                        setPaidAtDate(new Date().toISOString().split('T')[0]);
                      }}
                    >
                      Mark Paid
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {filteredFixedBills.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <Receipt size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Fixed Bills Found</p>
                <p className="text-xs text-slate-400 mt-1">No bills matching your current filter in {currentPeriod}.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: UTILITIES */}
      {activeTab === 'utilities' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search electricity, gas, water bills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="ELECTRICITY">Electricity</option>
                <option value="GAS">Gas</option>
                <option value="WATER">Water</option>
                <option value="OTHER">Other Utilities</option>
              </select>
            </div>
          </div>

          {/* List Feed */}
          <div className="space-y-2.5">
            {filteredUtilities.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                      <Badge variant="warning" size="sm">{item.category}</Badge>
                      {item.consumedUnits ? (
                        <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
                          {item.consumedUnits} kWh ({item.previousReading || 0} → {item.currentReading || 0})
                        </span>
                      ) : null}
                      {item.gasType && (
                        <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 dark:bg-orange-950/50 px-2 py-0.5 rounded-md">
                          Gas: {item.gasType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span>Due: {item.dueDate}</span>
                      <span>•</span>
                      <span>Period: {item.billingPeriod}</span>
                      {item.unitRate && <span>• Rate: ৳{item.unitRate}/unit</span>}
                      {item.isPosted && (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          • <ShieldCheck size={13} /> Posted to Ledger
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700">
                  <div className="sm:text-right">
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                      ৳{item.amount.toLocaleString()}
                    </div>
                    <div>{getStatusBadge(item.status, item.isPosted)}</div>
                  </div>

                  {/* Manager Controls for Utilities */}
                  {isManager && (
                    <div className="flex items-center gap-1.5">
                      {!item.isPosted && item.status !== 'POSTED' && item.status !== 'APPROVED' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleApproveUtility(item.id)}
                        >
                          Approve
                        </Button>
                      )}
                      {!item.isPosted && item.status !== 'POSTED' && (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<CheckCircle2 size={13} />}
                          onClick={() => handlePostUtility(item.id)}
                        >
                          Post Ledger
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredUtilities.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <Zap size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Utilities Found</p>
                <p className="text-xs text-slate-400 mt-1">No utility bills recorded for {currentPeriod}.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENT HISTORY */}
      {activeTab === 'payments' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Cleared Vouchers & Receipts ({data?.paymentHistory.length || 0})
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {(data?.paymentHistory || []).map((pay) => (
                <div key={pay.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{pay.title}</span>
                        <Badge variant="neutral" size="sm">{pay.category}</Badge>
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          {pay.paymentMethod}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Paid on {pay.paidAt.split('T')[0]} • Paid by <span className="font-semibold text-slate-700 dark:text-slate-300">{pay.paidByName || 'Mess Pool'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                      ৳{pay.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}

              {(data?.paymentHistory || []).length === 0 && (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No payment vouchers cleared for this period yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. MODALS */}

      {/* ADD BILL / UTILITY MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Bill or Utility"
      >
        <form onSubmit={handleCreateRecord} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* Selector: Fixed Recurring vs Variable Utility */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAddMode('FIXED');
                setNewCategory('Rent');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                addMode === 'FIXED'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              <Receipt size={14} /> Fixed / Recurring
            </button>
            <button
              type="button"
              onClick={() => {
                setAddMode('UTILITY');
                setNewCategory('ELECTRICITY');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                addMode === 'UTILITY'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              <Zap size={14} /> Variable Utility
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Title / Expense Name *
            </label>
            <input
              type="text"
              required
              placeholder={addMode === 'FIXED' ? 'e.g., September House Rent' : 'e.g., Main Floor Electricity'}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          {/* Category & Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
              {addMode === 'FIXED' ? (
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                >
                  <option value="Rent">House Rent</option>
                  <option value="WiFi">Wi-Fi Internet</option>
                  <option value="Maid">Maid / Cook Salary</option>
                  <option value="Cleaning">Waste & Cleaning</option>
                  <option value="Other">Other Fixed Bill</option>
                </select>
              ) : (
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                >
                  <option value="ELECTRICITY">Electricity</option>
                  <option value="GAS">LP Gas Refill</option>
                  <option value="WATER">Water Supply</option>
                  <option value="MAINTENANCE">Facility Maintenance</option>
                  <option value="OTHER">Other Variable</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (৳) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="4500"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Electricity Meter helper fields */}
          {addMode === 'UTILITY' && newCategory === 'ELECTRICITY' && (
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 space-y-2">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider">
                Electric Meter Sub-Reading (Optional)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-slate-500">Previous Reading</label>
                  <input
                    type="number"
                    value={meterPrev}
                    onChange={(e) => setMeterPrev(e.target.value)}
                    className="w-full p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-500">Current Reading</label>
                  <input
                    type="number"
                    placeholder="kWh"
                    value={meterCurrent}
                    onChange={(e) => setMeterCurrent(e.target.value)}
                    className="w-full p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-500">Rate / kWh (৳)</label>
                  <input
                    type="number"
                    value={meterRate}
                    onChange={(e) => setMeterRate(e.target.value)}
                    className="w-full p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-500">Demand Charge (৳)</label>
                  <input
                    type="number"
                    value={demandCharge}
                    onChange={(e) => setDemandCharge(e.target.value)}
                    className="w-full p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Due Date & Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Voucher Reference</label>
            <input
              type="text"
              placeholder="e.g., Paid via bKash TxID 9J8F7G..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save & Allocate'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MARK PAID MODAL */}
      <Modal
        isOpen={Boolean(payingItem)}
        onClose={() => setPayingItem(null)}
        title={`Record Payment for ${payingItem?.title || 'Bill'}`}
      >
        <form onSubmit={handlePayBill} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
            <span className="text-xs text-slate-500">Payable Amount:</span>
            <span className="text-base font-black text-slate-900 dark:text-white font-mono">
              ৳{payingItem?.amount.toLocaleString()}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Paid By Member</label>
            <select
              value={paidByMemberId}
              onChange={(e) => setPaidByMemberId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || 'Member'} ({m.roomNo || 'Room N/A'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              >
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="CASH">Cash</option>
                <option value="BANK">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date Paid</label>
              <input
                type="date"
                value={paidAtDate}
                onChange={(e) => setPaidAtDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setPayingItem(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Confirm Payment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
