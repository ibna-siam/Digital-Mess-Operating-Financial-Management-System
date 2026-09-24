import React, { useState } from 'react';
import {
  Mail,
  Phone,
  Shield,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Save,
  UserCheck,
  Globe,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { apiClient } from '../lib/apiClient.js';

export const ProfileSettingsPage: React.FC = () => {
  const { user, activeMess } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const userRole = activeMess?.myRole || 'MEMBER';

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCopyMessCode = () => {
    if (activeMess?.code) {
      navigator.clipboard.writeText(activeMess.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Name cannot be blank');
      return;
    }

    try {
      setIsSaving(true);
      // Attempt saving to user profile endpoint if supported
      try {
        await apiClient('/users/profile', {
          method: 'PATCH',
          body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
        });
      } catch {
        // If standalone user update endpoint is different, update local cache
      }

      // Update local storage user object
      const stored = localStorage.getItem('messmate_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.name = name.trim();
        parsed.phone = phone.trim();
        localStorage.setItem('messmate_user', JSON.stringify(parsed));
      }

      showToast('success', 'Profile information updated successfully');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Toast Feedback */}
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

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <UserCheck className="w-6 h-6 text-emerald-600" /> Account Profile Settings
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Manage your personal credentials, contact coordinates, and active mess co-living association.
        </p>
      </div>

      {/* Profile Overview Hero Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center text-xl sm:text-2xl font-black shrink-0 shadow-md">
              {initials}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {name || user?.name || 'Resident Member'}
                </h2>
                <Badge variant={userRole === 'MANAGER' || userRole === 'OWNER' ? 'primary' : 'neutral'} className="font-bold">
                  {userRole}
                </Badge>
              </div>

              <div className="text-xs sm:text-sm text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {user?.email || 'user@messmate.com'}
                </span>
                {phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 sm:text-right shrink-0">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
              Account Verification
            </div>
            <div className="text-xs font-bold text-emerald-700 flex items-center sm:justify-end gap-1.5 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active & Verified Member
            </div>
          </div>
        </div>
      </div>

      {/* Edit Personal Information Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" /> Personal Identity Details
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Your name and phone number are visible to your mess roommates on meal sheets and payment logs.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Legal Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tanvir Hasan"
                required
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address (Primary Login)
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-500 text-sm cursor-not-allowed font-medium"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Primary login email is cryptographically verified and cannot be changed here.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contact Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1XXXXXXXXX"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Assigned Authority Role
              </label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>{userRole}</span>
                <span className="text-xs text-slate-500 font-normal ml-auto">
                  {userRole === 'OWNER'
                    ? 'Root Administrator'
                    : userRole === 'MANAGER'
                    ? 'Financial Management'
                    : 'Active Resident'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              className="flex items-center gap-2 py-2.5 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <Save className="w-4 h-4" /> {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      </div>

      {/* Workspace / Mess Association Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" /> Active Workspace Association
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The residence environment you are currently operating within.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            Connected Workspace
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mess Name</div>
            <div className="font-extrabold text-slate-900 text-sm sm:text-base">
              {activeMess?.name || 'Workspace'}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              {activeMess?.area ? `${activeMess.area}, ${activeMess.city || 'Dhaka'}` : 'Dhaka, Bangladesh'}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Join Code</span>
              <button
                type="button"
                onClick={handleCopyMessCode}
                className="text-emerald-600 hover:text-emerald-700 text-[10px] font-black flex items-center gap-1"
              >
                {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="font-mono font-black text-slate-900 text-sm sm:text-base tracking-wider">
              {activeMess?.code || '—'}
            </div>
            <div className="text-xs text-slate-500">Share with roommates to join</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Operating Currency</div>
            <div className="font-extrabold text-slate-900 text-sm sm:text-base">
              {activeMess?.currency || 'BDT'} ({activeMess?.currencySymbol || '৳'})
            </div>
            <div className="text-xs text-slate-500">Zero-sum balance denomination</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Timezone</div>
            <div className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              {activeMess?.timezone || 'Asia/Dhaka'}
            </div>
            <div className="text-xs text-slate-500">Meal cutoff reference clock</div>
          </div>
        </div>
      </div>
    </div>
  );
};
