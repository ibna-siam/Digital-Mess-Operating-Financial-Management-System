import React, { useState, useEffect } from 'react';
import {
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
  MapPin,
  Calendar,
  DollarSign,
  Utensils,
  Receipt,
  FileSpreadsheet,
  Zap,
  Phone,
  ShieldCheck,
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

  const tabsConfig = [
    { id: 'profile' as const, label: 'Profile & Identity', icon: Building2 },
    { id: 'rules' as const, label: 'Dining & Meals', icon: Sliders },
    { id: 'categories' as const, label: 'Custom Categories', icon: Tags },
    { id: 'policies' as const, label: 'Financial Policies', icon: ShieldAlert },
    { id: 'display-alerts' as const, label: 'Display & Alerts', icon: Palette },
    { id: 'invitations' as const, label: 'Invitations', icon: Mail, count: invitations.length },
    { id: 'leave-requests' as const, label: 'Clearance Queue', icon: Clock, count: leaveRequests.length },
  ];

  if (isLoading) {
    return <PageLoader message="Loading mess configuration & management queue..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Toast Notification */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-sm flex items-center gap-2.5 animate-slide-in backdrop-blur-md ${
            feedback.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/30 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Modern Workspace Hero Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-md">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {name || activeMess?.name || 'Mess Settings'}
                </h1>
                <Badge variant="primary" className="font-semibold text-xs">
                  {activeMess?.myRole || 'MANAGER'}
                </Badge>
                {activeMess?.code && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    {activeMess.code}
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
                Configure operational dining rules, custom categories, financial grace policies, cryptographic member invites, and exit clearance queue.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="secondary"
              onClick={triggerPwaInstall}
              className="flex items-center gap-2 text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xs"
            >
              <DownloadCloud className="w-4 h-4 text-emerald-600" />
              <span>Install App (PWA)</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setCreatedInviteUrl(null);
                setInviteEmail('');
                setInviteName('');
                setIsInviteModalOpen(true);
              }}
              className="flex items-center gap-2 text-xs font-semibold py-2.5 px-4 rounded-xl shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Member</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Modern Segmented Navigation Pill Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 px-1">
          {tabsConfig.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-slate-800 text-emerald-300' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Settings Card Container */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        {/* ======================================================== */}
        {/* TAB 1: Profile & Identity */}
        {/* ======================================================== */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-8 max-w-4xl">
            {/* Join Code Highlight Card */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 border border-emerald-500/20 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                      Mess Invitation Join Code
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 max-w-md">
                    Share this unique code with roommates or students. They can enter it during sign-up to immediately link to this mess.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="font-mono text-lg sm:text-xl font-extrabold text-slate-900 bg-white border border-slate-300 rounded-xl px-4 py-2 tracking-widest shadow-xs">
                    {mess?.code || activeMess?.code || 'NO-CODE'}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 py-2 px-3 text-xs font-bold"
                  >
                    {codeCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {codeCopied ? 'Copied!' : 'Copy Code'}
                  </Button>
                  {isManager && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowRegenModal(true)}
                      className="flex items-center gap-1.5 py-2 px-3 text-xs font-bold text-amber-800 hover:bg-amber-50 border-amber-300"
                      title="Invalidate old code and generate new one"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Regenerate
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Section 1: Basic Identity */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" /> Workspace Identity & Overview
                </h3>
                <p className="text-xs text-slate-500">Official organizational title and public mess introduction.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mess / Residence Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Padma Student Residence, Green View Flat"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Description & Welcome Message
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Co-living residence for university students and software developers. Managed on a monthly zero-sum cost basis."
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Physical Coordinates */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" /> Geographic & Postal Location
                </h3>
                <p className="text-xs text-slate-500">Helps members locate deliveries, utility bills, and address records.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Area / Neighborhood
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Dhanmondi, Banani, Sector 4"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Dhaka, Chattogram, Sylhet"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Street Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Flat 4B, House 12, Road 7/A, Block C"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Official Contacts & Currency */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Contacts & Financial Locale
                </h3>
                <p className="text-xs text-slate-500">Standard operational currency and notification endpoints.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Manager Contact Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1700 000000"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Official Mess Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@messmate.com"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Currency ISO Code
                  </label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={isSavingProfile}
                className="flex items-center gap-2 py-2.5 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Save className="w-4 h-4" /> {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 2: Dining & Operating Rules */}
        {/* ======================================================== */}
        {activeTab === 'rules' && (
          <form onSubmit={handleSaveRules} className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-600" /> Meal Automation & Cutoff Policies
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define the default daily meal counts, entry cutoff hours, and guest meal rates.
              </p>
            </div>

            <div className="space-y-4">
              {/* Default Meal Count */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900">Default Meal Count per Day</h4>
                  <p className="text-xs text-slate-500">
                    Pre-fills meal record counts when manager initiates daily batch entry.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                  {[1, 2, 3].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDefaultMealCount(val)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        defaultMealCount === val
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {val} {val === 1 ? 'Meal' : 'Meals'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cutoff Hour */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900">Daily Meal Change Cutoff Hour</h4>
                  <p className="text-xs text-slate-500">
                    Members cannot modify next day meal status past this 24-hr clock time.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                    {mealCutoffHour === 0
                      ? '12:00 AM'
                      : mealCutoffHour < 12
                      ? `${mealCutoffHour}:00 AM`
                      : mealCutoffHour === 12
                      ? '12:00 PM'
                      : `${mealCutoffHour - 12}:00 PM`}
                  </span>
                  <select
                    value={mealCutoffHour}
                    onChange={(e) => setMealCutoffHour(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>
                        {i}:00 ({i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Guest Meals Switch Card */}
              <div
                onClick={() => setAllowGuestMeals(!allowGuestMeals)}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all select-none"
              >
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900">Allow Guest Meals</h4>
                  <p className="text-xs text-slate-500">
                    Allow residents to host occasional visiting guests and record guest meal counts.
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    allowGuestMeals ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      allowGuestMeals ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Guest Meal Rates Grid */}
              {allowGuestMeals && (
                <div className="bg-emerald-50/50 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                      Standard Guest Meal Tariffs ({currencySymbol})
                    </h4>
                    <span className="text-xs text-emerald-700 font-semibold">Credited to Food Cost Pool</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white border border-emerald-100 rounded-xl p-3">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Breakfast ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={guestBreakfastRate}
                        onChange={(e) => setGuestBreakfastRate(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 font-bold text-sm"
                      />
                    </div>

                    <div className="bg-white border border-emerald-100 rounded-xl p-3">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Lunch ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={guestLunchRate}
                        onChange={(e) => setGuestLunchRate(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 font-bold text-sm"
                      />
                    </div>

                    <div className="bg-white border border-emerald-100 rounded-xl p-3">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Dinner ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={guestDinnerRate}
                        onChange={(e) => setGuestDinnerRate(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 font-bold text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={isSavingRules}
                className="flex items-center gap-2 py-2.5 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Save className="w-4 h-4" /> {isSavingRules ? 'Saving Rules...' : 'Save Dining Rules'}
              </Button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 3: Custom Categories */}
        {/* ======================================================== */}
        {activeTab === 'categories' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tags className="w-4 h-4 text-emerald-600" /> Dynamic Tag Categories
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize dropdown classification tags across Bazar expenses, fixed month-end bills, and utility readings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Category 1: Variable Bazar Expenses */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-emerald-600" /> Variable Expenses
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                      {expenseCategories.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">Daily grocery, meat, and emergency bazar tags.</p>

                  <div className="flex flex-wrap gap-1.5 min-h-[140px] content-start">
                    {expenseCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs group hover:border-rose-200 hover:bg-rose-50/50 transition-colors"
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory('expense', cat)}
                          className="text-slate-400 group-hover:text-rose-600"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newExpenseCat}
                    onChange={(e) => setNewExpenseCat(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory('expense', newExpenseCat, setNewExpenseCat)}
                    placeholder="New category..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddCategory('expense', newExpenseCat, setNewExpenseCat)}
                    className="py-1.5 px-3 text-xs"
                  >
                    <Plus size={13} />
                  </Button>
                </div>
              </div>

              {/* Category 2: Fixed Monthly Bills */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-blue-600" /> Fixed Monthly Bills
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                      {fixedBillCategories.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">House rent, cook salary, security, and cleaning.</p>

                  <div className="flex flex-wrap gap-1.5 min-h-[140px] content-start">
                    {fixedBillCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs group hover:border-rose-200 hover:bg-rose-50/50 transition-colors"
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory('fixed', cat)}
                          className="text-slate-400 group-hover:text-rose-600"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newFixedCat}
                    onChange={(e) => setNewFixedCat(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory('fixed', newFixedCat, setNewFixedCat)}
                    placeholder="New bill category..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddCategory('fixed', newFixedCat, setNewFixedCat)}
                    className="py-1.5 px-3 text-xs"
                  >
                    <Plus size={13} />
                  </Button>
                </div>
              </div>

              {/* Category 3: Utility Bills */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600" /> Utility Categories
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                      {utilityCategories.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">Electricity, broadband Wi-Fi, WASA, gas cylinders.</p>

                  <div className="flex flex-wrap gap-1.5 min-h-[140px] content-start">
                    {utilityCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs group hover:border-rose-200 hover:bg-rose-50/50 transition-colors"
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory('utility', cat)}
                          className="text-slate-400 group-hover:text-rose-600"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newUtilityCat}
                    onChange={(e) => setNewUtilityCat(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory('utility', newUtilityCat, setNewUtilityCat)}
                    placeholder="New utility category..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddCategory('utility', newUtilityCat, setNewUtilityCat)}
                    className="py-1.5 px-3 text-xs"
                  >
                    <Plus size={13} />
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="button"
                variant="primary"
                disabled={isSavingCategories}
                onClick={handleSaveCategories}
                className="flex items-center gap-2 py-2.5 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Save className="w-4 h-4" /> {isSavingCategories ? 'Saving Tags...' : 'Save Category Configurations'}
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: Financial Policies */}
        {/* ======================================================== */}
        {activeTab === 'policies' && (
          <form onSubmit={handleSavePolicies} className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-600" /> Financial Governance & Closing Policies
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Establish transparent financial policies for monthly rent collection, automatic utility drafting, and period finalization.
              </p>
            </div>

            <div className="space-y-4">
              {/* Rent Due Day */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" /> Monthly Rent Due Day
                  </h4>
                  <p className="text-xs text-slate-500">
                    Day of the month when house rent is due from members (1 to 28).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Every</span>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={rentDueDay}
                    onChange={(e) => setRentDueDay(Number(e.target.value))}
                    className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-600">th of the month</span>
                </div>
              </div>

              {/* Grace Period */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" /> Month-End Grace Period (Days)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Buffer days after calendar month-end before automated late penalties or finalize alerts appear.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                    className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-600">Days</span>
                </div>
              </div>

              {/* Default Split Method */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Default Expense Split Method
                  </h4>
                  <p className="text-xs text-slate-500">
                    Fallback allocation mathematical rule for miscellaneous shared purchases.
                  </p>
                </div>
                <select
                  value={defaultSplitMethod}
                  onChange={(e) => setDefaultSplitMethod(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="EQUAL">Equal Split (1 / N)</option>
                  <option value="MEAL_BASED">Meal Ratio Proportional</option>
                  <option value="ROOM_BASED">Room Bed Proportional</option>
                </select>
              </div>

              {/* Auto Generate Utilities */}
              <div
                onClick={() => setAutoGenerateUtilities(!autoGenerateUtilities)}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all select-none"
              >
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900">Auto-Generate Recurring Utilities</h4>
                  <p className="text-xs text-slate-500">
                    Automatically draft house rent, Wi-Fi broadband, and maid bills on the 1st of every month.
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    autoGenerateUtilities ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      autoGenerateUtilities ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Allow Reopen Requests */}
              <div
                onClick={() => setAllowMemberReopenRequests(!allowMemberReopenRequests)}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all select-none"
              >
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900">Allow Member Reopen Requests</h4>
                  <p className="text-xs text-slate-500">
                    Permit residents to submit audit recalculation requests on finalized billing cycles.
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    allowMemberReopenRequests ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      allowMemberReopenRequests ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={isSavingPolicies}
                className="flex items-center gap-2 py-2.5 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Save className="w-4 h-4" /> {isSavingPolicies ? 'Saving Policies...' : 'Save Financial Policies'}
              </Button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 5: Display & Alerts */}
        {/* ======================================================== */}
        {activeTab === 'display-alerts' && (
          <form onSubmit={handleSavePreferences} className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-600" /> Visual Formatting & System Notifications
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure table visual density, date serialization standards, and alert push notifications.
              </p>
            </div>

            <div className="space-y-4">
              {/* Date Format */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900">System Date Presentation</h4>
                  <p className="text-xs text-slate-500">
                    Standard format applied across reports, ledgers, and transaction timestamps.
                  </p>
                </div>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (UK / Bangladesh Standard)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
                </select>
              </div>

              {/* Compact Density */}
              <div
                onClick={() => setCompactTableDensity(!compactTableDensity)}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all select-none"
              >
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900">Compact Table Density</h4>
                  <p className="text-xs text-slate-500">
                    Condense row vertical padding for power users and smaller laptop viewports.
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    compactTableDensity ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      compactTableDensity ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Decimal Fractions */}
              <div
                onClick={() => setShowDecimals(!showDecimals)}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all select-none"
              >
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900">Display Currency Fractions (.00)</h4>
                  <p className="text-xs text-slate-500">
                    Show exact 2-decimal fractional currency figures across all balance cards.
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    showDecimals ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      showDecimals ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Email Alerts */}
              <div
                onClick={() => setEmailAlerts(!emailAlerts)}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all select-none"
              >
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900">Email Digest Notifications</h4>
                  <p className="text-xs text-slate-500">
                    Receive email digests on month-end finalization and manager announcements.
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    emailAlerts ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      emailAlerts ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Push Alerts */}
              <div
                onClick={() => setPushAlerts(!pushAlerts)}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all select-none"
              >
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900">PWA Mobile Push Notifications</h4>
                  <p className="text-xs text-slate-500">
                    Receive instant push alerts on mobile devices when installed as a PWA.
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    pushAlerts ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      pushAlerts ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Bill Due Reminders */}
              <div
                onClick={() => setBillDueReminders(!billDueReminders)}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all select-none"
              >
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900">Advance Deposit & Rent Reminders</h4>
                  <p className="text-xs text-slate-500">
                    Automatically prompt residents 48 hours prior to the monthly rent due date.
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    billDueReminders ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      billDueReminders ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={isSavingPreferences}
                className="flex items-center gap-2 py-2.5 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Save className="w-4 h-4" /> {isSavingPreferences ? 'Saving Preferences...' : 'Save Preferences'}
              </Button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 6: Invitations */}
        {/* ======================================================== */}
        {activeTab === 'invitations' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" /> Active & Historical Invitations
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cryptographically secured single-use tokens valid for 7 days.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setCreatedInviteUrl(null);
                  setIsInviteModalOpen(true);
                }}
                className="flex items-center gap-1.5 py-2 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Member</span>
              </Button>
            </div>

            {invitations.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No invitations generated</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click 'Invite Member' to create a single-use token or share the Mess Join Code with your roommates.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4">Invitee Email</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Room No</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Expires At</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {invitations.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{inv.email}</td>
                          <td className="py-3.5 px-4">
                            <Badge variant={inv.role === 'MANAGER' ? 'primary' : 'neutral'}>
                              {inv.role}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-mono">
                            {inv.roomNo || 'Unassigned'}
                          </td>
                          <td className="py-3.5 px-4">
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
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                            {new Date(inv.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {inv.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        `${window.location.origin}/invite/${inv.token}`
                                      );
                                      showNotification('success', 'Invite link copied to clipboard');
                                    }}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                                    title="Copy Invite URL"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRevokeInvitation(inv.id)}
                                    className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
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

                {/* Mobile View Feed Cards */}
                <div className="block md:hidden space-y-3">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 text-sm block break-all">
                            {inv.email}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                            <span>Room: <strong className="text-slate-700">{inv.roomNo || 'Unassigned'}</strong></span>
                            <span>•</span>
                            <span>Expires: {new Date(inv.expiresAt).toLocaleDateString()}</span>
                          </div>
                        </div>
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
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                        <Badge variant={inv.role === 'MANAGER' ? 'primary' : 'neutral'}>
                          {inv.role}
                        </Badge>

                        {inv.status === 'PENDING' && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/invite/${inv.token}`
                                );
                                showNotification('success', 'Invite link copied');
                              }}
                              className="flex items-center gap-1 py-1 px-2.5 text-xs font-semibold"
                            >
                              <Copy className="w-3.5 h-3.5" /> Copy Link
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRevokeInvitation(inv.id)}
                              className="py-1 px-2.5 text-xs font-semibold"
                            >
                              Revoke
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: Leave & Clearance Queue */}
        {/* ======================================================== */}
        {activeTab === 'leave-requests' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" /> Member Leave & Exit Clearance Queue
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review departures, perform financial clearance audits, and release room bed inventory.
              </p>
            </div>

            {leaveRequests.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Clearance queue is clean</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No active temporary leave or permanent exit requests currently pending approval.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaveRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 bg-slate-50/80 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                          {req.member?.user.name || 'Member'}
                        </span>
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

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
                        <span>From: <strong>{new Date(req.startDate).toLocaleDateString()}</strong></span>
                        {req.endDate && (
                          <span>Until: <strong>{new Date(req.endDate).toLocaleDateString()}</strong></span>
                        )}
                        {req.reason && <span>Reason: <em>"{req.reason}"</em></span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => inspectClearance(req.memberId)}
                        className="flex items-center gap-1.5 py-2 px-3 text-xs font-bold"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-600" /> Clearance Audit
                      </Button>

                      {req.status === 'PENDING' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApproveLeave(req.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 text-xs font-bold shadow-xs"
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRejectLeave(req.id)}
                            className="py-2 px-3 text-xs font-bold"
                          >
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

      {/* ======================================================== */}
      {/* Create Invitation Modal */}
      {/* ======================================================== */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite New Roommate / Member"
      >
        {createdInviteUrl ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-lg">Single-Use Link Generated!</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Share this secure URL with the roommate. The token expires in 7 days and can only be used once.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left font-mono text-xs text-emerald-700 break-all select-all flex items-center justify-between gap-3 shadow-inner">
              <span className="truncate">{createdInviteUrl}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(createdInviteUrl);
                  showNotification('success', 'Invite link copied to clipboard');
                }}
                className="shrink-0 font-bold text-xs"
              >
                Copy
              </Button>
            </div>

            <Button
              variant="primary"
              onClick={() => setIsInviteModalOpen(false)}
              className="w-full mt-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreateInvitation} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Invitee Email Address *
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="roommate@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Invitee Full Name (Optional)
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Tanvir Hasan"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assigned Mess Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="MEMBER">MEMBER (Resident)</option>
                  <option value="MANAGER">MANAGER (Financial Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pre-Assigned Room (Optional)
                </label>
                <input
                  type="text"
                  value={inviteRoomNo}
                  onChange={(e) => setInviteRoomNo(e.target.value)}
                  placeholder="e.g. Room A-2, Bed 1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isCreatingInvite}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isCreatingInvite ? 'Generating...' : 'Generate Invite Link'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* Exit Clearance Audit Modal */}
      {/* ======================================================== */}
      <Modal
        isOpen={Boolean(clearanceMemberId)}
        onClose={() => setClearanceMemberId(null)}
        title="Exit Clearance Audit Breakdown"
      >
        {isLoadingClearance ? (
          <PageLoader message="Computing member ledger and financial clearance status..." />
        ) : clearanceData ? (
          <div className="space-y-4 text-sm">
            {/* Financial Ledger Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold uppercase">Resident Member:</span>
                <span className="font-extrabold text-slate-900 text-sm">{clearanceData.memberName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Total Credits Paid:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {currencySymbol}{clearanceData.financialSummary.totalCredits.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Total Debits Consumed:</span>
                <span className="font-mono font-bold text-rose-600">
                  {currencySymbol}{clearanceData.financialSummary.totalDebits.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-2.5">
                <span className="text-slate-800 font-bold">Net Final Balance:</span>
                <span
                  className={`font-mono text-base font-black ${
                    clearanceData.financialSummary.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {currencySymbol}{clearanceData.financialSummary.netBalance.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Checklist Prerequisites */}
            <div className="space-y-2">
              <h5 className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                Clearance Gate Prerequisites
              </h5>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Room Bed Inventory Vacated</span>
                  {clearanceData.exitChecklist.roomVacated ? (
                    <Badge variant="success">Completed</Badge>
                  ) : (
                    <Badge variant="warning">Auto-releases on approve</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">All Mess Debts Fully Settled</span>
                  {clearanceData.exitChecklist.allDebtsSettled ? (
                    <Badge variant="success">Settled (Clean)</Badge>
                  ) : (
                    <Badge variant="danger">Outstanding Dues</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">No Unposted Utility Reading Bills</span>
                  {clearanceData.exitChecklist.noPendingUtilityBills ? (
                    <Badge variant="success">Clean</Badge>
                  ) : (
                    <Badge variant="warning">Pending Calculations</Badge>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => setClearanceMemberId(null)}
              className="w-full mt-2 font-bold bg-slate-900 text-white"
            >
              Close Clearance Audit
            </Button>
          </div>
        ) : null}
      </Modal>

      {/* ======================================================== */}
      {/* Join Code Regeneration Confirmation Modal */}
      {/* ======================================================== */}
      {showRegenModal && (
        <Modal
          isOpen={showRegenModal}
          onClose={() => setShowRegenModal(false)}
          title="Regenerate Mess Join Code"
        >
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 space-y-1">
                <p className="font-bold text-sm">Are you sure you want to regenerate the join code?</p>
                <p className="leading-relaxed">
                  The active code <span className="font-mono font-bold bg-amber-100 px-1 rounded">{mess?.code || activeMess?.code}</span> will be <strong>immediately invalidated</strong>.
                  Anyone attempting to join with the old code will be rejected. Existing members will remain unaffected.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowRegenModal(false)}
                disabled={isRegeneratingCode}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleRegenerateCode}
                disabled={isRegeneratingCode}
                className="flex items-center gap-1.5 text-xs font-bold"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRegeneratingCode ? 'animate-spin' : ''}`} />
                {isRegeneratingCode ? 'Regenerating...' : 'Yes, Regenerate Code'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
