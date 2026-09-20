import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { NotificationService } from './notificationService.js';
import { PushNotificationService } from './pushNotificationService.js';
import { Prisma } from '@prisma/client';

export interface SyncActionInput {
  idempotencyKey: string;
  actionType: string;
  messId?: string;
  payload: Record<string, any>;
  clientTimestamp?: string;
}

export interface SyncActionResult {
  idempotencyKey: string;
  actionType: string;
  status: 'COMPLETED' | 'FAILED' | 'CONFLICT' | 'BLOCKED';
  message?: string;
  result?: any;
}

const db = prisma as any;

const PERMITTED_OFFLINE_ACTIONS = new Set([
  'NOTIFICATION_READ',
  'NOTIFICATION_READ_ALL',
  'UPDATE_NOTIFICATION_PREFERENCES',
  'MEAL_INTENT',
]);

const FORBIDDEN_FINANCIAL_ACTIONS = new Set([
  'CREATE_EXPENSE',
  'UPDATE_EXPENSE',
  'DELETE_EXPENSE',
  'RECORD_BILL_PAYMENT',
  'SETTLE_BALANCE',
  'POST_UTILITY_BILL',
  'CLOSE_PERIOD',
  'REOPEN_PERIOD',
  'APPROVE_EXPENSE',
]);

export class SyncService {
  /**
   * Process a batch of safe offline actions queued by the client with strict idempotency.
   */
  static async processActions(userId: string, actions: SyncActionInput[]): Promise<SyncActionResult[]> {
    const results: SyncActionResult[] = [];

    for (const action of actions) {
      const { idempotencyKey, actionType, messId, payload } = action;

      // 1. Idempotency Check: if already processed, return stored result immediately
      const existing = await db.offlineSyncAction.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        logger.info(`[SyncService] Replay suppressed for idempotency key ${idempotencyKey}`);
        results.push({
          idempotencyKey,
          actionType: existing.actionType,
          status: existing.status as any,
          message: 'Already processed (idempotent response)',
          result: existing.response,
        });
        continue;
      }

      // 2. Strict Offline Financial Barrier
      if (FORBIDDEN_FINANCIAL_ACTIONS.has(actionType.toUpperCase())) {
        logger.warn(`[SyncService] Blocked offline financial mutation: ${actionType} by user ${userId}`);
        await db.offlineSyncAction.create({
          data: {
            userId,
            messId: messId || null,
            idempotencyKey,
            actionType,
            payload: payload as Prisma.InputJsonValue,
            status: 'FAILED',
            errorMessage: 'Financial transactions cannot be queued offline to protect ledger integrity',
          },
        });

        results.push({
          idempotencyKey,
          actionType,
          status: 'BLOCKED',
          message: 'Financial transactions cannot be queued offline to protect ledger integrity',
        });
        continue;
      }

      // 3. Permitted Action Check
      if (!PERMITTED_OFFLINE_ACTIONS.has(actionType.toUpperCase())) {
        logger.warn(`[SyncService] Unsupported offline action: ${actionType} by user ${userId}`);
        results.push({
          idempotencyKey,
          actionType,
          status: 'FAILED',
          message: `Action type '${actionType}' is not permitted for offline synchronization`,
        });
        continue;
      }

      // 4. Execute permitted safe action
      try {
        let actionResult: any = null;
        let actionStatus: 'COMPLETED' | 'CONFLICT' = 'COMPLETED';
        let statusMessage = 'Successfully synchronized';

        switch (actionType.toUpperCase()) {
          case 'NOTIFICATION_READ': {
            const { notificationId } = payload;
            if (!notificationId) throw new Error('notificationId is required');

            // Verify notification still exists on server
            const notif = await prisma.notification.findUnique({
              where: { id: notificationId },
            });

            if (!notif) {
              actionStatus = 'CONFLICT';
              statusMessage = 'Notification no longer exists on server';
            } else if (notif.userId !== userId) {
              actionStatus = 'CONFLICT';
              statusMessage = 'Unauthorized: notification belongs to another user';
            } else {
              actionResult = await NotificationService.markAsRead(notificationId, userId);
            }
            break;
          }

          case 'NOTIFICATION_READ_ALL': {
            actionResult = await NotificationService.markAllAsRead(userId, messId);
            break;
          }

          case 'UPDATE_NOTIFICATION_PREFERENCES': {
            actionResult = await PushNotificationService.updatePreferences(userId, payload);
            break;
          }

          case 'MEAL_INTENT': {
            // Safe member self meal attendance recording
            const { date, breakfast, lunch, dinner } = payload;
            if (!messId) throw new Error('messId is required for meal intent');

            const member = await prisma.messMember.findUnique({
              where: { messId_userId: { messId, userId } },
            });

            if (!member || member.status !== 'ACTIVE') {
              actionStatus = 'CONFLICT';
              statusMessage = 'Active membership not found for current mess';
              break;
            }

            const targetDate = new Date(date || new Date());
            targetDate.setUTCHours(0, 0, 0, 0);

            // Upsert meal record safely
            actionResult = await prisma.meal.upsert({
              where: {
                messId_memberId_date: {
                  messId,
                  memberId: member.id,
                  date: targetDate,
                },
              },
              create: {
                messId,
                memberId: member.id,
                date: targetDate,
                breakfast: breakfast !== undefined ? breakfast : 1.0,
                lunch: lunch !== undefined ? lunch : 1.0,
                dinner: dinner !== undefined ? dinner : 1.0,
                notes: 'Recorded via offline sync queue',
              },
              update: {
                breakfast: breakfast !== undefined ? breakfast : undefined,
                lunch: lunch !== undefined ? lunch : undefined,
                dinner: dinner !== undefined ? dinner : undefined,
                notes: 'Updated via offline sync queue',
              },
            });
            break;
          }

          default:
            throw new Error(`Unhandled permitted action: ${actionType}`);
        }

        // 5. Persist audit sync record in DB
        await db.offlineSyncAction.create({
          data: {
            userId,
            messId: messId || null,
            idempotencyKey,
            actionType,
            payload: payload as Prisma.InputJsonValue,
            status: actionStatus,
            response: actionResult ? (actionResult as Prisma.InputJsonValue) : Prisma.JsonNull,
            errorMessage: actionStatus === 'CONFLICT' ? statusMessage : null,
          },
        });

        results.push({
          idempotencyKey,
          actionType,
          status: actionStatus,
          message: statusMessage,
          result: actionResult,
        });
      } catch (err: any) {
        logger.error(`[SyncService] Failed to process action ${idempotencyKey}: ${err.message}`);

        await db.offlineSyncAction.create({
          data: {
            userId,
            messId: messId || null,
            idempotencyKey,
            actionType,
            payload: payload as Prisma.InputJsonValue,
            status: 'FAILED',
            errorMessage: err.message,
          },
        });

        results.push({
          idempotencyKey,
          actionType,
          status: 'FAILED',
          message: err.message,
        });
      }
    }

    return results;
  }
}
