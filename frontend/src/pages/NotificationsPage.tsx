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
  CheckCircle2,
} from 'lucide-react';
import { notificationApi } from '../lib/notificationApi.js';
import { NotificationItem, NotificationCategory } from '../types/notification.js';
import { useSocketEvent } from '../context/SocketContext.js';
import { useAuth } from '../context/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';

const CATEGORIES: { label: string; value: string; icon: React.FC<{ className?: string }> }[] = [
  { label: 'All', value: 'ALL', icon: Bell },
  { label: 'Financial', value: 'FINANCIAL', icon: CreditCard },
  { label: 'Members', value: 'MEMBERS', icon: Users },
  { label: 'Operations', value: 'OPERATIONS', icon: AlertCircle },
  { label: 'Utilities', value: 'UTILITIES', icon: Zap },
  { label: 'Month-End', value: 'MONTH_END', icon: Calendar },
  { label: 'Bulletins', value: 'ANNOUNCEMENT', icon: Megaphone },
];

function getCategoryIconConfig(category: NotificationCategory) {
  switch (category) {
    case 'FINANCIAL':
      return {
        Icon: CreditCard,
        bg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        badgeVariant: 'success' as const,
      };
    case 'MEMBERS':
      return {
        Icon: Users,
        bg: 'bg-blue-50 text-blue-600 border-blue-200',
        badgeVariant: 'primary' as const,
      };
    case 'UTILITIES':
      return {
        Icon: Zap,
        bg: 'bg-amber-50 text-amber-600 border-amber-200',
        badgeVariant: 'warning' as const,
      };
    case 'MONTH_END':
      return {
        Icon: Calendar,
        bg: 'bg-purple-50 text-purple-600 border-purple-200',
        badgeVariant: 'neutral' as const,
      };
    case 'ANNOUNCEMENT':
      return {
        Icon: Megaphone,
        bg: 'bg-rose-50 text-rose-600 border-rose-200',
        badgeVariant: 'danger' as const,
      };
    default:
      return {
        Icon: AlertCircle,
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        badgeVariant: 'neutral' as const,
      };
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredItems = notifications.filter(
    (n) =>
      !searchTerm ||
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notification Center</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-200">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time activity feed for financial transactions, member movements, utility deadlines, and mess bulletins.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            <span>Mark All as Read</span>
          </Button>
        </div>
      </div>

      {/* Categories & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 scrollbar-none">
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
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Read / Unread Status + Quick Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            {(['all', 'unread', 'read'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setReadFilter(mode);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                  readFilter === mode
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden divide-y divide-slate-100">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-medium">Loading notifications...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center px-4 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">No notifications found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm
                ? 'No notifications match your search query.'
                : readFilter === 'unread'
                ? 'You are all caught up! No unread notifications.'
                : 'There are no notifications in this category.'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const { Icon, bg, badgeVariant } = getCategoryIconConfig(item.category);

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                  item.isRead ? 'bg-white hover:bg-slate-50/70' : 'bg-emerald-50/30 hover:bg-emerald-50/50'
                } ${item.actionUrl ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Category icon squircle */}
                  <div
                    className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 ${bg}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Notification Content */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 animate-pulse" />
                      )}
                      <span
                        className={`text-sm tracking-tight truncate ${
                          item.isRead ? 'font-semibold text-slate-900' : 'font-extrabold text-slate-900'
                        }`}
                      >
                        {item.title}
                      </span>

                      <Badge variant={badgeVariant} className="text-[10px] py-0 px-2">
                        {item.category}
                      </Badge>

                      {item.priority === 'URGENT' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                          URGENT
                        </span>
                      )}
                      {item.priority === 'HIGH' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">
                          HIGH
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {item.message}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium pt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" /> {formatDate(item.createdAt)}
                      </span>
                      {item.isRead && item.readAt && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Read
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mark as read button */}
                <div className="flex items-center gap-2 shrink-0">
                  {!item.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                      title="Mark as read"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">Mark read</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Server-side Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total alerts)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 text-xs font-bold py-1.5 px-3 rounded-xl"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>

              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 text-xs font-bold py-1.5 px-3 rounded-xl"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
