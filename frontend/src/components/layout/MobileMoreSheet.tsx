import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Users,
  ShoppingBag,
  Receipt,
  CheckCircle2,
  Lock,
  BarChart3,
  FileCheck,
  ShieldAlert,
  Settings,
  BellRing,
  User,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNotificationPreferences?: () => void;
}

export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({
  isOpen,
  onClose,
  onOpenNotificationPreferences,
}) => {
  const { user, activeMess, logout } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const roleLabel = activeMess?.myRole === 'OWNER' ? 'MANAGER' : activeMess?.myRole || 'MEMBER';
  const isManager = roleLabel === 'MANAGER';

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const handleNavigate = (to: string) => {
    onClose();
    navigate(to);
  };

  const sections = [
    {
      title: 'Operations',
      items: [
        { label: 'Members & Rooms', desc: 'Directory, rooms & residents', icon: <Users size={17} className="text-blue-500" />, to: '/members', badge: null },
        { label: 'Bazar Log', desc: 'Daily grocery & market purchases', icon: <ShoppingBag size={17} className="text-emerald-500" />, to: '/bazar', badge: null },
        { label: 'Daily Expenses', desc: 'Overhead costs & shared bills', icon: <Receipt size={17} className="text-amber-500" />, to: '/expenses', badge: null },
      ],
    },
    {
      title: 'Finances & Closing',
      items: [
        { label: 'Bills & Utilities', desc: 'House rent, Wi-Fi, electricity & gas', icon: <Receipt size={17} className="text-indigo-500" />, to: '/bills-utilities', badge: null },
        { label: 'Smart Settlement', desc: 'P2P debt clearing & balance payout', icon: <CheckCircle2 size={17} className="text-teal-500" />, to: '/settlement', badge: null },
        ...(isManager
          ? [{ label: 'Month-End Closing', desc: 'Audit checklists & balance snapshots', icon: <Lock size={17} className="text-purple-500" />, to: '/month-end', badge: 'Manager' }]
          : []),
      ],
    },
    {
      title: 'Insights & Audit',
      items: [
        { label: 'Financial Reports', desc: 'Monthly statements & analytics', icon: <BarChart3 size={17} className="text-cyan-500" />, to: '/reports', badge: null },
        { label: 'Documents & Vouchers', desc: 'Rent slips, bazaar receipts & bills', icon: <FileCheck size={17} className="text-emerald-500" />, to: '/documents', badge: null },
        ...(isManager
          ? [{ label: 'Audit Trail', desc: 'System logs & action history', icon: <ShieldAlert size={17} className="text-rose-500" />, to: '/audit-logs', badge: null }]
          : []),
      ],
    },
    {
      title: 'Preferences',
      items: [
        ...(isManager
          ? [{ label: 'Mess Settings', desc: 'Rules, meal rates & currency', icon: <Settings size={17} className="text-slate-600" />, to: '/settings', badge: null }]
          : []),
        { label: 'Profile & Account', desc: 'Security, password & personal info', icon: <User size={17} className="text-slate-600" />, to: '/profile', badge: null },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-t-[32px] shadow-2xl flex flex-col max-h-[88vh] animate-in fade-in slide-in-from-bottom-8 duration-200"
        style={{
          boxShadow: '0 -20px 50px -10px rgba(15, 23, 42, 0.3)',
          paddingBottom: 'max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Indicator */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Resident Mini Profile Card */}
        <div className="px-5 py-3 mx-4 mt-1 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate leading-tight">{user?.name || 'Resident'}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-white/10 text-emerald-300 uppercase tracking-wider">
                  {roleLabel}
                </span>
                <span className="text-[11px] text-slate-300 truncate font-medium">
                  {activeMess?.name || 'MessMate'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors shrink-0"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Navigation Hub */}
        <div className="overflow-y-auto px-4 py-3 space-y-3.5 flex-1">
          {sections.map((sec) => (
            <div key={sec.title}>
              <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                {sec.title}
              </h3>
              <div className="bg-slate-50/70 rounded-2xl border border-slate-200/70 overflow-hidden divide-y divide-slate-100">
                {sec.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleNavigate(item.to)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white active:bg-slate-100 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quick Notification Settings */}
          {onOpenNotificationPreferences && (
            <button
              onClick={() => {
                onClose();
                onOpenNotificationPreferences();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-emerald-800 active:scale-[0.98] transition-transform text-left"
            >
              <div className="flex items-center gap-2.5">
                <BellRing size={16} className="text-emerald-600" />
                <span className="text-xs font-bold">Push & Telegram Alerts</span>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase bg-emerald-100/70 px-2 py-0.5 rounded-full">
                Configure
              </span>
            </button>
          )}

          {/* Sign Out Button */}
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to sign out of MessMate?')) {
                onClose();
                logout();
              }
            }}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-50/80 border border-rose-100 text-rose-600 hover:bg-rose-100 font-bold text-xs active:scale-[0.98] transition-transform"
          >
            <LogOut size={15} />
            <span>Sign Out from Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
