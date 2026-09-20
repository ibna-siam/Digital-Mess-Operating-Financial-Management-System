import { apiClient } from './apiClient.js';
import { NotificationItem, NotificationsResponse, AnnouncementItem } from '../types/notification.js';

export interface GetNotificationsParams {
  messId?: string;
  category?: string;
  isRead?: boolean;
  priority?: string;
  page?: number;
  limit?: number;
}

export const notificationApi = {
  getNotifications: async (params: GetNotificationsParams = {}): Promise<NotificationsResponse> => {
    const searchParams = new URLSearchParams();
    if (params.messId) searchParams.append('messId', params.messId);
    if (params.category && params.category !== 'ALL') searchParams.append('category', params.category);
    if (params.isRead !== undefined) searchParams.append('isRead', String(params.isRead));
    if (params.priority) searchParams.append('priority', params.priority);
    if (params.page) searchParams.append('page', String(params.page));
    if (params.limit) searchParams.append('limit', String(params.limit));

    const qs = searchParams.toString();
    return apiClient<NotificationsResponse>(`/notifications${qs ? `?${qs}` : ''}`);
  },

  getUnreadCount: async (messId?: string): Promise<{ unreadCount: number }> => {
    const qs = messId ? `?messId=${messId}` : '';
    return apiClient<{ unreadCount: number }>(`/notifications/unread-count${qs}`);
  },

  markAsRead: async (notificationId: string): Promise<NotificationItem> => {
    return apiClient<NotificationItem>(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  markAllAsRead: async (messId?: string): Promise<{ markedCount: number }> => {
    return apiClient<{ markedCount: number }>('/notifications/read-all', {
      method: 'POST',
      body: JSON.stringify({ messId }),
    });
  },

  getAnnouncements: async (messId: string): Promise<AnnouncementItem[]> => {
    return apiClient<AnnouncementItem[]>(`/messes/${messId}/announcements`);
  },

  createAnnouncement: async (
    messId: string,
    data: {
      title: string;
      message: string;
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
      audience?: 'ALL_MEMBERS' | 'ADMINS' | 'TREASURERS';
      expiresAt?: string | null;
    }
  ): Promise<AnnouncementItem> => {
    return apiClient<AnnouncementItem>(`/messes/${messId}/announcements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteAnnouncement: async (messId: string, id: string): Promise<void> => {
    return apiClient<void>(`/messes/${messId}/announcements/${id}`, {
      method: 'DELETE',
    });
  },
};
