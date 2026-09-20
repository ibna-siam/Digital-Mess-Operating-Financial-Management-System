import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
} from 'lucide-react';
import { notificationApi } from '../../lib/notificationApi.js';
import { NotificationItem } from '../../types/notification.js';
import { useSocketEvent } from '../../context/SocketContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications.js';

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  return `${diffDay}d ago`;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'FINANCIAL':
      return <CreditCard size={15} style={{ color: 'var(--color-primary, #2563eb)' }} />;
    case 'MEMBERS':
      return <Users size={15} style={{ color: '#059669' }} />;
    case 'UTILITIES':
      return <Zap size={15} style={{ color: '#d97706' }} />;
    case 'MONTH_END':
      return <Calendar size={15} style={{ color: '#7c3aed' }} />;
    case 'ANNOUNCEMENT':
      return <Megaphone size={15} style={{ color: '#dc2626' }} />;
    default:
      return <AlertCircle size={15} style={{ color: 'var(--text-muted, #64748b)' }} />;
  }
}

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { activeMess } = useAuth();
  const { unreadCount, refreshUnreadCount } = useUnreadNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchRecent = async () => {
    setIsLoading(true);
    try {
      const res = await notificationApi.getNotifications({
        messId: activeMess?.id,
        page: 1,
        limit: 5,
      });
      setRecentNotifications(res.items);
    } catch {
      // Quiet fail
    } finally {
      setIsLoading(false);
    }
  };

  // Listen to real-time events via Socket.io to prepend new items
  useSocketEvent('notification.created', (data: any) => {
    if (data?.notification) {
      setRecentNotifications((prev) => [data.notification, ...prev.slice(0, 4)]);
    }
  });

  useSocketEvent('notification.read_all', () => {
    setRecentNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true }))
    );
  });

  // Handle dropdown toggle & close on outside click
  useEffect(() => {
    if (isOpen) {
      fetchRecent();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead(activeMess?.id);
      refreshUnreadCount();
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      try {
        await notificationApi.markAsRead(notif.id);
        refreshUnreadCount();
        setRecentNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      } catch {
        // Continue navigation even if read sync fails
      }
    }

    setIsOpen(false);
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    } else {
      navigate('/notifications');
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        className="header-icon-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} unread)`}
        style={{ position: 'relative', cursor: 'pointer' }}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: '0.68rem',
              fontWeight: 700,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 0 2px white',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '120%',
            width: 360,
            maxWidth: '90vw',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg, 12px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--color-border, #e2e8f0)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main, #0f172a)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: 12,
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary, #2563eb)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #64748b)', fontSize: '0.85rem' }}>
                Loading updates...
              </div>
            ) : recentNotifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Bell size={28} style={{ color: '#cbd5e1', marginBottom: 8 }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main, #0f172a)' }}>
                  All caught up!
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: 2 }}>
                  No recent notifications for your account.
                </div>
              </div>
            ) : (
              recentNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: n.isRead ? '#ffffff' : '#f0f9ff',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = n.isRead ? '#f8fafc' : '#e0f2fe';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = n.isRead ? '#ffffff' : '#f0f9ff';
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {getCategoryIcon(n.category)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: n.isRead ? 500 : 700,
                          color: 'var(--text-main, #0f172a)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {n.title}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94a3b8)', flexShrink: 0 }}>
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted, #64748b)',
                        marginTop: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                      }}
                    >
                      {n.message}
                    </div>
                  </div>

                  {!n.isRead && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#2563eb',
                        flexShrink: 0,
                        marginTop: 8,
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--color-border, #e2e8f0)',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
            }}
          >
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary, #2563eb)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              View all notifications <ExternalLink size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
