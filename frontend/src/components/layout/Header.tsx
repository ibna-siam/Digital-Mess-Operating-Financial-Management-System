import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, LogOut, User as UserIcon, BellRing, Building2, Check, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { NotificationBell } from '../notifications/NotificationBell.js';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  onOpenNotificationPreferences?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNotificationPreferences }) => {
  const { user, activeMess, userMesses, switchMess, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMessDropdown, setShowMessDropdown] = useState(false);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'SA';

  return (
    <header className="top-header">
      {/* =========================================================================
          MOBILE TOP APP BAR (Max width 768px)
          Native mobile app header: Workspace selector (left), Notifs + Avatar (right)
         ========================================================================= */}
      <div className="mobile-app-bar md:hidden w-full flex items-center justify-between">
        {/* Workspace / Mess Selector with Role */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowMessDropdown(!showMessDropdown);
              setShowDropdown(false);
            }}
            className="flex items-center gap-2 py-1.5 px-2.5 bg-slate-50/90 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xs active:scale-[0.97] transition-all"
            aria-label="Switch Mess Workspace"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 size={14} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 max-w-[130px] truncate leading-tight">
                {activeMess?.name || 'Select Mess'}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider leading-none">
                  {activeMess?.myRole === 'OWNER' ? 'MANAGER' : activeMess?.myRole || 'MEMBER'}
                </span>
              </div>
            </div>
            <ChevronDown size={14} className="text-slate-400 ml-0.5" />
          </button>

          {showMessDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMessDropdown(false)} />
              <div
                className="absolute left-0 top-full mt-2 bg-white border border-slate-200/90 rounded-2xl shadow-2xl w-68 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <span>My Workspaces ({userMesses.length})</span>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {userMesses.map((m) => {
                    const isActive = activeMess?.id === m.id;
                    const role = m.myRole === 'OWNER' ? 'MANAGER' : m.myRole || 'MEMBER';
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          switchMess(m.id);
                          setShowMessDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left active:bg-slate-100 transition-colors ${
                          isActive ? 'bg-emerald-50/70 font-bold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className={`text-xs truncate ${isActive ? 'text-emerald-800 font-bold' : 'text-slate-800'}`}>
                            {m.name}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase font-medium mt-0.5">
                            {role}
                          </div>
                        </div>
                        {isActive && <Check size={15} className="text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right side: Notification Bell + Profile Avatar */}
        <div className="flex items-center gap-2">
          <NotificationBell />

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowMessDropdown(false);
              }}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 text-white font-extrabold text-xs flex items-center justify-center shadow-xs ring-2 ring-emerald-500/20 active:scale-95 transition-all"
              aria-label="User Profile"
            >
              {initials}
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200/90 rounded-2xl shadow-2xl w-52 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900 truncate">{user?.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                </div>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <UserIcon size={14} /> Profile Settings
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onOpenNotificationPreferences?.();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <BellRing size={14} className="text-emerald-600" /> Notifications
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border-t border-slate-100 mt-1"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>
          )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          DESKTOP TOP BAR (Min width 768px)
          Full SaaS Header with Search, Switcher & User Profile
         ========================================================================= */}
      <div className="desktop-app-bar hidden md:flex w-full items-center justify-between">
        <div className="header-left">
          <div className="header-search-container">
            <Search size={16} className="header-search-icon" />
            <input
              type="text"
              placeholder="Search members, transactions, bills..."
              className="header-search-input"
            />
          </div>
        </div>

        <div className="header-right">
          {/* Mess Workspace Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowMessDropdown(!showMessDropdown);
                setShowDropdown(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              aria-label="Switch Mess Workspace"
            >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={15} />
            </div>
            <div style={{ textAlign: 'left', marginRight: 4 }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  maxWidth: 130,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {activeMess?.name || 'Select Mess'}
              </div>
              <div
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 600,
                  color: activeMess?.myRole === 'MANAGER' || activeMess?.myRole === 'OWNER' ? '#059669' : '#2563eb',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {activeMess?.myRole === 'OWNER' ? 'MANAGER' : activeMess?.myRole || 'MEMBER'}
              </div>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-subtle)' }} />
          </button>

          {showMessDropdown && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '115%',
                background: 'white',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg, 12px)',
                boxShadow: 'var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.1))',
                width: 270,
                padding: '8px 0',
                zIndex: 60,
              }}
            >
              <div
                style={{
                  padding: '6px 14px 8px 14px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Workspaces ({userMesses.length})
                </span>
              </div>

              <div style={{ maxHeight: 220, overflowY: 'auto', padding: '4px 0' }}>
                {userMesses.map((m) => {
                  const isActive = activeMess?.id === m.id;
                  const role = m.myRole === 'OWNER' ? 'MANAGER' : m.myRole || 'MEMBER';
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        switchMess(m.id);
                        setShowMessDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '8px 14px',
                        background: isActive ? '#f0fdf4' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: isActive ? '#dcfce7' : '#f1f5f9',
                            color: isActive ? '#059669' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Building2 size={14} />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div
                            style={{
                              fontSize: '0.82rem',
                              fontWeight: isActive ? 700 : 500,
                              color: 'var(--text-main)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {m.name}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {m.city ? `${m.area ? m.area + ', ' : ''}${m.city}` : 'Workspace'} • <span style={{ fontWeight: 600, color: role === 'MANAGER' ? '#059669' : '#2563eb' }}>{role}</span>
                          </div>
                        </div>
                      </div>
                      {isActive && <Check size={16} color="#059669" style={{ flexShrink: 0, marginLeft: 8 }} />}
                    </button>
                  );
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 4, marginTop: 4 }}>
                <button
                  onClick={() => {
                    setShowMessDropdown(false);
                    navigate('/onboarding');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 14px',
                    background: 'none',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--color-primary, #10b981)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Plus size={15} /> Create or Join Mess
                </button>
              </div>
            </div>
          )}
        </div>

        <NotificationBell />

        <div style={{ position: 'relative' }}>
          <button
            className="user-profile-btn"
            onClick={() => {
              setShowDropdown(!showDropdown);
              setShowMessDropdown(false);
            }}
            aria-label="User Profile"
          >
            <div className="user-avatar">{initials}</div>
            <div className="user-info-text">
              <div className="user-name">{user?.name || 'Siam Ahmed'}</div>
              <div className="user-role-badge">{activeMess?.myRole === 'OWNER' ? 'MANAGER' : activeMess?.myRole || 'MEMBER'}</div>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-subtle)' }} />
          </button>

          {showDropdown && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '110%',
                background: 'white',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                width: 200,
                padding: '6px 0',
                zIndex: 50,
              }}
            >
              <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{user?.name || 'Siam Ahmed'}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.email || 'admin@messmate.com'}</div>
              </div>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onOpenNotificationPreferences?.();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 14px',
                  background: 'none',
                  border: 'none',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <BellRing size={14} style={{ color: 'var(--color-primary)' }} /> Push & Preferences
              </button>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  navigate('/profile');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 14px',
                  background: 'none',
                  border: 'none',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <UserIcon size={14} /> Profile Settings
              </button>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  logout();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 14px',
                  background: 'none',
                  border: 'none',
                  fontSize: '0.8rem',
                  color: 'var(--color-danger)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </header>
);
};
