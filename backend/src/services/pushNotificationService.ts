import webpush from 'web-push';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
  isActive: boolean;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const db = prisma as any;

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BO9FAIVT9JVaNuR_df9vgDjmqQHj6oxLu9LiBgARyrMqxBKfQ4PNU7G5tPJOm04pHZg8xQFl1k6wtwP2gQFdBBc';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || '8supssxSi44bQhn8vrMVsc1K34vMm32jERKXTqNPL-M';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@messmate.app';

// Configure Web Push VAPID credentials
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  category?: string;
  data?: Record<string, any>;
}

export interface SubscribeInput {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

export interface UpdatePreferencesInput {
  financial?: boolean;
  expenses?: boolean;
  meals?: boolean;
  settlements?: boolean;
  announcements?: boolean;
  system?: boolean;
}

export class PushNotificationService {
  /**
   * Return VAPID public key for frontend subscription registration.
   */
  static getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Save or reactivate a push subscription for a user.
   */
  static async subscribe(input: SubscribeInput): Promise<PushSubscriptionRecord> {
    const existing = await db.pushSubscription.findUnique({
      where: { endpoint: input.endpoint },
    });

    if (existing) {
      return db.pushSubscription.update({
        where: { endpoint: input.endpoint },
        data: {
          userId: input.userId,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent || existing.userAgent,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    }

    return db.pushSubscription.create({
      data: {
        userId: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent || null,
        isActive: true,
      },
    });
  }

  /**
   * Unsubscribe a specific push endpoint.
   */
  static async unsubscribe(userId: string, endpoint: string) {
    const subscription = await db.pushSubscription.findFirst({
      where: { userId, endpoint },
    });

    if (!subscription) {
      return { success: false, message: 'Subscription not found' };
    }

    await db.pushSubscription.update({
      where: { id: subscription.id },
      data: { isActive: false },
    });

    return { success: true };
  }

  /**
   * Retrieve notification preferences for a user, creating defaults if not yet established.
   */
  static async getPreferences(userId: string) {
    let pref = await db.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await db.notificationPreference.create({
        data: {
          userId,
          financial: true,
          expenses: true,
          meals: true,
          settlements: true,
          announcements: true,
          system: true,
        },
      });
    }

    return pref;
  }

  /**
   * Update notification preferences for a user.
   */
  static async updatePreferences(userId: string, input: UpdatePreferencesInput) {
    const current = await this.getPreferences(userId);

    return db.notificationPreference.update({
      where: { id: current.id },
      data: {
        ...(input.financial !== undefined ? { financial: input.financial } : {}),
        ...(input.expenses !== undefined ? { expenses: input.expenses } : {}),
        ...(input.meals !== undefined ? { meals: input.meals } : {}),
        ...(input.settlements !== undefined ? { settlements: input.settlements } : {}),
        ...(input.announcements !== undefined ? { announcements: input.announcements } : {}),
        // System and security notifications remain mandatory
        system: true,
      },
    });
  }

  /**
   * Send a Web Push notification to all active devices of a user respecting their preferences.
   */
  static async sendPushToUser(userId: string, payload: PushPayload) {
    try {
      // 1. Check user preferences
      if (payload.category) {
        const prefs = await this.getPreferences(userId);
        const cat = payload.category.toUpperCase();

        if (cat === 'FINANCIAL' && !prefs.financial) return { sent: 0, reason: 'user_disabled_category' };
        if (cat === 'EXPENSES' && !prefs.expenses) return { sent: 0, reason: 'user_disabled_category' };
        if (cat === 'MEALS' && !prefs.meals) return { sent: 0, reason: 'user_disabled_category' };
        if (cat === 'SETTLEMENTS' && !prefs.settlements) return { sent: 0, reason: 'user_disabled_category' };
        if (cat === 'ANNOUNCEMENT' && !prefs.announcements) return { sent: 0, reason: 'user_disabled_category' };
      }

      // 2. Fetch all active subscriptions
      const subscriptions: PushSubscriptionRecord[] = await db.pushSubscription.findMany({
        where: { userId, isActive: true },
      });

      if (!subscriptions.length) {
        return { sent: 0, total: 0 };
      }

      const formattedPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/icon-192.png',
        badge: payload.badge || '/icons/icon-192.png',
        data: {
          url: payload.url || '/',
          category: payload.category || 'SYSTEM',
          ...(payload.data || {}),
        },
        tag: payload.tag || `messmate-notif-${Date.now()}`,
      });

      let sentCount = 0;
      let failedCount = 0;

      await Promise.all(
        subscriptions.map(async (sub: PushSubscriptionRecord) => {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          try {
            await webpush.sendNotification(pushSubscription, formattedPayload);
            sentCount++;

            // Update last used timestamp asynchronously
            db.pushSubscription
              .update({
                where: { id: sub.id },
                data: { lastUsedAt: new Date() },
              })
              .catch(() => {});
          } catch (error: any) {
            failedCount++;
            // 410 Gone or 404 Not Found indicates expired or revoked subscription
            if (error.statusCode === 410 || error.statusCode === 404) {
              logger.info(
                `[PushNotificationService] Subscription expired (${error.statusCode}). Pruning sub ${sub.id}`
              );
              db.pushSubscription
                .update({
                  where: { id: sub.id },
                  data: { isActive: false },
                })
                .catch(() => {});
            } else {
              logger.warn(
                `[PushNotificationService] Push delivery failed for sub ${sub.id}: ${error.message}`
              );
            }
          }
        })
      );

      return { total: subscriptions.length, sent: sentCount, failed: failedCount };
    } catch (err: any) {
      logger.error(`[PushNotificationService] Error in sendPushToUser: ${err.message}`);
      return { sent: 0, error: err.message };
    }
  }

  /**
   * Broadcast push notification to all active members of a mess.
   */
  static async sendPushToMess(
    messId: string,
    payload: PushPayload,
    excludeUserId?: string
  ) {
    const members = await prisma.messMember.findMany({
      where: {
        messId,
        status: 'ACTIVE',
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { userId: true },
    });

    const results = await Promise.all(
      members.map((m) => this.sendPushToUser(m.userId, payload))
    );

    return results;
  }
}
