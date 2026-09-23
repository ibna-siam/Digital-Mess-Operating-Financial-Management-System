import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const { user, activeMess, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
        {
          label: 'Members & Rooms',
          desc: 'Directory, rooms & residents',
          icon: <Users size={18} className="text-blue-600" />,
          iconBg: 'bg-blue-50 border-blue-200/80',
          to: '/members',
          badge: null,
          chip: '10 Residents',
        },
        {
          label: 'Bazar Log',
          desc: 'Daily grocery & market purchases',
          icon: <ShoppingBag size={18} className="text-emerald-600" />,
          iconBg: 'bg-emerald-50 border-emerald-200/80',
          to: '/bazar',
          badge: null,
          chip: 'Food Only',
        },
        {
          label: 'Daily Expenses',
          desc: 'Repairs, cleaning & one-time items',
          icon: <Receipt size={18} className="text-amber-600" />,
          iconBg: 'bg-amber-50 border-amber-200/80',
          to: '/expenses',
          badge: null,
          chip: 'Ad-hoc',
        },
      ],
    },
    {
      title: 'Finances & Closing',
      items: [
        {
          label: 'Bills & Utilities',
          desc: 'House rent, Wi-Fi, electricity & gas',
          icon: <Receipt size={18} className="text-indigo-600" />,
          iconBg: 'bg-indigo-50 border-indigo-200/80',
          to: '/bills-utilities',
          badge: null,
          chip: 'Rent & Meter',
        },
        {
          label: 'Smart Settlement',
          desc: 'P2P debt clearing & balance payout',
          icon: <CheckCircle2 size={18} className="text-teal-600" />,
          iconBg: 'bg-teal-50 border-teal-200/80',
          to: '/settlement',
          badge: null,
          chip: 'Reconciled',
        },
        ...(isManager
          ? [
              {
                label: 'Month-End Closing',
                desc: 'Audit checklists & balance snapshots',
                icon: <Lock size={18} className="text-purple-600" />,
                iconBg: 'bg-purple-50 border-purple-200/80',
                to: '/month-end',
                badge: 'Manager',
                chip: 'Snapshots',
              },
            ]
          : []),
      ],
    },
    {
      title: 'Insights & Audit',
      items: [
        {
          label: 'Financial Reports',
          desc: 'Monthly statements & analytics',
          icon: <BarChart3 size={18} className="text-cyan-600" />,
          iconBg: 'bg-cyan-50 border-cyan-200/80',
          to: '/reports',
          badge: null,
          chip: 'Statements',
        },
        {
          label: 'Documents & Vouchers',
          desc: 'Rent slips, bazaar receipts & bills',
          icon: <FileCheck size={18} className="text-emerald-600" />,
          iconBg: 'bg-emerald-50 border-emerald-200/80',
          to: '/documents',
          badge: null,
          chip: 'Vouchers',
        },
        ...(isManager
          ? [
              {
                label: 'Audit Trail',
                desc: 'System logs & action history',
                icon: <ShieldAlert size={18} className="text-rose-600" />,
                iconBg: 'bg-rose-50 border-rose-200/80',
                to: '/audit-logs',
                badge: null,
                chip: 'Logs',
              },
            ]
          : []),
      ],
    },
    {
      title: 'Preferences',
      items: [
        ...(isManager
          ? [
              {
                label: 'Mess Settings',
                desc: 'Rules, meal rates & currency',
                icon: <Settings size={18} className="text-slate-700" />,
                iconBg: 'bg-slate-100 border-slate-200',
                to: '/settings',
                badge: null,
                chip: 'Rules',
              },
            ]
          : []),
        {
          label: 'Profile & Account',
          desc: 'Security, password & personal info',
          icon: <User size={18} className="text-slate-700" />,
          iconBg: 'bg-slate-100 border-slate-200',
          to: '/profile',
          badge: null,
          chip: 'Security',
        },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full bg-slate-50/95 rounded-t-[32px] shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in slide-in-from-bottom-8 duration-250 ease-out border-t border-white/60"
        style={{
          boxShadow: '0 -25px 60px -15px rgba(15, 23, 42, 0.35)',
          paddingBottom: 'max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tactile Drag Handle */}
        <div className="flex justify-center pt-3 pb-1.5 cursor-grab">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Resident App-Style Profile Card */}
        <div className="mx-4 mt-1 p-3.5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/20 ring-2 ring-emerald-100">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900 truncate tracking-tight">
                  {user?.name || 'Resident'}
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  {roleLabel}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 font-medium">
                <Building2 size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{activeMess?.name || 'Padma Student Residence'}</span>
                {activeMess?.code && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                    {activeMess.code}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90 shrink-0"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Navigation Hub */}
        <div className="overflow-y-auto px-4 py-3 space-y-3.5 flex-1 overscroll-contain">
          {sections.map((sec) => (
            <div key={sec.title}>
              <div className="flex items-center justify-between px-2 mb-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  {sec.title}
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden divide-y divide-slate-100">
                {sec.items.map((item) => {
                  const isActive =
                    location.pathname === item.to ||
                    (item.to !== '/' && location.pathname.startsWith(item.to));

                  return (
                    <button
                      key={item.label}
                      onClick={() => handleNavigate(item.to)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 transition-all active:scale-[0.98] text-left group ${
                        isActive
                          ? 'bg-emerald-50/60 text-emerald-950 font-bold'
                          : 'hover:bg-slate-50 active:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                            item.iconBg
                          } ${isActive ? 'ring-2 ring-emerald-500/20 shadow-xs' : ''}`}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold leading-tight ${
                                isActive ? 'text-emerald-900 font-extrabold' : 'text-slate-900'
                              }`}
                            >
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                {item.badge}
                              </span>
                            )}
                            {isActive && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-600 text-white uppercase tracking-wider">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {item.chip && !isActive && (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-full">
                            {item.chip}
                          </span>
                        )}
                        <ChevronRight
                          size={15}
                          className={`transition-transform shrink-0 ${
                            isActive
                              ? 'text-emerald-600 translate-x-0.5'
                              : 'text-slate-300 group-hover:text-slate-500'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
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
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border border-emerald-200 text-emerald-900 shadow-xs active:scale-[0.98] transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <BellRing size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Push & Telegram Alerts</div>
                  <div className="text-[11px] text-slate-400">Manage real-time notifications</div>
                </div>
              </div>
              <span className="text-[10px] font-black text-emerald-700 uppercase bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
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
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs shadow-xs active:scale-[0.98] transition-all"
          >
            <LogOut size={16} />
            <span>Sign Out from Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
