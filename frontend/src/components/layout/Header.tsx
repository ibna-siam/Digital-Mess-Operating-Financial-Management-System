import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Menu, LogOut, User as UserIcon, BellRing, Building2, Check, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { NotificationBell } from '../notifications/NotificationBell.js';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onOpenNotificationPreferences?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onOpenNotificationPreferences }) => {
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
      {/* Left side: Hamburger for mobile + Search bar */}
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleMobileMenu}
          style={{ display: 'none' }}
          id="mobile-menu-trigger"
          aria-label="Toggle Navigation"
        >
          <Menu size={20} />
        </button>

        <div className="header-search-container">
          <Search size={16} className="header-search-icon" />
          <input
            type="text"
            placeholder="Search members, transactions, bills..."
            className="header-search-input"
          />
        </div>
      </div>

      {/* Right side: Mess Switcher + Notifications + User profile */}
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
    </header>
  );
};
