import React, { useState, useEffect } from 'react';
import {
  Zap,
  Home,
  Flame,
  Droplet,
  Wifi,
  UserCheck,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Layers,
  Gauge,
  Repeat,
  BedDouble,
  DollarSign,
  Send,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { PageLoader } from '../components/ui/StateComponents.js';
import { useDataSync } from '../hooks/useDataSync.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import { MessMember } from '../types/index.js';
import {
  UtilityBill,
  MeterReading,
  RecurringUtilityTemplate,
  Room,
  UtilityMetrics,
  SplitMethod,
} from '../types/utility.js';

export const UtilitiesPage: React.FC = () => {
  const { activeMess } = useAuth();
  const messId = activeMess?.id || '';

  // Tabs
  const [activeTab, setActiveTab] = useState<'bills' | 'meters' | 'recurring' | 'rooms'>('bills');
  const [currentPeriod, setCurrentPeriod] = useState<string>(new Date().toISOString().slice(0, 7));

  // Data states
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [metrics, setMetrics] = useState<UtilityMetrics | null>(null);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [templates, setTemplates] = useState<RecurringUtilityTemplate[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [members, setMembers] = useState<MessMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isRecordMeterOpen, setIsRecordMeterOpen] = useState(false);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isAssignRoomOpen, setIsAssignRoomOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<UtilityBill | null>(null);
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // Form States - New Utility Bill
  const [billTitle, setBillTitle] = useState('');
  const [billCategory, setBillCategory] = useState<string>('RENT');
  const [billAmount, setBillAmount] = useState<string>('');
  const [billPeriod, setBillPeriod] = useState<string>(new Date().toISOString().slice(0, 7));
  const [billDueDate, setBillDueDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [billSplitMethod, setBillSplitMethod] = useState<SplitMethod>('EQUAL');
  const [billPaidBy, setBillPaidBy] = useState<string>('');
  const [billNotes, setBillNotes] = useState<string>('');

  // Helper Calculator States
  // Electricity
  const [currentKwh, setCurrentKwh] = useState<string>('');
  const [previousKwh, setPreviousKwh] = useState<string>('');
  const [ratePerKwh, setRatePerKwh] = useState<string>('10.5');
  const [fixedDemandCharge, setFixedDemandCharge] = useState<string>('150');
  const [otherElecCharges, setOtherElecCharges] = useState<string>('0');
  // Maid
  const [maidBase, setMaidBase] = useState<string>('5000');
  const [maidBonus, setMaidBonus] = useState<string>('0');
  const [maidAdvance, setMaidAdvance] = useState<string>('0');
  const [maidDeductions, setMaidDeductions] = useState<string>('0');

  // Meter form states
  const [meterType, setMeterType] = useState<string>('ELECTRICITY');
  const [meterName, setMeterName] = useState<string>('Main Electric Meter');
  const [meterId, setMeterId] = useState<string>('ELEC-01');
  const [readingVal, setReadingVal] = useState<string>('');
  const [prevReadingVal, setPrevReadingVal] = useState<string>('0');
  const [isRollover, setIsRollover] = useState<boolean>(false);
  const [readingDate, setReadingDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Template form states
  const [tmplName, setTmplName] = useState<string>('');
  const [tmplCategory, setTmplCategory] = useState<string>('WIFI');
  const [tmplAmount, setTmplAmount] = useState<string>('1200');
  const [tmplDueDay, setTmplDueDay] = useState<string>('10');
  const [tmplAuto, setTmplAuto] = useState<boolean>(true);

  // Room form states
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [roomFloor, setRoomFloor] = useState<string>('2nd Floor');
  const [roomCapacity, setRoomCapacity] = useState<string>('2');
  const [roomRent, setRoomRent] = useState<string>('6000');

  // Room assignment state
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Action status
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch all utility data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [billsData, metricsData, metersData, templatesData, roomsData, membersData] = await Promise.all([
        apiClient<UtilityBill[]>(`/messes/${messId}/utilities?periodKey=${currentPeriod}`).catch(() => []),
        apiClient<UtilityMetrics>(`/messes/${messId}/utilities/metrics?periodKey=${currentPeriod}`).catch(() => null),
        apiClient<MeterReading[]>(`/messes/${messId}/meters?billingPeriod=${currentPeriod}`).catch(() => []),
        apiClient<RecurringUtilityTemplate[]>(`/messes/${messId}/recurring-utilities`).catch(() => []),
        apiClient<Room[]>(`/messes/${messId}/rooms`).catch(() => []),
        apiClient<MessMember[]>(`/messes/${messId}/members`).catch(() => []),
      ]);

      setBills(billsData);
      setMetrics(metricsData);
      setMeterReadings(metersData);
      setTemplates(templatesData);
      setRooms(roomsData);
      setMembers(membersData);
    } catch (err: any) {
      console.error('Failed to load utility data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [messId, currentPeriod]);

  // Real-time synchronization across utility, bill, and member mutations
  useDataSync(['utilities', 'bills', 'members'], loadData);

  // Electricity live calculator
  useEffect(() => {
    if (billCategory === 'ELECTRICITY') {
      const cur = parseFloat(currentKwh) || 0;
      const prev = parseFloat(previousKwh) || 0;
      const rate = parseFloat(ratePerKwh) || 0;
      const fixed = parseFloat(fixedDemandCharge) || 0;
      const extra = parseFloat(otherElecCharges) || 0;

      if (cur >= prev && rate > 0) {
        const energyCost = (cur - prev) * rate;
        const total = Math.round((energyCost + fixed + extra) * 100) / 100;
        setBillAmount(total.toString());
      }
    }
  }, [currentKwh, previousKwh, ratePerKwh, fixedDemandCharge, otherElecCharges, billCategory]);

  // Maid salary live calculator
  useEffect(() => {
    if (billCategory === 'MAID') {
      const base = parseFloat(maidBase) || 0;
      const bon = parseFloat(maidBonus) || 0;
      const adv = parseFloat(maidAdvance) || 0;
      const ded = parseFloat(maidDeductions) || 0;

      const net = Math.max(0, base + bon - adv - ded);
      setBillAmount(net.toString());
    }
  }, [maidBase, maidBonus, maidAdvance, maidDeductions, billCategory]);

  // Autofill previous meter reading
  const handleOpenRecordMeter = async () => {
    try {
      const latest = await apiClient<MeterReading | null>(
        `/messes/${messId}/meters/latest?meterType=${meterType}&meterIdentifier=${meterId}`
      ).catch(() => null);
      if (latest) {
        setPrevReadingVal(latest.currentValue.toString());
      }
    } catch {
      // Ignore
    }
    setIsRecordMeterOpen(true);
  };

  // Create utility bill
  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(billAmount);
    if (!amount || amount <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid bill amount' });
      return;
    }

    try {
      setActionLoading(true);
      await apiClient(`/messes/${messId}/utilities`, {
        method: 'POST',
        body: JSON.stringify({
          title: billTitle || `${billCategory} Bill - ${billPeriod}`,
          category: billCategory,
          amount,
          billingPeriod: billPeriod,
          dueDate: billDueDate,
          splitMethod: billSplitMethod,
          paidByMemberId: billPaidBy || undefined,
          notes: billNotes || undefined,
          // Electricity meta
          currentReading: currentKwh ? parseFloat(currentKwh) : undefined,
          previousReading: previousKwh ? parseFloat(previousKwh) : undefined,
          unitRate: ratePerKwh ? parseFloat(ratePerKwh) : undefined,
          // Maid meta
          baseSalary: maidBase ? parseFloat(maidBase) : undefined,
          bonusAmount: maidBonus ? parseFloat(maidBonus) : undefined,
          advanceDeduction: maidAdvance ? parseFloat(maidAdvance) : undefined,
          deductions: maidDeductions ? parseFloat(maidDeductions) : undefined,
        }),
      });

      setStatusMessage({ type: 'success', text: 'Utility bill registered with zero-loss allocations!' });
      setIsAddBillOpen(false);
      resetBillForm();
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create utility bill' });
    } finally {
      setActionLoading(false);
    }
  };

  // Reset bill form
  const resetBillForm = () => {
    setBillTitle('');
    setBillCategory('RENT');
    setBillAmount('');
    setBillSplitMethod('EQUAL');
    setBillPaidBy('');
    setBillNotes('');
    setCurrentKwh('');
    setPreviousKwh('');
  };

  // Approve bill
  const handleApproveBill = async (billId: string) => {
    try {
      setActionLoading(true);
      await apiClient(`/messes/${messId}/utilities/${billId}/approve`, { method: 'POST' });
      setStatusMessage({ type: 'success', text: 'Utility bill approved!' });
      if (selectedBill) setSelectedBill({ ...selectedBill, status: 'APPROVED' });
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to approve bill' });
    } finally {
      setActionLoading(false);
    }
  };

  // Authoritatively Post Bill to Shared Financial Ledger
  const handlePostToLedger = async (billId: string) => {
    try {
      setActionLoading(true);
      const res: any = await apiClient(`/messes/${messId}/utilities/${billId}/post`, { method: 'POST' });
      setStatusMessage({
        type: 'success',
        text: `Authoritatively posted to Ledger! ${res.ledgerEntriesCount || 'All'} journal entries created.`,
      });
      if (selectedBill) {
        setSelectedBill({ ...selectedBill, isPosted: true, status: 'POSTED' });
      }
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to post bill to ledger' });
    } finally {
      setActionLoading(false);
    }
  };

  // Void bill
  const handleVoidBill = async () => {
    if (!selectedBill) return;
    try {
      setActionLoading(true);
      await apiClient(`/messes/${messId}/utilities/${selectedBill.id}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason: voidReason || 'Manager void request' }),
      });
      setStatusMessage({ type: 'success', text: 'Utility bill marked VOID and ledger reversed!' });
      setIsVoidOpen(false);
      setSelectedBill(null);
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to void bill' });
    } finally {
      setActionLoading(false);
    }
  };

  // Record meter reading
  const handleRecordMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiClient(`/messes/${messId}/meters`, {
        method: 'POST',
        body: JSON.stringify({
          meterType,
          meterName,
          meterIdentifier: meterId,
          billingPeriod: currentPeriod,
          readingDate,
          currentValue: parseFloat(readingVal),
          previousValue: parseFloat(prevReadingVal),
          isRollover,
        }),
      });
      setStatusMessage({ type: 'success', text: 'Meter reading recorded successfully!' });
      setIsRecordMeterOpen(false);
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to record meter reading' });
    } finally {
      setActionLoading(false);
    }
  };

  // Create room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiClient(`/messes/${messId}/rooms`, {
        method: 'POST',
        body: JSON.stringify({
          roomNumber,
          floor: roomFloor,
          capacity: parseInt(roomCapacity, 10),
          monthlyRent: parseFloat(roomRent),
        }),
      });
      setStatusMessage({ type: 'success', text: `Room ${roomNumber} created successfully!` });
      setIsAddRoomOpen(false);
      setRoomNumber('');
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create room' });
    } finally {
      setActionLoading(false);
    }
  };

  // Assign roommate
  const handleAssignRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiClient(`/messes/${messId}/rooms/assign`, {
        method: 'POST',
        body: JSON.stringify({
          roomId: selectedRoomId,
          memberId: selectedMemberId,
        }),
      });
      setStatusMessage({ type: 'success', text: 'Member assigned to room!' });
      setIsAssignRoomOpen(false);
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to assign room' });
    } finally {
      setActionLoading(false);
    }
  };

  // Batch generate recurring bills
  const handleGenerateRecurring = async () => {
    try {
      setActionLoading(true);
      const res: any = await apiClient(`/messes/${messId}/recurring-utilities/generate`, {
        method: 'POST',
        body: JSON.stringify({ billingPeriod: currentPeriod }),
      });
      setStatusMessage({
        type: 'success',
        text: `Batch generator complete: ${res.generatedCount} bills created (${res.skippedCount} skipped as duplicate).`,
      });
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to generate recurring bills' });
    } finally {
      setActionLoading(false);
    }
  };

  // Create recurring template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiClient(`/messes/${messId}/recurring-utilities`, {
        method: 'POST',
        body: JSON.stringify({
          name: tmplName,
          category: tmplCategory,
          defaultAmount: parseFloat(tmplAmount) || 0,
          dueDay: parseInt(tmplDueDay, 10) || 10,
          autoGenerate: tmplAuto,
          splitMethod: 'EQUAL',
          frequency: 'MONTHLY',
        }),
      });
      setStatusMessage({ type: 'success', text: `Recurring template "${tmplName}" created!` });
      setIsAddTemplateOpen(false);
      setTmplName('');
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create template' });
    } finally {
      setActionLoading(false);
    }
  };

  // Category Icon helper
  const getCategoryIcon = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'RENT':
        return <Home className="text-blue-500" size={18} />;
      case 'ELECTRICITY':
        return <Zap className="text-amber-500" size={18} />;
      case 'GAS':
        return <Flame className="text-orange-500" size={18} />;
      case 'WATER':
        return <Droplet className="text-cyan-500" size={18} />;
      case 'WIFI':
        return <Wifi className="text-indigo-500" size={18} />;
      case 'MAID':
        return <UserCheck className="text-pink-500" size={18} />;
      default:
        return <Layers className="text-emerald-500" size={18} />;
    }
  };

  // Filtered bills
  const filteredBills = bills.filter((b) => {
    if (categoryFilter !== 'ALL' && b.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    return true;
  });

  // Calculate live preview allocations for modal
  const activeMembersList = members.filter((m) => m.status === 'ACTIVE');
  const previewAmount = parseFloat(billAmount) || 0;
  const previewPerMember =
    activeMembersList.length > 0 ? Math.round((previewAmount / activeMembersList.length) * 100) / 100 : 0;

  if (isLoading) {
    return <PageLoader message="Loading utility operations & ledger records..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Title & Period Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Utilities & Rent Management</h1>
            <Badge variant="primary" size="sm">Phase 6 Engine</Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Authoritative utility meters, zero-loss room allocations & recurring billing automation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar size={16} className="text-gray-400 mr-2" />
            <input
              type="month"
              value={currentPeriod}
              onChange={(e) => setCurrentPeriod(e.target.value)}
              className="bg-transparent text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-none"
            />
          </div>

          <Button variant="primary" onClick={() => setIsAddBillOpen(true)}>
            <Plus size={16} className="mr-1.5" /> Record Bill
          </Button>
        </div>
      </div>

      {/* Alert / Notification Feedback */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border shadow-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs uppercase font-bold opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Billed */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total Month Utilities
            </span>
            <span className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <DollarSign size={20} />
            </span>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              ৳{(metrics?.totalBilled || 0).toLocaleString()}
            </h2>
            <p className="text-xs text-gray-500 mt-1">{metrics?.billsCount || 0} bills in {currentPeriod}</p>
          </div>
        </div>

        {/* Posted to Shared Ledger */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Posted to Ledger
            </span>
            <span className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 size={20} />
            </span>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ৳{(metrics?.totalPosted || 0).toLocaleString()}
            </h2>
            <p className="text-xs text-emerald-600/80 mt-1">Authoritative journal entries created</p>
          </div>
        </div>

        {/* Pending Review / Action */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Pending Ledger Post
            </span>
            <span className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock size={20} />
            </span>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-amber-600 dark:text-amber-400">
              ৳{(metrics?.totalPending || 0).toLocaleString()}
            </h2>
            <p className="text-xs text-amber-600/80 mt-1">Ready for manager approval & posting</p>
          </div>
        </div>

        {/* Rooms / Active Capacity */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Configured Rooms
            </span>
            <span className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <BedDouble size={20} />
            </span>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">{rooms.length} Rooms</h2>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              {rooms.reduce((acc, r) => acc + r.occupantCount, 0)} /{' '}
              {rooms.reduce((acc, r) => acc + r.capacity, 0)} Occupants assigned
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('bills')}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'bills'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Layers size={16} /> Utility Bills
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600">
            {bills.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('meters')}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'meters'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Gauge size={16} /> Meter Readings
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600">
            {meterReadings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('recurring')}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'recurring'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Repeat size={16} /> Recurring Templates
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600">
            {templates.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'rooms'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <BedDouble size={16} /> Rooms & Rent
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600">
            {rooms.length}
          </span>
        </button>
      </div>

      {/* TAB 1: UTILITY BILLS */}
      {activeTab === 'bills' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Filter:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="RENT">Rent</option>
                <option value="ELECTRICITY">Electricity</option>
                <option value="GAS">Gas</option>
                <option value="WATER">Water</option>
                <option value="WIFI">Wi-Fi</option>
                <option value="MAID">Maid / Cook</option>
                <option value="OTHER">Other</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="POSTED">Posted to Ledger</option>
                <option value="VOID">Voided</option>
              </select>
            </div>

            <div className="text-xs text-gray-500 font-medium">
              Showing {filteredBills.length} of {bills.length} bills
            </div>
          </div>

          {/* Bills List Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {filteredBills.length === 0 ? (
              <div className="p-12 text-center">
                <Layers className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={42} />
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No utility bills found</h3>
                <p className="text-xs text-gray-500 mt-1">No recorded utility bills match the selected filters.</p>
                <Button variant="primary" size="sm" className="mt-4" onClick={() => setIsAddBillOpen(true)}>
                  <Plus size={14} className="mr-1" /> Add New Bill
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-xs font-bold uppercase text-gray-500">
                    <tr>
                      <th className="py-3 px-4">Utility & Title</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Allocation</th>
                      <th className="py-3 px-4">Payer</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredBills.map((b) => (
                      <tr
                        key={b.id}
                        className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedBill(b)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                              {getCategoryIcon(b.category)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">{b.title}</div>
                              <div className="text-xs text-gray-400 capitalize">{b.category.toLowerCase()} • {b.billType.toLowerCase()}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                            {b.billingPeriod}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                          ৳{b.amount.toLocaleString()}
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {b.splitMethod} ({b.allocations?.length || 0} members)
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {b.paidByName || <span className="text-gray-400 italic">Not paid upfront</span>}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {b.isPosted || b.status === 'POSTED' ? (
                            <Badge variant="success" size="sm">
                              <CheckCircle2 size={12} className="mr-1" /> Posted
                            </Badge>
                          ) : b.status === 'APPROVED' ? (
                            <Badge variant="primary" size="sm">
                              Approved
                            </Badge>
                          ) : b.status === 'VOID' ? (
                            <Badge variant="neutral" size="sm">
                              Void
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm">
                              Pending
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {!b.isPosted && b.status !== 'POSTED' && b.status !== 'VOID' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePostToLedger(b.id)}
                                disabled={actionLoading}
                              >
                                Post to Ledger
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setSelectedBill(b)}>
                              Details <ArrowRight size={13} className="ml-1" />
                            </Button>
                          </div>
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

      {/* TAB 2: METER READINGS */}
      {activeTab === 'meters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Meter Consumption Records</h2>
              <p className="text-xs text-gray-500">Track monthly electricity, sub-meters and water dials</p>
            </div>
            <Button variant="primary" size="sm" onClick={handleOpenRecordMeter}>
              <Plus size={14} className="mr-1" /> Record Reading
            </Button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {meterReadings.length === 0 ? (
              <div className="p-12 text-center">
                <Gauge className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={42} />
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No meter readings recorded</h3>
                <p className="text-xs text-gray-500 mt-1">Record the electricity or water dial reading for this month.</p>
                <Button variant="primary" size="sm" className="mt-4" onClick={handleOpenRecordMeter}>
                  <Plus size={14} className="mr-1" /> Record First Reading
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-xs font-bold uppercase text-gray-500">
                    <tr>
                      <th className="py-3 px-4">Meter Name & Identifier</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Prev Reading</th>
                      <th className="py-3 px-4">Current Reading</th>
                      <th className="py-3 px-4">Consumed Units</th>
                      <th className="py-3 px-4">Reading Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {meterReadings.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900 dark:text-white">{m.meterName}</div>
                          <div className="text-xs text-gray-400 font-mono">{m.meterIdentifier || 'MAIN-01'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="primary" size="sm">{m.meterType}</Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">{m.billingPeriod}</td>
                        <td className="py-3 px-4 font-mono">{m.previousValue}</td>
                        <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white">{m.currentValue}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {m.consumedUnits} units
                          </span>
                          {m.isRollover && (
                            <span className="ml-1.5 text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded font-bold">
                              Rollover
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">{m.readingDate}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setBillCategory('ELECTRICITY');
                              setBillTitle(`DESCO Electricity - ${m.billingPeriod}`);
                              setCurrentKwh(m.currentValue.toString());
                              setPreviousKwh(m.previousValue.toString());
                              setIsAddBillOpen(true);
                            }}
                          >
                            Create Bill <ArrowRight size={13} className="ml-1" />
                          </Button>
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

      {/* TAB 3: RECURRING TEMPLATES */}
      {activeTab === 'recurring' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="text-emerald-600 dark:text-emerald-400" size={20} />
                <h3 className="font-bold text-emerald-900 dark:text-emerald-200">
                  Automated Recurring Bills Generator
                </h3>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                Batch-generate all monthly templates for {currentPeriod} with duplicate protection & zero-loss allocations.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateRecurring}
              disabled={actionLoading || templates.length === 0}
            >
              <Send size={14} className="mr-1.5" /> Generate Bills for {currentPeriod}
            </Button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Active Recurring Templates</h2>
            <Button variant="outline" size="sm" onClick={() => setIsAddTemplateOpen(true)}>
              <Plus size={14} className="mr-1" /> New Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <div
                key={t.id}
                className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        {getCategoryIcon(t.category)}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">{t.name}</span>
                    </div>
                    <Badge variant={t.isActive ? 'success' : 'neutral'} size="sm">
                      {t.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Default Amount:</span>
                      <span className="font-bold text-gray-900 dark:text-white">৳{t.defaultAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Frequency:</span>
                      <span className="capitalize">{t.frequency.toLowerCase()} (Due day: {t.dueDay})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Split Method:</span>
                      <span>{t.splitMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Generated:</span>
                      <span className="font-mono">{t.lastGeneratedPeriod || 'None'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs text-gray-400">
                  <span>{t.autoGenerate ? 'Auto-generator enabled' : 'Manual trigger'}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer hover:underline">
                    Edit Rule
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ROOMS & RENT ALLOCATION */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Mess Rooms & Occupancy</h2>
              <p className="text-xs text-gray-500">Configure rooms, capacity limits, and roommate rent weights</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAssignRoomOpen(true)}>
                <UserCheck size={14} className="mr-1" /> Assign Roommate
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsAddRoomOpen(true)}>
                <Plus size={14} className="mr-1" /> Add Room
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((r) => {
              const isFull = r.occupantCount >= r.capacity;
              return (
                <div
                  key={r.id}
                  className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-lg text-gray-900 dark:text-white">Room {r.roomNumber}</div>
                        <div className="text-xs text-gray-400">{r.floor || 'Standard Floor'}</div>
                      </div>
                      <Badge variant={isFull ? 'danger' : 'success'} size="sm">
                        {isFull ? 'Full' : `${r.capacity - r.occupantCount} Available`}
                      </Badge>
                    </div>

                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Monthly Room Rent:</span>
                        <span className="font-bold text-gray-900 dark:text-white">৳{r.monthlyRent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Rent Per Occupant:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          ৳{r.occupantCount > 0 ? Math.round(r.monthlyRent / r.occupantCount).toLocaleString() : r.monthlyRent.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Capacity:</span>
                        <span>{r.occupantCount} / {r.capacity} Persons</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Roommates:</div>
                      {r.occupants.length === 0 ? (
                        <div className="text-xs text-gray-400 italic">No members assigned yet</div>
                      ) : (
                        <div className="space-y-1.5">
                          {r.occupants.map((occ) => (
                            <div
                              key={occ.memberId}
                              className="flex items-center justify-between text-xs bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2.5 py-1 rounded-lg"
                            >
                              <span className="font-medium text-gray-800 dark:text-gray-200">{occ.name}</span>
                              <span className="text-[10px] text-gray-400 uppercase">{occ.role}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {r.notes && (
                    <div className="mt-4 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2 italic">
                      "{r.notes}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: CREATE UTILITY BILL */}
      <Modal isOpen={isAddBillOpen} onClose={() => setIsAddBillOpen(false)} title="Record Utility Bill">
        <form onSubmit={handleCreateBill} className="space-y-4 text-sm">
          {/* Category Select Buttons */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Utility Category
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[
                { cat: 'RENT', label: 'Rent', icon: <Home size={14} /> },
                { cat: 'ELECTRICITY', label: 'Electricity', icon: <Zap size={14} /> },
                { cat: 'GAS', label: 'Gas', icon: <Flame size={14} /> },
                { cat: 'WATER', label: 'Water', icon: <Droplet size={14} /> },
                { cat: 'WIFI', label: 'Wi-Fi', icon: <Wifi size={14} /> },
                { cat: 'MAID', label: 'Maid/Cook', icon: <UserCheck size={14} /> },
                { cat: 'CLEANING', label: 'Cleaning', icon: <Layers size={14} /> },
                { cat: 'OTHER', label: 'Other', icon: <DollarSign size={14} /> },
              ].map((item) => (
                <button
                  type="button"
                  key={item.cat}
                  onClick={() => setBillCategory(item.cat)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    billCategory === item.cat
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Electricity Specific Assistant */}
          {billCategory === 'ELECTRICITY' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                <Zap size={14} /> Electricity Meter Reading Calculator
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-gray-500 block">Current Dial Reading</label>
                  <input
                    type="number"
                    value={currentKwh}
                    onChange={(e) => setCurrentKwh(e.target.value)}
                    placeholder="e.g. 1350"
                    className="w-full bg-white dark:bg-gray-900 border border-amber-300 rounded px-2.5 py-1 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-gray-500 block">Previous Dial Reading</label>
                  <input
                    type="number"
                    value={previousKwh}
                    onChange={(e) => setPreviousKwh(e.target.value)}
                    placeholder="e.g. 1100"
                    className="w-full bg-white dark:bg-gray-900 border border-amber-300 rounded px-2.5 py-1 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-gray-500 block">Unit Rate (৳/unit)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ratePerKwh}
                    onChange={(e) => setRatePerKwh(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-amber-300 rounded px-2.5 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-gray-500 block">Demand / Fixed Charges</label>
                  <input
                    type="number"
                    value={fixedDemandCharge}
                    onChange={(e) => setFixedDemandCharge(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-amber-300 rounded px-2.5 py-1 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-500 block">Other Surcharges / Meter Rent</label>
                  <input
                    type="number"
                    value={otherElecCharges}
                    onChange={(e) => setOtherElecCharges(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white dark:bg-gray-900 border border-amber-300 rounded px-2.5 py-1 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Maid Salary Specific Assistant */}
          {billCategory === 'MAID' && (
            <div className="p-4 bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-pink-800 dark:text-pink-300 font-bold text-xs uppercase tracking-wider">
                <UserCheck size={14} /> Housekeeper Salary Calculator
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-gray-500 block">Base Monthly Salary</label>
                  <input
                    type="number"
                    value={maidBase}
                    onChange={(e) => setMaidBase(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-pink-300 rounded px-2.5 py-1 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-gray-500 block">Bonus / Tips</label>
                  <input
                    type="number"
                    value={maidBonus}
                    onChange={(e) => setMaidBonus(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-pink-300 rounded px-2.5 py-1 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-gray-500 block">Advance Deduction</label>
                  <input
                    type="number"
                    value={maidAdvance}
                    onChange={(e) => setMaidAdvance(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-pink-300 rounded px-2.5 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-gray-500 block">Absenteeism / Other</label>
                  <input
                    type="number"
                    value={maidDeductions}
                    onChange={(e) => setMaidDeductions(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-pink-300 rounded px-2.5 py-1 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bill Title</label>
              <input
                type="text"
                value={billTitle}
                onChange={(e) => setBillTitle(e.target.value)}
                placeholder={`e.g. ${billCategory} bill for ${billPeriod}`}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Amount (৳) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Period, Due Date, Payer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Billing Month</label>
              <input
                type="month"
                value={billPeriod}
                onChange={(e) => setBillPeriod(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input
                type="date"
                value={billDueDate}
                onChange={(e) => setBillDueDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Paid Upfront By</label>
              <select
                value={billPaidBy}
                onChange={(e) => setBillPaidBy(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">None (Mess Shared Fund)</option>
                {activeMembersList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Allocation Method */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Zero-Loss Allocation Method
            </label>
            <select
              value={billSplitMethod}
              onChange={(e) => setBillSplitMethod(e.target.value as SplitMethod)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none font-semibold"
            >
              <option value="EQUAL">Equal Split (All active members)</option>
              <option value="ROOM_BASED">Room-Based Split (Weighted by Room Rent / Occupants)</option>
              <option value="PRORATED">Prorated Days Active</option>
              <option value="CUSTOM">Custom Amounts</option>
            </select>
          </div>

          {/* Live Preview Box */}
          {previewAmount > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
              <div className="flex justify-between items-center font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                <span>Real-Time Allocation Preview:</span>
                <span className="text-emerald-600 dark:text-emerald-400">Exact Zero Residual</span>
              </div>
              <div className="text-gray-500">
                Split ৳{previewAmount.toLocaleString()} across {activeMembersList.length} members (~৳
                {previewPerMember} each). Hamilton-Webster largest-remainder quota applies on penny distribution.
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddBillOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Record Utility Bill'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: BILL DETAILS & LEDGER POST */}
      {selectedBill && (
        <Modal
          isOpen={!!selectedBill}
          onClose={() => setSelectedBill(null)}
          title={`${selectedBill.title} (${selectedBill.billingPeriod})`}
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl">
              <div>
                <span className="text-gray-400 text-xs block">Amount</span>
                <span className="font-bold text-base text-gray-900 dark:text-white">
                  ৳{selectedBill.amount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Category</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedBill.category}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Paid Upfront By</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {selectedBill.paidByName || 'Mess Shared Fund'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Status</span>
                <span className="font-bold">
                  {selectedBill.isPosted || selectedBill.status === 'POSTED' ? (
                    <span className="text-emerald-600">POSTED TO LEDGER</span>
                  ) : (
                    <span className="text-amber-600">{selectedBill.status}</span>
                  )}
                </span>
              </div>
            </div>

            {/* Member Allocations Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Member Share Allocations ({selectedBill.allocations?.length || 0})
              </h4>
              <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 dark:bg-gray-900 text-gray-400">
                    <tr>
                      <th className="py-2 px-3">Member</th>
                      <th className="py-2 px-3">Share Ratio</th>
                      <th className="py-2 px-3 text-right">Debit Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {selectedBill.allocations?.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2 px-3 font-medium text-gray-800 dark:text-gray-200">
                          {a.memberName || a.memberId}
                        </td>
                        <td className="py-2 px-3 text-gray-500">
                          {a.shareRatio ? `${(a.shareRatio * 100).toFixed(1)}%` : 'Equal'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900 dark:text-white">
                          ৳{a.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Post to Ledger Action Section */}
            {!selectedBill.isPosted && selectedBill.status !== 'POSTED' && selectedBill.status !== 'VOID' && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                    Ready to post into Shared Financial Ledger?
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Will authoritatively record member DEBITS and upfront payer CREDITS.
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handlePostToLedger(selectedBill.id)}
                  disabled={actionLoading}
                >
                  Post Now
                </Button>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsVoidOpen(true)}
                disabled={selectedBill.status === 'VOID' || actionLoading}
              >
                <XCircle size={14} className="mr-1 text-rose-500" /> Void Bill
              </Button>

              <div className="flex items-center gap-2">
                {selectedBill.status === 'PENDING_REVIEW' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApproveBill(selectedBill.id)}
                    disabled={actionLoading}
                  >
                    Approve
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setSelectedBill(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: RECORD METER READING */}
      <Modal isOpen={isRecordMeterOpen} onClose={() => setIsRecordMeterOpen(false)} title="Record Meter Reading">
        <form onSubmit={handleRecordMeter} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Meter Type</label>
              <select
                value={meterType}
                onChange={(e) => setMeterType(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm"
              >
                <option value="ELECTRICITY">Electricity (kWh)</option>
                <option value="WATER">Water (Liters/Units)</option>
                <option value="GAS">Gas (Cubic Meters)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Meter Name</label>
              <input
                type="text"
                required
                value={meterName}
                onChange={(e) => setMeterName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Meter Identifier (ID / Serial)</label>
              <input
                type="text"
                value={meterId}
                onChange={(e) => setMeterId(e.target.value)}
                placeholder="e.g. ELEC-01"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reading Date</label>
              <input
                type="date"
                value={readingDate}
                onChange={(e) => setReadingDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Previous Reading
              </label>
              <input
                type="number"
                value={prevReadingVal}
                onChange={(e) => setPrevReadingVal(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Reading *
              </label>
              <input
                type="number"
                required
                value={readingVal}
                onChange={(e) => setReadingVal(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rolloverToggle"
              checked={isRollover}
              onChange={(e) => setIsRollover(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="rolloverToggle" className="text-xs text-gray-600 dark:text-gray-400">
              Meter Rollover / Hardware Reset (Allow current reading to be less than previous)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsRecordMeterOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={actionLoading}>
              Save Reading
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD ROOM */}
      <Modal isOpen={isAddRoomOpen} onClose={() => setIsAddRoomOpen(false)} title="Add Mess Room">
        <form onSubmit={handleCreateRoom} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Room Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 201, Flat 4B"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Floor</label>
              <input
                type="text"
                value={roomFloor}
                onChange={(e) => setRoomFloor(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity (Max Beds)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={roomCapacity}
                onChange={(e) => setRoomCapacity(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Room Rent (৳)</label>
              <input
                type="number"
                value={roomRent}
                onChange={(e) => setRoomRent(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddRoomOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={actionLoading}>
              Create Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CREATE RECURRING TEMPLATE */}
      <Modal isOpen={isAddTemplateOpen} onClose={() => setIsAddTemplateOpen(false)} title="Create Recurring Template">
        <form onSubmit={handleCreateTemplate} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name</label>
            <input
              type="text"
              required
              value={tmplName}
              onChange={(e) => setTmplName(e.target.value)}
              placeholder="e.g. Fiber Internet 50Mbps"
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={tmplCategory}
                onChange={(e) => setTmplCategory(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm"
              >
                <option value="WIFI">Wi-Fi Internet</option>
                <option value="MAID">Housekeeper / Cook</option>
                <option value="CLEANING">Cleaning Supplies</option>
                <option value="WATER">Water Supply</option>
                <option value="GAS">Gas Cylinder</option>
                <option value="RENT">Apartment Rent</option>
                <option value="OTHER">Other Utility</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Default Amount (৳)</label>
              <input
                type="number"
                required
                value={tmplAmount}
                onChange={(e) => setTmplAmount(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Due Day (1-31)</label>
              <input
                type="number"
                min="1"
                max="31"
                value={tmplDueDay}
                onChange={(e) => setTmplDueDay(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tmplAuto}
                  onChange={(e) => setTmplAuto(e.target.checked)}
                  className="rounded text-emerald-500"
                />
                Auto-generate monthly
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddTemplateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={actionLoading}>
              Save Template
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ASSIGN ROOMMATE */}
      <Modal isOpen={isAssignRoomOpen} onClose={() => setIsAssignRoomOpen(false)} title="Assign Roommate">
        <form onSubmit={handleAssignRoom} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Select Member</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              required
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm"
            >
              <option value="">Choose a member...</option>
              {activeMembersList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role}) - Current Room: {m.roomNo || 'None'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Target Room</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              required
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-semibold"
            >
              <option value="">Choose a room...</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id} disabled={r.occupantCount >= r.capacity}>
                  Room {r.roomNumber} ({r.occupantCount}/{r.capacity} beds) - ৳{r.monthlyRent}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAssignRoomOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={actionLoading}>
              Assign to Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VOID BILL CONFIRMATION */}
      <Modal isOpen={isVoidOpen} onClose={() => setIsVoidOpen(false)} title="Void Utility Bill">
        <div className="space-y-3 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to void this bill? If it was already posted to the shared ledger, equal and opposite
            reversal entries will be appended to maintain zero-loss financial integrity.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Void</label>
            <input
              type="text"
              required
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Duplicate entry, incorrect meter reading"
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsVoidOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleVoidBill} disabled={actionLoading}>
              Confirm Void & Reverse
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
