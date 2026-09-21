import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Users,
  ShoppingBag,
  Receipt,
  FileText,
  Zap,
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
  Building2,
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
  const { activeMess, logout } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const roleLabel = activeMess?.myRole === 'OWNER' ? 'MANAGER' : activeMess?.myRole || 'MEMBER';
  const isManager = roleLabel === 'MANAGER';

  const handleNavigate = (to: string) => {
    onClose();
    navigate(to);
  };

  const sections = [
    {
      title: 'Operations',
      items: [
        { label: 'Members & Rooms', icon: <Users size={18} className="text-blue-500" />, to: '/members', badge: null },
        { label: 'Bazar Log', icon: <ShoppingBag size={18} className="text-emerald-500" />, to: '/bazar', badge: null },
        { label: 'Daily Expenses', icon: <Receipt size={18} className="text-amber-500" />, to: '/expenses', badge: null },
      ],
    },
    {
      title: 'Finances & Closing',
      items: [
        { label: 'Fixed Bills', icon: <FileText size={18} className="text-indigo-500" />, to: '/bills', badge: null },
        { label: 'Utilities & Sub-Meters', icon: <Zap size={18} className="text-yellow-500" />, to: '/utilities', badge: null },
        { label: 'Smart Settlement', icon: <CheckCircle2 size={18} className="text-teal-500" />, to: '/settlements', badge: null },
        ...(isManager
          ? [{ label: 'Month-End Closing', icon: <Lock size={18} className="text-purple-500" />, to: '/month-end', badge: 'Admin' }]
          : []),
      ],
    },
    {
      title: 'Insights & Records',
      items: [
        { label: 'Financial Reports', icon: <BarChart3 size={18} className="text-cyan-500" />, to: '/reports', badge: null },
        { label: 'Documents & Vouchers', icon: <FileCheck size={18} className="text-green-500" />, to: '/documents', badge: null },
        ...(isManager
          ? [{ label: 'Audit Trail', icon: <ShieldAlert size={18} className="text-rose-500" />, to: '/audit-logs', badge: null }]
          : []),
      ],
    },
    {
      title: 'Preferences',
      items: [
        ...(isManager
          ? [{ label: 'Mess Settings', icon: <Settings size={18} className="text-slate-600" />, to: '/settings', badge: null }]
          : []),
        { label: 'Profile & Account', icon: <User size={18} className="text-slate-600" />, to: '/profile', badge: null },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-bottom-6 duration-200"
        style={{
          boxShadow: '0 -15px 40px -10px rgba(0,0,0,0.25)',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Indicator & Header */}
        <div className="pt-3 pb-2 px-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              <Building2 size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {activeMess?.name || 'Mess Management'}
              </h2>
              <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
                {roleLabel} Workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="overflow-y-auto px-4 py-3 space-y-4">
          {sections.map((sec) => (
            <div key={sec.title}>
              <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider px-2 mb-1.5">
                {sec.title}
              </h3>
              <div className="bg-slate-50/80 rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-100/80">
                {sec.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleNavigate(item.to)}
                    className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-white active:bg-slate-100/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 shadow-xs flex items-center justify-center shrink-0">
                        {item.icon}
                      </div>
                      <span className="text-xs font-semibold text-slate-800">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight size={15} className="text-slate-300" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quick Push Notification Settings */}
          {onOpenNotificationPreferences && (
            <div className="bg-slate-50/80 rounded-2xl border border-slate-100 overflow-hidden">
              <button
                onClick={() => {
                  onClose();
                  onOpenNotificationPreferences();
                }}
                className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-white active:bg-slate-100/80 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 shadow-xs flex items-center justify-center shrink-0 text-amber-500">
                    <BellRing size={16} />
                  </div>
                  <span className="text-xs font-semibold text-slate-800">
                    Push Notification Settings
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300" />
              </button>
            </div>
          )}

          {/* User Profile & Sign Out Bar */}
          <div className="pt-2">
            <button
              onClick={() => {
                onClose();
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors border border-rose-100 active:scale-[0.99]"
            >
              <LogOut size={16} />
              Sign Out of Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
