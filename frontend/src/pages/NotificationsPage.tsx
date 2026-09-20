import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CreditCard,
  Users,
  Zap,
  Calendar,
  Megaphone,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Search,
} from 'lucide-react';
import { notificationApi } from '../lib/notificationApi.js';
import { NotificationItem, NotificationCategory } from '../types/notification.js';
import { useSocketEvent } from '../context/SocketContext.js';
import { useAuth } from '../context/AuthContext.js';

const CATEGORIES: { label: string; value: string; icon: any }[] = [
  { label: 'All', value: 'ALL', icon: Bell },
  { label: 'Financial', value: 'FINANCIAL', icon: CreditCard },
  { label: 'Members', value: 'MEMBERS', icon: Users },
  { label: 'Operations', value: 'OPERATIONS', icon: AlertCircle },
  { label: 'Utilities', value: 'UTILITIES', icon: Zap },
  { label: 'Month-End', value: 'MONTH_END', icon: Calendar },
  { label: 'Announcements', value: 'ANNOUNCEMENT', icon: Megaphone },
];

function getCategoryBadge(category: NotificationCategory) {
  switch (category) {
    case 'FINANCIAL':
      return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    case 'MEMBERS':
      return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    case 'UTILITIES':
      return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
    case 'MONTH_END':
      return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' };
    case 'ANNOUNCEMENT':
      return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
    default:
      return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'URGENT':
      return { label: 'URGENT', bg: '#fee2e2', color: '#dc2626' };
    case 'HIGH':
      return { label: 'HIGH', bg: '#ffedd5', color: '#c2410c' };
    case 'LOW':
      return { label: 'LOW', bg: '#f1f5f9', color: '#64748b' };
    default:
      return null;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeMess } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const isReadParam =
        readFilter === 'unread' ? false : readFilter === 'read' ? true : undefined;

      const res = await notificationApi.getNotifications({
        messId: activeMess?.id,
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        isRead: isReadParam,
        page,
        limit,
      });

      setNotifications(res.items);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalCount(res.pagination.total || 0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [activeMess?.id, selectedCategory, readFilter, page]);

  // Real-time socket updates
  useSocketEvent('notification.created', () => {
    fetchNotifications();
  });

  useSocketEvent('notification.read', (data: any) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === data.id ? { ...n, isRead: true, readAt: data.readAt } : n))
    );
  });

  useSocketEvent('notification.read_all', () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  });

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead(activeMess?.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const handleItemClick = (notif: NotificationItem) => {
    if (!notif.isRead) {
      notificationApi.markAsRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    }
  };

  const filteredItems = notifications.filter(
    (n) =>
      !searchTerm ||
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 16px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.6rem',
              fontWeight: 700,
              color: 'var(--text-main, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Bell size={26} style={{ color: 'var(--color-primary, #2563eb)' }} />
            Notification Center
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', marginTop: 4 }}>
            Stay updated with financial settlements, member movements, utilities, and mess bulletins.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleMarkAllRead}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.82rem',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md, 8px)',
              cursor: 'pointer',
            }}
          >
            <CheckCheck size={16} /> Mark All as Read
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          border: '1px solid var(--color-border, #e2e8f0)',
          marginBottom: 20,
        }}
      >
        {/* Category Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 12,
            borderBottom: '1px solid #f1f5f9',
            marginBottom: 12,
          }}
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => {
                  setSelectedCategory(cat.value);
                  setPage(1);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 600 : 500,
                  border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#1d4ed8' : '#475569',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Read / Unread Status + Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {(['all', 'unread', 'read'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setReadFilter(mode);
                  setPage(1);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: readFilter === mode ? 600 : 500,
                  border: 'none',
                  backgroundColor: readFilter === mode ? '#0f172a' : '#f1f5f9',
                  color: readFilter === mode ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div style={{ position: 'relative', minWidth: 240 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                fontSize: '0.8rem',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Notification List */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg, 12px)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          border: '1px solid var(--color-border, #e2e8f0)',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '60px 16px', textAlign: 'center', color: '#64748b' }}>
            <div className="spinner" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: '0.88rem' }}>Loading notifications...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '64px 16px', textAlign: 'center' }}>
            <Sparkles size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>No notifications found</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
              {searchTerm
                ? 'No notifications match your search query.'
                : readFilter === 'unread'
                ? 'You have no unread notifications.'
                : 'There are no notifications in this category.'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const badge = getCategoryBadge(item.category);
            const priorityBadge = getPriorityBadge(item.priority);

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: item.isRead ? '#ffffff' : '#f8faff',
                  borderLeft: item.isRead ? '3px solid transparent' : '3px solid #2563eb',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  cursor: item.actionUrl ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = item.isRead ? '#f8fafc' : '#f0f7ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = item.isRead ? '#ffffff' : '#f8faff';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1 }}>
                  {/* Category icon container */}
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: badge.bg,
                      border: `1px solid ${badge.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {item.category === 'FINANCIAL' ? (
                      <CreditCard size={18} style={{ color: badge.color }} />
                    ) : item.category === 'MEMBERS' ? (
                      <Users size={18} style={{ color: badge.color }} />
                    ) : item.category === 'UTILITIES' ? (
                      <Zap size={18} style={{ color: badge.color }} />
                    ) : item.category === 'MONTH_END' ? (
                      <Calendar size={18} style={{ color: badge.color }} />
                    ) : item.category === 'ANNOUNCEMENT' ? (
                      <Megaphone size={18} style={{ color: badge.color }} />
                    ) : (
                      <AlertCircle size={18} style={{ color: badge.color }} />
                    )}
                  </div>

                  {/* Notification Content */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.92rem',
                          fontWeight: item.isRead ? 600 : 700,
                          color: '#0f172a',
                        }}
                      >
                        {item.title}
                      </span>

                      {/* Category tag */}
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          padding: '1px 7px',
                          borderRadius: 10,
                        }}
                      >
                        {item.category}
                      </span>

                      {/* Priority tag */}
                      {priorityBadge && (
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            backgroundColor: priorityBadge.bg,
                            color: priorityBadge.color,
                            padding: '1px 6px',
                            borderRadius: 10,
                          }}
                        >
                          {priorityBadge.label}
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        fontSize: '0.84rem',
                        color: '#475569',
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {item.message}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginTop: 8,
                        fontSize: '0.74rem',
                        color: '#94a3b8',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {formatDate(item.createdAt)}
                      </span>
                      {item.isRead && item.readAt && (
                        <span>Read on {formatDate(item.readAt)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {!item.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                      title="Mark as read"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Check size={13} /> Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Server-side Pagination Footer */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Showing Page {page} of {totalPages} ({totalCount} notifications)
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: page <= 1 ? '#f1f5f9' : '#ffffff',
                  color: page <= 1 ? '#94a3b8' : '#334155',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                <ChevronLeft size={15} /> Previous
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: page >= totalPages ? '#f1f5f9' : '#ffffff',
                  color: page >= totalPages ? '#94a3b8' : '#334155',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
