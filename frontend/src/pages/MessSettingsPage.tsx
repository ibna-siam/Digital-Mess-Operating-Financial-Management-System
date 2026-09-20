import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Sliders,
  Mail,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  Check,
  X,
  Save,
  FileCheck,
  Tags,
  Plus,
  ShieldAlert,
  Palette,
  DownloadCloud,
  RotateCcw,
  KeyRound,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { PageLoader } from '../components/ui/StateComponents.js';
import { apiClient } from '../lib/apiClient.js';
import { useAuth } from '../context/AuthContext.js';
import { Mess } from '../types/index.js';
import { InvitationItem, LeaveRequestItem, ExitClearanceAudit } from '../types/memberLifecycle.js';

export type SettingsTabType =
  | 'profile'
  | 'rules'
  | 'categories'
  | 'policies'
  | 'display-alerts'
  | 'invitations'
  | 'leave-requests';

export const MessSettingsPage: React.FC = () => {
  const { activeMess, refreshMesses } = useAuth();
  const messId = activeMess?.id || '';
  const isManager = activeMess?.myRole === 'MANAGER' || activeMess?.myRole === 'OWNER';

  const [mess, setMess] = useState<Mess | null>(null);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTabType>('profile');

  // Join Code States
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const handleCopyCode = () => {
    const code = mess?.code || activeMess?.code || '';
    if (code) {
      navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    setIsRegeneratingCode(true);
    try {
      const res = await apiClient<{ joinCode: string; mess: Mess }>(`/messes/${messId}/regenerate-code`, {
        method: 'POST',
      });
      if (res && res.joinCode) {
        setMess((prev) => (prev ? { ...prev, code: res.joinCode } : prev));
        await refreshMesses();
      }
      setShowRegenModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to regenerate join code');
    } finally {
      setIsRegeneratingCode(false);
    }
  };

  // Profile Form States
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('Asia/Dhaka');
  const [currency, setCurrency] = useState('BDT');
  const [currencySymbol, setCurrencySymbol] = useState('৳');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Operating Rules Form States
  const [defaultMealCount, setDefaultMealCount] = useState(2);
  const [mealCutoffHour, setMealCutoffHour] = useState(21);
  const [allowGuestMeals, setAllowGuestMeals] = useState(true);
  const [guestBreakfastRate, setGuestBreakfastRate] = useState(30);
  const [guestLunchRate, setGuestLunchRate] = useState(60);
  const [guestDinnerRate, setGuestDinnerRate] = useState(60);
  const [isSavingRules, setIsSavingRules] = useState(false);

  // Category Configuration States
  const [expenseCategories, setExpenseCategories] = useState<string[]>([
    'Groceries',
    'Vegetables',
    'Fish & Meat',
    'Spices & Oil',
    'Cleaning Supplies',
    'Gas & Fuel',
    'Emergency',
    'Miscellaneous',
  ]);
  const [newExpenseCat, setNewExpenseCat] = useState('');

  const [fixedBillCategories, setFixedBillCategories] = useState<string[]>([
    'House Rent',
    'Maid & Cook Salary',
    'Waste Management',
    'Security Guard',
    'Building Maintenance',
    'Dish & Cable',
  ]);
  const [newFixedCat, setNewFixedCat] = useState('');

  const [utilityCategories, setUtilityCategories] = useState<string[]>([
    'Electricity',
    'Water (WASA)',
    'Wi-Fi Broadband',
    'Pipeline Gas',
    'LP Gas Cylinder',
    'Cleaning & Waste',
  ]);
  const [newUtilityCat, setNewUtilityCat] = useState('');
  const [isSavingCategories, setIsSavingCategories] = useState(false);

  // Financial & Closing Policies States
  const [rentDueDay, setRentDueDay] = useState(10);
  const [autoGenerateUtilities, setAutoGenerateUtilities] = useState(false);
  const [gracePeriodDays, setGracePeriodDays] = useState(5);
  const [defaultSplitMethod, setDefaultSplitMethod] = useState<'EQUAL' | 'MEAL_BASED' | 'ROOM_BASED'>('EQUAL');
  const [allowMemberReopenRequests, setAllowMemberReopenRequests] = useState(true);
  const [isSavingPolicies, setIsSavingPolicies] = useState(false);

  // Display & Notification Preferences
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [compactTableDensity, setCompactTableDensity] = useState(false);
  const [showDecimals, setShowDecimals] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [billDueReminders, setBillDueReminders] = useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Create Invitation Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'MANAGER'>('MEMBER');
  const [inviteRoomNo, setInviteRoomNo] = useState('');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);

  // Clearance Audit Modal
  const [clearanceMemberId, setClearanceMemberId] = useState<string | null>(null);
  const [clearanceData, setClearanceData] = useState<ExitClearanceAudit | null>(null);
  const [isLoadingClearance, setIsLoadingClearance] = useState(false);

  // Toast Notification
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSettingsData = async () => {
    try {
      setIsLoading(true);
      const [messData, invitesData, leaveData] = await Promise.all([
        apiClient<Mess>(`/messes/${messId}`),
        apiClient<InvitationItem[]>(`/messes/${messId}/invitations`).catch(() => []),
        apiClient<LeaveRequestItem[]>(`/messes/${messId}/leave-requests`).catch(() => []),
      ]);

      setMess(messData);
      setInvitations(invitesData);
      setLeaveRequests(leaveData);

      // Populate profile
      setName(messData.name || '');
      setDescription(messData.description || '');
      setAddress(messData.address || '');
      setPhone(messData.phone || '');
      setEmail(messData.email || '');
      setTimezone(messData.timezone || 'Asia/Dhaka');
      setCurrency(messData.currency || 'BDT');
      setCurrencySymbol(messData.currencySymbol || '৳');
      setArea(messData.area || '');
      setCity(messData.city || '');

      // Populate settings
      if (messData.settings) {
        const s = messData.settings as any;
        if (s.defaultMealCount !== undefined) setDefaultMealCount(s.defaultMealCount);
        if (s.mealCutoffHour !== undefined) setMealCutoffHour(s.mealCutoffHour);
        if (s.allowGuestMeals !== undefined) setAllowGuestMeals(s.allowGuestMeals);
        if (s.guestBreakfastRate !== undefined) setGuestBreakfastRate(s.guestBreakfastRate);
        if (s.guestLunchRate !== undefined) setGuestLunchRate(s.guestLunchRate);
        if (s.guestDinnerRate !== undefined) setGuestDinnerRate(s.guestDinnerRate);

        if (s.rentDueDay !== undefined) setRentDueDay(s.rentDueDay);
        if (s.autoGenerateUtilities !== undefined) setAutoGenerateUtilities(s.autoGenerateUtilities);
        if (s.gracePeriodDays !== undefined) setGracePeriodDays(s.gracePeriodDays);
        if (s.defaultSplitMethod !== undefined) setDefaultSplitMethod(s.defaultSplitMethod);
        if (s.allowMemberReopenRequests !== undefined) setAllowMemberReopenRequests(s.allowMemberReopenRequests);

        if (Array.isArray(s.expenseCategories)) setExpenseCategories(s.expenseCategories);
        if (Array.isArray(s.fixedBillCategories)) setFixedBillCategories(s.fixedBillCategories);
        if (Array.isArray(s.utilityCategories)) setUtilityCategories(s.utilityCategories);

        if (s.dateFormat !== undefined) setDateFormat(s.dateFormat);
        if (s.compactTableDensity !== undefined) setCompactTableDensity(s.compactTableDensity);
        if (s.showDecimals !== undefined) setShowDecimals(s.showDecimals);
        if (s.emailAlerts !== undefined) setEmailAlerts(s.emailAlerts);
        if (s.pushAlerts !== undefined) setPushAlerts(s.pushAlerts);
        if (s.billDueReminders !== undefined) setBillDueReminders(s.billDueReminders);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, [messId]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      await apiClient(`/messes/${messId}/profile`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          description,
          address,
          phone,
          email,
          timezone,
          currency,
          currencySymbol,
          area,
          city,
        }),
      });
      showNotification('success', 'Mess profile settings saved successfully');
      fetchSettingsData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingRules(true);
      await apiClient(`/messes/${messId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          settings: {
            defaultMealCount: Number(defaultMealCount),
            mealCutoffHour: Number(mealCutoffHour),
            allowGuestMeals,
            guestBreakfastRate: Number(guestBreakfastRate),
            guestLunchRate: Number(guestLunchRate),
            guestDinnerRate: Number(guestDinnerRate),
          },
        }),
      });
      showNotification('success', 'Operational meal rules saved');
      fetchSettingsData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to save rules');
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleSaveCategories = async () => {
    try {
      setIsSavingCategories(true);
      await apiClient(`/messes/${messId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          settings: {
            expenseCategories,
            fixedBillCategories,
            utilityCategories,
          },
        }),
      });
      showNotification('success', 'Custom category tags saved successfully');
      fetchSettingsData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to save categories');
    } finally {
      setIsSavingCategories(false);
    }
  };

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingPolicies(true);
      await apiClient(`/messes/${messId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          settings: {
            rentDueDay: Number(rentDueDay),
            autoGenerateUtilities,
            gracePeriodDays: Number(gracePeriodDays),
            defaultSplitMethod,
            allowMemberReopenRequests,
          },
        }),
      });
      showNotification('success', 'Financial closing policies saved');
      fetchSettingsData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to save policies');
    } finally {
      setIsSavingPolicies(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingPreferences(true);
      await apiClient(`/messes/${messId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          settings: {
            dateFormat,
            compactTableDensity,
            showDecimals,
            emailAlerts,
            pushAlerts,
            billDueReminders,
          },
        }),
      });
      showNotification('success', 'Display & notification preferences saved');
      fetchSettingsData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleAddCategory = (
    type: 'expense' | 'fixed' | 'utility',
    val: string,
    setVal: (v: string) => void
  ) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (type === 'expense' && !expenseCategories.includes(trimmed)) {
      setExpenseCategories([...expenseCategories, trimmed]);
    } else if (type === 'fixed' && !fixedBillCategories.includes(trimmed)) {
      setFixedBillCategories([...fixedBillCategories, trimmed]);
    } else if (type === 'utility' && !utilityCategories.includes(trimmed)) {
      setUtilityCategories([...utilityCategories, trimmed]);
    }
    setVal('');
  };

  const handleRemoveCategory = (type: 'expense' | 'fixed' | 'utility', cat: string) => {
    if (type === 'expense') {
      setExpenseCategories(expenseCategories.filter((c) => c !== cat));
    } else if (type === 'fixed') {
      setFixedBillCategories(fixedBillCategories.filter((c) => c !== cat));
    } else if (type === 'utility') {
      setUtilityCategories(utilityCategories.filter((c) => c !== cat));
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreatingInvite(true);
      const res = await apiClient<InvitationItem>(`/messes/${messId}/invitations`, {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          role: inviteRole,
          roomNo: inviteRoomNo || undefined,
        }),
      });

      const fullUrl = `${window.location.origin}/invite/${res.token}`;
      setCreatedInviteUrl(fullUrl);
      showNotification('success', 'Single-use cryptographic invite created');
      fetchSettingsData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to create invitation');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await apiClient(`/messes/${messId}/invitations/${invitationId}`, {
        method: 'DELETE',
      });
      showNotification('success', 'Invitation revoked');
      fetchSettingsData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to revoke invitation');
    }
  };

  const handleApproveLeave = async (requestId: string) => {
    try {
      await apiClient(`/messes/${messId}/leave-requests/${requestId}/approve`, {
        method: 'POST',
      });
      showNotification('success', 'Leave request approved and room released');
      fetchSettingsData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to approve request');
    }
  };

  const handleRejectLeave = async (requestId: string) => {
    const reason = prompt('Please enter the reason for rejection:');
    if (!reason) return;
    try {
      await apiClient(`/messes/${messId}/leave-requests/${requestId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      showNotification('success', 'Leave request rejected');
      fetchSettingsData();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to reject request');
    }
  };

  const inspectClearance = async (memberId: string) => {
    setClearanceMemberId(memberId);
    try {
      setIsLoadingClearance(true);
      const data = await apiClient<ExitClearanceAudit>(
        `/messes/${messId}/leave-requests/clearance/${memberId}`
      );
      setClearanceData(data);
    } catch {
      // Fallback
    } finally {
      setIsLoadingClearance(false);
    }
  };

  const triggerPwaInstall = () => {
    window.dispatchEvent(new CustomEvent('pwa-trigger-install'));
  };

  if (isLoading) {
    return <PageLoader message="Loading mess configuration & management queue..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Toast Notification */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm flex items-center gap-2 animate-slide-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-primary-600" /> Mess Settings & Workspace
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Manage organization identity, operational meal rules, categories, financial policies, and clearance queue.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="secondary"
            onClick={triggerPwaInstall}
            className="flex items-center gap-2 text-xs"
          >
            <DownloadCloud className="w-4 h-4 text-primary-600" /> Install PWA
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setCreatedInviteUrl(null);
              setInviteEmail('');
              setInviteName('');
              setIsInviteModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Create Invitation
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex border-b border-slate-200 -mx-6 px-6 overflow-x-auto gap-2 mb-6 scrollbar-none">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" /> Profile & Identity
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'rules'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" /> Dining & Meals
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'categories'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tags className="w-4 h-4" /> Custom Categories
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'policies'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> Financial Policies
          </button>
          <button
            onClick={() => setActiveTab('display-alerts')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'display-alerts'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Palette className="w-4 h-4" /> Display & Alerts
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'invitations'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" /> Invitations ({invitations.length})
          </button>
          <button
            onClick={() => setActiveTab('leave-requests')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'leave-requests'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" /> Clearance Queue ({leaveRequests.length})
          </button>
        </div>

        {/* TAB 1: Profile */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-6 max-w-3xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Workspace Information</h3>
            <p className="text-xs text-slate-500 mb-4">Official organization details, local currency, and location.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Mess Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                      Mess Join Code
                    </label>
                    <p className="text-xs text-slate-500">
                      Share this unique code with members so they can join this mess workspace.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-extrabold text-slate-900 bg-white border border-slate-300 rounded-xl px-4 py-2 tracking-widest shadow-sm">
                      {mess?.code || activeMess?.code || 'NO-CODE'}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5"
                    >
                      {codeCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      {codeCopied ? 'Copied!' : 'Copy'}
                    </Button>
                    {isManager && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowRegenModal(true)}
                        className="flex items-center gap-1.5 text-amber-700 hover:bg-amber-50 border-amber-200"
                        title="Regenerate join code to invalidate old code"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Regenerate
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Area / Neighborhood</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Dhanmondi, Mirpur, Sector 4"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Dhaka, Chittagong"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Full Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Flat 4B, House 12, Road 7/A"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1700 000000"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Official Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@messmate.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Currency Code</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Currency Symbol</label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Mess Description / Welcome Note</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Shared co-living flat for university graduates and software developers..."
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <Button type="submit" variant="primary" disabled={isSavingProfile} className="flex items-center gap-2">
              <Save className="w-4 h-4" /> {isSavingProfile ? 'Saving Changes...' : 'Save Profile'}
            </Button>
          </form>
        )}

        {/* TAB 2: Operating Rules */}
        {activeTab === 'rules' && (
          <form onSubmit={handleSaveRules} className="space-y-6 max-w-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Meal & Dining Automation</h3>
            <p className="text-xs text-slate-500 mb-4">Configure daily meal defaults, cutoff timings, and guest meal rates.</p>

            <div className="space-y-4">
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Default Meal Count per Day</h4>
                  <p className="text-xs text-slate-500">Pre-fills meal record when manager opens daily meal entry</p>
                </div>
                <select
                  value={defaultMealCount}
                  onChange={(e) => setDefaultMealCount(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value={1}>1 (Lunch or Dinner)</option>
                  <option value={2}>2 (Lunch & Dinner)</option>
                  <option value={3}>3 (Breakfast, Lunch & Dinner)</option>
                </select>
              </div>

              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Daily Meal Entry Cutoff Hour</h4>
                  <p className="text-xs text-slate-500">24-hour clock cutoff for next day meals (e.g. 21 = 9:00 PM)</p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={mealCutoffHour}
                  onChange={(e) => setMealCutoffHour(Number(e.target.value))}
                  className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div
                onClick={() => setAllowGuestMeals(!allowGuestMeals)}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Allow Guest Meals</h4>
                  <p className="text-xs text-slate-500">Permit residents to record occasional guest meals</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    allowGuestMeals ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {allowGuestMeals ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>

              {allowGuestMeals && (
                <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900">Default Guest Meal Charges ({currencySymbol})</h4>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 mb-1">Breakfast ({currencySymbol})</label>
                      <input
                        type="number"
                        min={0}
                        value={guestBreakfastRate}
                        onChange={(e) => setGuestBreakfastRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Lunch ({currencySymbol})</label>
                      <input
                        type="number"
                        min={0}
                        value={guestLunchRate}
                        onChange={(e) => setGuestLunchRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Dinner ({currencySymbol})</label>
                      <input
                        type="number"
                        min={0}
                        value={guestDinnerRate}
                        onChange={(e) => setGuestDinnerRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" variant="primary" disabled={isSavingRules} className="flex items-center gap-2">
              <Save className="w-4 h-4" /> {isSavingRules ? 'Saving Rules...' : 'Save Dining Rules'}
            </Button>
          </form>
        )}

        {/* TAB 3: Custom Categories Manager */}
        {activeTab === 'categories' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Custom Expense & Bill Categories</h3>
              <p className="text-xs text-slate-500">
                Managers can configure custom categories without code changes. These categories populate dropdowns in
                Expenses, Bills, and Utilities.
              </p>
            </div>

            {/* Expense Categories */}
            <div className="p-5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Variable Expense Categories</h4>
                <span className="text-xs text-slate-500">{expenseCategories.length} categories</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {expenseCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-xs"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory('expense', cat)}
                      className="hover:text-rose-600"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newExpenseCat}
                  onChange={(e) => setNewExpenseCat(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory('expense', newExpenseCat, setNewExpenseCat)}
                  placeholder="New expense category..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddCategory('expense', newExpenseCat, setNewExpenseCat)}
                >
                  <Plus size={14} /> Add
                </Button>
              </div>
            </div>

            {/* Fixed Bill Categories */}
            <div className="p-5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Fixed Monthly Bill Categories</h4>
                <span className="text-xs text-slate-500">{fixedBillCategories.length} categories</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {fixedBillCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-xs"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory('fixed', cat)}
                      className="hover:text-rose-600"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newFixedCat}
                  onChange={(e) => setNewFixedCat(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory('fixed', newFixedCat, setNewFixedCat)}
                  placeholder="New fixed bill category..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddCategory('fixed', newFixedCat, setNewFixedCat)}
                >
                  <Plus size={14} /> Add
                </Button>
              </div>
            </div>

            {/* Utility Categories */}
            <div className="p-5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Utility Bill Categories</h4>
                <span className="text-xs text-slate-500">{utilityCategories.length} categories</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {utilityCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-xs"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory('utility', cat)}
                      className="hover:text-rose-600"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newUtilityCat}
                  onChange={(e) => setNewUtilityCat(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory('utility', newUtilityCat, setNewUtilityCat)}
                  placeholder="New utility category..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddCategory('utility', newUtilityCat, setNewUtilityCat)}
                >
                  <Plus size={14} /> Add
                </Button>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              disabled={isSavingCategories}
              onClick={handleSaveCategories}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> {isSavingCategories ? 'Saving...' : 'Save Category Configurations'}
            </Button>
          </div>
        )}

        {/* TAB 4: Financial & Closing Policies */}
        {activeTab === 'policies' && (
          <form onSubmit={handleSavePolicies} className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Financial & Period Policies</h3>
              <p className="text-xs text-slate-500">
                Governance rules for monthly rent collection, automated utility drafting, and period locking.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Monthly Rent Due Day</h4>
                  <p className="text-xs text-slate-500">Day of the month when house rent is expected from members</p>
                </div>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={rentDueDay}
                  onChange={(e) => setRentDueDay(Number(e.target.value))}
                  className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Month-End Grace Period (Days)</h4>
                  <p className="text-xs text-slate-500">Allowed days after month-end before finalize warning triggers</p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                  className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Default Split Method for Shared Costs</h4>
                  <p className="text-xs text-slate-500">Fallback algorithm applied to miscellaneous mess expenses</p>
                </div>
                <select
                  value={defaultSplitMethod}
                  onChange={(e) => setDefaultSplitMethod(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-sm"
                >
                  <option value="EQUAL">Equal Split</option>
                  <option value="MEAL_BASED">Meal Ratio Based</option>
                  <option value="ROOM_BASED">Room Bed Based</option>
                </select>
              </div>

              <div
                onClick={() => setAutoGenerateUtilities(!autoGenerateUtilities)}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Auto-Generate Recurring Utilities</h4>
                  <p className="text-xs text-slate-500">Automatically draft rent, WiFi, and maid bills on the 1st of every month</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    autoGenerateUtilities ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {autoGenerateUtilities ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>

              <div
                onClick={() => setAllowMemberReopenRequests(!allowMemberReopenRequests)}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Allow Member Reopen Requests</h4>
                  <p className="text-xs text-slate-500">Permit members to file dispute or reopen requests on finalized periods</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    allowMemberReopenRequests ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {allowMemberReopenRequests ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>
            </div>

            <Button type="submit" variant="primary" disabled={isSavingPolicies} className="flex items-center gap-2">
              <Save className="w-4 h-4" /> {isSavingPolicies ? 'Saving Policies...' : 'Save Financial Policies'}
            </Button>
          </form>
        )}

        {/* TAB 5: Display & Notification Preferences */}
        {activeTab === 'display-alerts' && (
          <form onSubmit={handleSavePreferences} className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Display & System Notifications</h3>
              <p className="text-xs text-slate-500">Fine-tune presentation formats and automated alert preferences.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">System Date Format</h4>
                  <p className="text-xs text-slate-500">Format applied across ledgers, reports, and transaction logs</p>
                </div>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-sm"
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (UK/BD)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                </select>
              </div>

              <div
                onClick={() => setCompactTableDensity(!compactTableDensity)}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Compact Table Density</h4>
                  <p className="text-xs text-slate-500">Reduce table row padding for power users and small screens</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    compactTableDensity ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {compactTableDensity ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>

              <div
                onClick={() => setShowDecimals(!showDecimals)}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Display Currency Fractions (.00)</h4>
                  <p className="text-xs text-slate-500">Show exact paisa/cents for all transaction figures</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    showDecimals ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {showDecimals ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>

              <div
                onClick={() => setEmailAlerts(!emailAlerts)}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Email Notifications</h4>
                  <p className="text-xs text-slate-500">Receive summary reports on major financial movements</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    emailAlerts ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {emailAlerts ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>

              <div
                onClick={() => setPushAlerts(!pushAlerts)}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">PWA Mobile Push Notifications</h4>
                  <p className="text-xs text-slate-500">Receive instant push notifications when installed on mobile devices</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    pushAlerts ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {pushAlerts ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>

              <div
                onClick={() => setBillDueReminders(!billDueReminders)}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Bill Due & Advance Deposit Reminders</h4>
                  <p className="text-xs text-slate-500">Automated reminder 2 days prior to rent due day</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    billDueReminders ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {billDueReminders ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>
            </div>

            <Button type="submit" variant="primary" disabled={isSavingPreferences} className="flex items-center gap-2">
              <Save className="w-4 h-4" /> {isSavingPreferences ? 'Saving Preferences...' : 'Save Preferences'}
            </Button>
          </form>
        )}

        {/* TAB 6: Invitations */}
        {activeTab === 'invitations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Active & Past Invitations</h3>
                <p className="text-xs text-slate-500">Cryptographically secure single-use tokens valid for 7 days.</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setCreatedInviteUrl(null);
                  setIsInviteModalOpen(true);
                }}
              >
                <UserPlus className="w-4 h-4 mr-1.5" /> Invite Member
              </Button>
            </div>

            {invitations.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 text-center">No active invitations found.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-sm min-w-[600px]">
                  <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Invitee Email</th>
                      <th className="py-2.5 px-3">Assigned Role</th>
                      <th className="py-2.5 px-3">Room</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Expires At</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 text-slate-900 font-medium">{inv.email}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant="primary">{inv.role}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{inv.roomNo || 'Unassigned'}</td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={
                              inv.status === 'ACCEPTED'
                                ? 'success'
                                : inv.status === 'EXPIRED'
                                ? 'danger'
                                : inv.status === 'REVOKED'
                                ? 'neutral'
                                : 'warning'
                            }
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-500">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {inv.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      `${window.location.origin}/invite/${inv.token}`
                                    );
                                    showNotification('success', 'Invite link copied to clipboard');
                                  }}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800"
                                  title="Copy Invite URL"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRevokeInvitation(inv.id)}
                                  className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600"
                                  title="Revoke Invitation"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: Leave & Clearance Queue */}
        {activeTab === 'leave-requests' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Leave & Exit Clearance Requests</h3>
            <p className="text-xs text-slate-500 mb-4">
              Permanent exits automatically release room capacity and transition the member status.
            </p>

            {leaveRequests.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 text-center">No leave requests currently pending.</p>
            ) : (
              <div className="space-y-3">
                {leaveRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{req.member?.user.name || 'Member'}</span>
                        <Badge variant={req.type === 'PERMANENT_EXIT' ? 'danger' : 'primary'}>
                          {req.type === 'PERMANENT_EXIT' ? 'Permanent Exit' : 'Temporary Leave'}
                        </Badge>
                        <Badge
                          variant={
                            req.status === 'APPROVED'
                              ? 'success'
                              : req.status === 'REJECTED'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {req.status}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap gap-3">
                        <span>From: {new Date(req.startDate).toLocaleDateString()}</span>
                        {req.endDate && <span>Until: {new Date(req.endDate).toLocaleDateString()}</span>}
                        {req.reason && <span>Reason: {req.reason}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => inspectClearance(req.memberId)}
                        className="flex items-center gap-1"
                      >
                        <FileCheck className="w-3.5 h-3.5" /> Clearance Audit
                      </Button>

                      {req.status === 'PENDING' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApproveLeave(req.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            Approve
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleRejectLeave(req.id)}>
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Invitation Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite New Member to Mess"
      >
        {createdInviteUrl ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-lg">Single-Use Link Generated!</h4>
            <p className="text-xs text-slate-500">
              Share this secure link with the member. It expires in 7 days and can only be used once.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left font-mono text-xs text-emerald-700 break-all select-all flex items-center justify-between gap-2">
              <span>{createdInviteUrl}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(createdInviteUrl);
                  showNotification('success', 'Copied to clipboard');
                }}
              >
                Copy
              </Button>
            </div>

            <Button variant="primary" onClick={() => setIsInviteModalOpen(false)} className="w-full mt-2">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreateInvitation} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Invitee Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="roommate@example.com"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Invitee Full Name (Optional)</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Rahim Hasan"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Role in Mess</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="MANAGER">MANAGER</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Initial Room (Optional)</label>
                <input
                  type="text"
                  value={inviteRoomNo}
                  onChange={(e) => setInviteRoomNo(e.target.value)}
                  placeholder="e.g. A-101"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="secondary" type="button" onClick={() => setIsInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isCreatingInvite}>
                {isCreatingInvite ? 'Generating...' : 'Generate Invite Link'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Exit Clearance Audit Modal */}
      <Modal
        isOpen={Boolean(clearanceMemberId)}
        onClose={() => setClearanceMemberId(null)}
        title="Exit Clearance Audit Breakdown"
      >
        {isLoadingClearance ? (
          <PageLoader message="Computing clearance ledger status..." />
        ) : clearanceData ? (
          <div className="space-y-4 text-sm">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Member:</span>
                <span className="font-bold text-slate-900">{clearanceData.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Credits Paid:</span>
                <span className="font-mono font-medium text-emerald-600">
                  {currencySymbol}{clearanceData.financialSummary.totalCredits.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Debits Consumed:</span>
                <span className="font-mono font-medium text-rose-600">
                  {currencySymbol}{clearanceData.financialSummary.totalDebits.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-700 font-semibold">Net Balance:</span>
                <span
                  className={`font-mono font-bold ${
                    clearanceData.financialSummary.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {currencySymbol}{clearanceData.financialSummary.netBalance.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Clearance Prerequisites
              </h5>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">Room Bed Vacated</span>
                  {clearanceData.exitChecklist.roomVacated ? (
                    <Badge variant="success">Yes</Badge>
                  ) : (
                    <Badge variant="warning">Auto-releases on approve</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">All Debts Settled</span>
                  {clearanceData.exitChecklist.allDebtsSettled ? (
                    <Badge variant="success">Settled</Badge>
                  ) : (
                    <Badge variant="danger">Owes Money</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">No Unposted Utility Bills</span>
                  {clearanceData.exitChecklist.noPendingUtilityBills ? (
                    <Badge variant="success">Clean</Badge>
                  ) : (
                    <Badge variant="warning">Pending Bills</Badge>
                  )}
                </div>
              </div>
            </div>

            <Button variant="primary" onClick={() => setClearanceMemberId(null)} className="w-full mt-2">
              Close Audit
            </Button>
          </div>
        ) : null}
      </Modal>

      {/* Join Code Regeneration Confirmation Modal */}
      {showRegenModal && (
        <Modal
          isOpen={showRegenModal}
          onClose={() => setShowRegenModal(false)}
          title="Regenerate Mess Join Code"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-semibold">Are you sure you want to regenerate the join code?</p>
                <p>
                  The current code <strong>{mess?.code || activeMess?.code}</strong> will be <strong>immediately invalidated</strong>.
                  Anyone attempting to use the old code will be rejected. Current members will not be affected.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowRegenModal(false)}
                disabled={isRegeneratingCode}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleRegenerateCode}
                disabled={isRegeneratingCode}
                className="flex items-center gap-1.5"
              >
                <RotateCcw className={`w-4 h-4 ${isRegeneratingCode ? 'animate-spin' : ''}`} />
                {isRegeneratingCode ? 'Regenerating...' : 'Yes, Regenerate Code'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
