import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { emitToUser, SOCKET_EVENTS } from '../socket/socketEmitter.js';
import { PushNotificationService } from './pushNotificationService.js';
import { Prisma } from '@prisma/client';

export interface CreateNotificationInput {
  messId: string;
  userId: string;
  memberId?: string;
  type: string;
  category?: 'FINANCIAL' | 'MEMBERS' | 'OPERATIONS' | 'UTILITIES' | 'MONTH_END' | 'ANNOUNCEMENT' | 'SYSTEM' | string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface GetNotificationsQuery {
  userId: string;
  messId?: string;
  category?: string;
  isRead?: boolean;
  priority?: string;
  page?: number;
  limit?: number;
}

export class NotificationService {
  /**
   * Create and persist a single notification with duplicate protection.
   * Real-time socket event is emitted ONLY after DB commit.
   */
  static async createNotification(input: CreateNotificationInput) {
    // 1. Deduplication check if idempotencyKey is provided
    if (input.idempotencyKey) {
      const existing = await prisma.notification.findUnique({
        where: {
          messId_userId_idempotencyKey: {
            messId: input.messId,
            userId: input.userId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });

      if (existing) {
        logger.debug(
          `[NotificationService] Duplicate notification suppressed: key=${input.idempotencyKey} user=${input.userId}`
        );
        return existing;
      }
    }

    // 2. Persist to Supabase PostgreSQL database (authoritative source of truth)
    const notification = await prisma.notification.create({
      data: {
        messId: input.messId,
        userId: input.userId,
        memberId: input.memberId || null,
        type: input.type,
        category: input.category || 'SYSTEM',
        priority: input.priority || 'NORMAL',
        title: input.title,
        message: input.message,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        actionUrl: input.actionUrl || null,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        idempotencyKey: input.idempotencyKey || null,
        isRead: false,
      },
    });

    // 3. Emit real-time push to recipient's private user socket room
    emitToUser(input.userId, SOCKET_EVENTS.NOTIFICATION_CREATED, {
      notification: {
        id: notification.id,
        messId: notification.messId,
        type: notification.type,
        category: notification.category,
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        entityType: notification.entityType,
        entityId: notification.entityId,
        actionUrl: notification.actionUrl,
        metadata: notification.metadata,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      },
    });

    // 4. Dispatch Web Push notification to registered device endpoints in background
    PushNotificationService.sendPushToUser(input.userId, {
      title: notification.title,
      body: notification.message,
      category: notification.category,
      url: notification.actionUrl || '/',
      data: {
        notificationId: notification.id,
        messId: notification.messId,
        type: notification.type,
      },
    }).catch((err) => {
      logger.debug(`[NotificationService] Web Push delivery note: ${err.message}`);
    });

    return notification;
  }

  /**
   * Create notifications for multiple recipients in batch (e.g. all members or all managers).
   */
  static async createBulkNotifications(inputs: CreateNotificationInput[]) {
    if (!inputs.length) return [];

    const createdNotifications = [];

    // Persist individually or in transaction to respect duplicate constraints
    for (const item of inputs) {
      try {
        const notif = await this.createNotification(item);
        createdNotifications.push(notif);
      } catch (err: any) {
        logger.error(`[NotificationService] Error creating bulk notification for user ${item.userId}: ${err.message}`);
      }
    }

    return createdNotifications;
  }

  /**
   * Fetch paginated notification history for a user with category & read status filters.
   */
  static async getNotifications(query: GetNotificationsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId: query.userId,
      ...(query.messId ? { messId: query.messId } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread notification counter for badge display.
   */
  static async getUnreadCount(userId: string, messId?: string): Promise<number> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      isRead: false,
      ...(messId ? { messId } : {}),
    };

    return prisma.notification.count({ where });
  }

  /**
   * Mark a single notification as read with strict ownership verification.
   */
  static async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    // IDOR protection: only the recipient can mark their notification as read
    if (notification.userId !== userId) {
      throw new Error('Unauthorized: You do not have permission to modify this notification');
    }

    if (notification.isRead) {
      return notification;
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_READ, {
      id: notificationId,
      readAt: updated.readAt,
    });

    return updated;
  }

  /**
   * Mark all unread notifications as read for a user.
   */
  static async markAllAsRead(userId: string, messId?: string) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      isRead: false,
      ...(messId ? { messId } : {}),
    };

    const updateResult = await prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_READ_ALL, {
      messId: messId || null,
      count: updateResult.count,
    });

    return updateResult;
  }
}
