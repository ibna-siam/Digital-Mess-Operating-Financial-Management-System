import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { NotificationService } from '../services/notificationService.js';
import { PushNotificationService } from '../services/pushNotificationService.js';
import { sendSuccess } from '../utils/response.js';

export const notificationRouter = Router();

notificationRouter.use(authMiddleware);

const getNotificationsSchema = z.object({
  messId: z.string().uuid().optional(),
  category: z.string().optional(),
  isRead: z.enum(['true', 'false']).optional(),
  priority: z.string().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
});

// GET /api/v1/notifications — Paginated list for authenticated user
notificationRouter.get(
  '/',
  validateRequest({ query: getNotificationsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { messId, category, isRead, priority, page, limit } = req.query as any;

      const result = await NotificationService.getNotifications({
        userId,
        messId,
        category,
        isRead: isRead !== undefined ? isRead === 'true' : undefined,
        priority,
        page,
        limit,
      });

      sendSuccess(
        res,
        {
          items: result.data,
          pagination: result.pagination,
        },
        200,
        'Notifications retrieved successfully'
      );
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/notifications/unread-count — Fast unread badge counter
notificationRouter.get(
  '/unread-count',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const messId = req.query.messId as string | undefined;

      const unreadCount = await NotificationService.getUnreadCount(userId, messId);
      sendSuccess(res, { unreadCount }, 200, 'Unread count retrieved');
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/notifications/:id/read — Mark single notification as read
notificationRouter.patch(
  '/:id/read',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const notificationId = req.params.id;

      const updated = await NotificationService.markAsRead(notificationId, userId);
      sendSuccess(res, updated, 200, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/notifications/read-all — Mark all notifications as read
notificationRouter.post(
  '/read-all',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const messId = req.body.messId as string | undefined;

      const result = await NotificationService.markAllAsRead(userId, messId);
      sendSuccess(res, { markedCount: result.count }, 200, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================
// Web Push Notifications & Preferences (Phase 11)
// =============================================================

// GET /api/v1/notifications/push/vapid-public-key — Public key for browser registration
notificationRouter.get(
  '/push/vapid-public-key',
  (req: Request, res: Response) => {
    const publicKey = PushNotificationService.getVapidPublicKey();
    sendSuccess(res, { publicKey }, 200, 'VAPID public key retrieved');
  }
);

const pushSubscribeSchema = z.object({
  endpoint: z.string().url('A valid push service endpoint URL is required'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'auth key is required'),
  }),
  userAgent: z.string().optional(),
});

// POST /api/v1/notifications/push/subscribe — Register device push subscription
notificationRouter.post(
  '/push/subscribe',
  validateRequest({ body: pushSubscribeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { endpoint, keys, userAgent } = req.body;

      const subscription = await PushNotificationService.subscribe({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
      });

      sendSuccess(res, subscription, 201, 'Push notification subscription registered');
    } catch (err) {
      next(err);
    }
  }
);

const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

// POST /api/v1/notifications/push/unsubscribe — Deactivate push subscription
notificationRouter.post(
  '/push/unsubscribe',
  validateRequest({ body: pushUnsubscribeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { endpoint } = req.body;

      const result = await PushNotificationService.unsubscribe(userId, endpoint);
      sendSuccess(res, result, 200, 'Push subscription revoked');
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/notifications/preferences — Get user's notification preferences
notificationRouter.get(
  '/preferences',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const preferences = await PushNotificationService.getPreferences(userId);
      sendSuccess(res, preferences, 200, 'Notification preferences retrieved');
    } catch (err) {
      next(err);
    }
  }
);

const updatePreferencesSchema = z.object({
  financial: z.boolean().optional(),
  expenses: z.boolean().optional(),
  meals: z.boolean().optional(),
  settlements: z.boolean().optional(),
  announcements: z.boolean().optional(),
});

// PATCH /api/v1/notifications/preferences — Update notification preferences
notificationRouter.patch(
  '/preferences',
  validateRequest({ body: updatePreferencesSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const updated = await PushNotificationService.updatePreferences(userId, req.body);
      sendSuccess(res, updated, 200, 'Notification preferences updated');
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/notifications/push/test — Send test push notification to user's registered devices
notificationRouter.post(
  '/push/test',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await PushNotificationService.sendPushToUser(userId, {
        title: 'MessMate Notification Test',
        body: 'Web Push notifications are functioning correctly on this device!',
        url: '/',
        category: 'SYSTEM',
      });

      sendSuccess(res, result, 200, 'Test push notification dispatched');
    } catch (err) {
      next(err);
    }
  }
);
