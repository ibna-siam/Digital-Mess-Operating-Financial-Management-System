export type NotificationCategory =
  | 'FINANCIAL'
  | 'MEMBERS'
  | 'OPERATIONS'
  | 'UTILITIES'
  | 'MONTH_END'
  | 'ANNOUNCEMENT'
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface NotificationItem {
  id: string;
  messId: string;
  userId: string;
  memberId?: string | null;
  type: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, any> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementItem {
  id: string;
  messId: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  audience: 'ALL_MEMBERS' | 'ADMINS' | 'TREASURERS';
  createdById: string;
  createdBy?: {
    user: {
      name: string;
      avatarUrl?: string | null;
    };
  };
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  items: NotificationItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
