import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  ShoppingCart,
  Wallet,
  Receipt,
  BookOpen,
  ArrowLeftRight,
  CalendarCheck,
  FileBarChart,
  FileText,
  Bell,
  Settings,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications.js';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  allowed: boolean;
  end?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { activeMess } = useAuth();
  const { unreadCount } = useUnreadNotifications();

  const userRole = activeMess?.myRole || 'MEMBER';
  const isOwner = userRole === 'OWNER';
  const isManagerOrOwner = isOwner || userRole === 'MANAGER';

  // Flat top-level navigation items
  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} />, allowed: true, end: true },
    { label: 'Members', path: '/members', icon: <Users size={18} />, allowed: true },
    { label: 'Meals', path: '/meals', icon: <UtensilsCrossed size={18} />, allowed: true },
    { label: 'Bazar', path: '/bazar', icon: <ShoppingCart size={18} />, allowed: true },
    { label: 'Expenses', path: '/expenses', icon: <Wallet size={18} />, allowed: true },
    { label: 'Bills & Utilities', path: '/bills-utilities', icon: <Receipt size={18} />, allowed: true },
    { label: 'Ledger', path: '/ledger', icon: <BookOpen size={18} />, allowed: true },
    { label: 'Settlement', path: '/settlement', icon: <ArrowLeftRight size={18} />, allowed: true },
    { label: 'Month-End', path: '/month-end', icon: <CalendarCheck size={18} />, allowed: isManagerOrOwner },
    { label: 'Reports', path: '/reports', icon: <FileBarChart size={18} />, allowed: true },
    { label: 'Documents', path: '/documents', icon: <FileText size={18} />, allowed: true },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: <Bell size={18} />,
      badge: unreadCount > 0 ? unreadCount : undefined,
      allowed: true,
    },
    { label: 'Settings', path: '/settings', icon: <Settings size={18} />, allowed: isManagerOrOwner },
    { label: 'Audit Logs', path: '/audit-logs', icon: <ShieldCheck size={18} />, allowed: isManagerOrOwner },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <Building2 size={22} />
        </div>
        <div>
          <h1 className="sidebar-logo-title">MessMate</h1>
          <p className="sidebar-logo-tagline">Share • Manage • Save</p>
        </div>
      </div>

      {/* Flat Top-Level Navigation links */}
      <nav className="sidebar-nav">
        {navItems
          .filter((item) => item.allowed)
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={onCloseMobile}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="nav-item-content">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
              )}
            </NavLink>
          ))}
      </nav>

      {/* Bottom Mess Workspace Pill */}
      <div className="sidebar-footer">
        <div className="mess-pill-card">
          <div className="mess-pill-icon">
            <Building2 size={18} />
          </div>
          <div className="mess-pill-info">
            <div className="mess-pill-name">{activeMess?.name || 'Green View Mess'}</div>
            <div className="mess-pill-location">
              {activeMess?.area ? `${activeMess.area}, ${activeMess.city}` : 'Dhaka, Bangladesh'}
            </div>
            <span className="mess-pill-status">Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
