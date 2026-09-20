import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../config/database.js';
import { PushNotificationService } from '../services/pushNotificationService.js';
import { SyncService } from '../services/syncService.js';
import { Express } from 'express';

describe('Phase 11: Production PWA, Web Push & Safe Offline Sync Suite', () => {
  let app: Express;
  let userToken: string;
  let userId: string;
  let testMessId: string;
  let generalUserToken: string;
  let generalUserId: string;
  let generalMemberId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = createApp();
    // 1. Create primary test user & mess
    const email = `pwa_admin_${Date.now()}@example.com`;
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'PWA Admin User',
      email,
      password: 'Password123!',
      phone: '01711000111',
    });

    userToken = res.body.data.token;
    userId = res.body.data.user.id;

    const messRes = await request(app)
      .post('/api/v1/messes')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'PWA Test Mess',
        address: 'Dhaka',
      });

    testMessId = messRes.body.data.id;

    // 2. Create second user for multi-user isolation tests
    const generalEmail = `pwa_member_${Date.now()}@example.com`;
    const genRes = await request(app).post('/api/v1/auth/register').send({
      name: 'PWA General Member',
      email: generalEmail,
      password: 'Password123!',
      phone: '01711000222',
    });

    generalUserToken = genRes.body.data.token;
    generalUserId = genRes.body.data.user.id;

    // Add general user as active member of testMessId
    const mem = await prisma.messMember.create({
      data: {
        messId: testMessId,
        userId: generalUserId,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });
    generalMemberId = mem.id;
  });

  describe('1. Web Push VAPID Key & Subscription Management', () => {
    it('GET /api/v1/notifications/push/vapid-public-key should return valid VAPID public key', async () => {
      const res = await request(app)
        .get('/api/v1/notifications/push/vapid-public-key')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.publicKey).toBeDefined();
      expect(typeof res.body.data.publicKey).toBe('string');
      expect(res.body.data.publicKey.length).toBeGreaterThan(20);
    });

    it('POST /api/v1/notifications/push/subscribe should register device subscription', async () => {
      const fakeEndpoint = `https://fcm.googleapis.com/fcm/send/test-sub-${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/notifications/push/subscribe')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          endpoint: fakeEndpoint,
          keys: {
            p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0PPM6lx0hkWUA',
            auth: 'tBHItDaQLFsChfqW9EhKZQ',
          },
          userAgent: 'Mozilla/5.0 (Linux; Android 14; Mobile)',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.endpoint).toBe(fakeEndpoint);
      expect(res.body.data.userId).toBe(userId);
      expect(res.body.data.isActive).toBe(true);
    });

    it('POST /api/v1/notifications/push/unsubscribe should deactivate subscription', async () => {
      const endpoint = `https://fcm.googleapis.com/fcm/send/unsub-${Date.now()}`;
      // Subscribe first
      await request(app)
        .post('/api/v1/notifications/push/subscribe')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          endpoint,
          keys: { p256dh: 'fake-p256dh', auth: 'fake-auth' },
        });

      // Now unsubscribe
      const res = await request(app)
        .post('/api/v1/notifications/push/unsubscribe')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ endpoint });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbSub = await (prisma as any).pushSubscription.findUnique({
        where: { endpoint },
      });
      expect(dbSub?.isActive).toBe(false);
    });
  });

  describe('2. User Notification Preferences', () => {
    it('GET /api/v1/notifications/preferences should return default enabled categories', async () => {
      const res = await request(app)
        .get('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.financial).toBe(true);
      expect(res.body.data.meals).toBe(true);
      expect(res.body.data.system).toBe(true);
    });

    it('PATCH /api/v1/notifications/preferences should update categories and keep mandatory system alerts', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          meals: false,
          announcements: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.meals).toBe(false);
      expect(res.body.data.announcements).toBe(false);
      expect(res.body.data.system).toBe(true); // Mandatory security & system notifications cannot be disabled
    });
  });

  describe('3. Strict Offline Financial Barrier', () => {
    it('POST /api/v1/sync/actions must strictly block offline financial creation with explanatory error', async () => {
      const financialKey = `fin-offline-attempt-${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/sync/actions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          actions: [
            {
              idempotencyKey: financialKey,
              actionType: 'CREATE_EXPENSE',
              messId: testMessId,
              payload: {
                amount: 500,
                category: 'GROCERY',
                description: 'Offline fake expense',
              },
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.processed).toBe(1);

      const actionResult = res.body.data.results[0];
      expect(actionResult.status).toBe('BLOCKED');
      expect(actionResult.message).toContain('Financial transactions cannot be queued offline');

      // Verify no expense was created in database
      const expenses = await prisma.expense.findMany({
        where: { messId: testMessId, description: 'Offline fake expense' },
      });
      expect(expenses.length).toBe(0);
    });

    it('POST /api/v1/sync/actions must block offline bill and settlement mutations', async () => {
      const res = await request(app)
        .post('/api/v1/sync/actions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          actions: [
            {
              idempotencyKey: `settle-attempt-${Date.now()}`,
              actionType: 'SETTLE_BALANCE',
              messId: testMessId,
              payload: { amount: 1000 },
            },
            {
              idempotencyKey: `bill-pay-attempt-${Date.now()}`,
              actionType: 'RECORD_BILL_PAYMENT',
              messId: testMessId,
              payload: { billId: 'fake-bill-id' },
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.results[0].status).toBe('BLOCKED');
      expect(res.body.data.results[1].status).toBe('BLOCKED');
    });
  });

  describe('4. Permitted Safe Offline Actions & Strict Idempotency Protection', () => {
    it('POST /api/v1/sync/actions should process safe action (NOTIFICATION_READ) and persist result', async () => {
      // 1. Create a notification for the user
      const notif = await prisma.notification.create({
        data: {
          messId: testMessId,
          userId,
          type: 'SYSTEM',
          title: 'Sync Test Notice',
          message: 'Testing offline sync reading',
          category: 'SYSTEM',
          isRead: false,
        },
      });

      const idempotencyKey = `sync-notif-read-${Date.now()}`;

      // 2. Submit safe action in queue
      const res = await request(app)
        .post('/api/v1/sync/actions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          actions: [
            {
              idempotencyKey,
              actionType: 'NOTIFICATION_READ',
              payload: { notificationId: notif.id },
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.results[0].status).toBe('COMPLETED');
      expect(res.body.data.results[0].idempotencyKey).toBe(idempotencyKey);

      // Verify notification is marked read in DB
      const updatedNotif = await prisma.notification.findUnique({
        where: { id: notif.id },
      });
      expect(updatedNotif?.isRead).toBe(true);

      // 3. IDEMPOTENCY REPLAY TEST: re-submitting exact same action with same idempotencyKey
      const replayRes = await request(app)
        .post('/api/v1/sync/actions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          actions: [
            {
              idempotencyKey,
              actionType: 'NOTIFICATION_READ',
              payload: { notificationId: notif.id },
            },
          ],
        });

      expect(replayRes.status).toBe(200);
      expect(replayRes.body.data.results[0].status).toBe('COMPLETED');
      expect(replayRes.body.data.results[0].message).toContain('idempotent');
    });

    it('POST /api/v1/sync/actions should process MEAL_INTENT for member attendance', async () => {
      const idempotencyKey = `meal-intent-test-${Date.now()}`;
      const today = new Date().toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/v1/sync/actions')
        .set('Authorization', `Bearer ${generalUserToken}`)
        .send({
          actions: [
            {
              idempotencyKey,
              actionType: 'MEAL_INTENT',
              messId: testMessId,
              payload: {
                date: today,
                breakfast: 1.0,
                lunch: 2.0,
                dinner: 1.0,
              },
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.results[0].status).toBe('COMPLETED');

      // Verify meal record in database
      const meal = await prisma.meal.findFirst({
        where: {
          messId: testMessId,
          memberId: generalMemberId,
        },
      });
      expect(meal).toBeDefined();
      expect(Number(meal?.lunch)).toBe(2.0);
    });

    it('POST /api/v1/sync/actions should detect CONFLICT when modifying non-existent or foreign item', async () => {
      const idempotencyKey = `conflict-test-${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/sync/actions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          actions: [
            {
              idempotencyKey,
              actionType: 'NOTIFICATION_READ',
              payload: { notificationId: '00000000-0000-0000-0000-000000000000' },
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.results[0].status).toBe('CONFLICT');
      expect(res.body.data.results[0].message).toContain('no longer exists');
    });
  });

  describe('5. Sync Service Status & Health Check', () => {
    it('GET /api/v1/sync/status should return online status and server timestamp', async () => {
      const res = await request(app)
        .get('/api/v1/sync/status')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.online).toBe(true);
      expect(res.body.data.serverTime).toBeDefined();
      expect(res.body.data.userId).toBe(userId);
    });
  });
});
