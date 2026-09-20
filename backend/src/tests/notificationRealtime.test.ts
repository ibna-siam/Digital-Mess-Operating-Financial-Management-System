import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, isDatabaseOnline } from '../config/database.js';
import { NotificationService } from '../services/notificationService.js';
import { AnnouncementService } from '../services/announcementService.js';
import { PaymentService } from '../services/financial/paymentService.js';
import { LeaveRequestService } from '../services/leaveRequestService.js';
import { Role, MemberStatus } from '@prisma/client';

describe('Phase 8: Communication, Notification & Real-Time System Suite', () => {
  let mess1Id: string;
  let mess2Id: string;
  let userAId: string; // Mess 1 Owner/Admin
  let userBId: string; // Mess 1 Member
  let userCId: string; // Mess 2 Foreign Member
  let memberAId: string;
  let memberBId: string;
  let memberCId: string;
  let settlementItemId: string;

  beforeAll(async () => {
    if (await isDatabaseOnline()) {
      const unique = `P8_${Date.now()}`;

      // Create Users
      const uA = await prisma.user.create({
        data: {
          email: `p8_admin_${unique}@test.com`,
          passwordHash: 'test_hash',
          name: 'Siam Phase8 Admin',
          isActive: true,
        },
      });
      userAId = uA.id;

      const uB = await prisma.user.create({
        data: {
          email: `p8_memB_${unique}@test.com`,
          passwordHash: 'test_hash',
          name: 'Babar Phase8 Member',
          isActive: true,
        },
      });
      userBId = uB.id;

      const uC = await prisma.user.create({
        data: {
          email: `p8_memC_${unique}@test.com`,
          passwordHash: 'test_hash',
          name: 'Chowdhury Foreign Mess',
          isActive: true,
        },
      });
      userCId = uC.id;

      // Create Mess 1
      const m1 = await prisma.mess.create({
        data: {
          name: `Phase8 Mess Alpha ${unique}`,
          code: `M1-${unique}`,
          currency: 'BDT',
          currencySymbol: '৳',
          status: 'ACTIVE',
          createdById: userAId,
        },
      });
      mess1Id = m1.id;

      // Create Mess 2
      const m2 = await prisma.mess.create({
        data: {
          name: `Phase8 Mess Beta ${unique}`,
          code: `M2-${unique}`,
          currency: 'BDT',
          currencySymbol: '৳',
          status: 'ACTIVE',
          createdById: userCId,
        },
      });
      mess2Id = m2.id;

      // Create Members
      const memA = await prisma.messMember.create({
        data: {
          messId: mess1Id,
          userId: userAId,
          role: Role.OWNER,
          status: MemberStatus.ACTIVE,
        },
      });
      memberAId = memA.id;

      const memB = await prisma.messMember.create({
        data: {
          messId: mess1Id,
          userId: userBId,
          role: Role.MEMBER,
          status: MemberStatus.ACTIVE,
        },
      });
      memberBId = memB.id;

      const memC = await prisma.messMember.create({
        data: {
          messId: mess2Id,
          userId: userCId,
          role: Role.OWNER,
          status: MemberStatus.ACTIVE,
        },
      });
      memberCId = memC.id;

      // Create a settlement plan and item for payment testing
      const plan = await prisma.settlementPlan.create({
        data: {
          messId: mess1Id,
          billingPeriod: '2026-09',
          totalDebtPool: 2000,
          status: 'ACTIVE',
        },
      });

      const item = await prisma.settlementItem.create({
        data: {
          planId: plan.id,
          payerMemberId: memberBId,
          receiverMemberId: memberAId,
          amount: 1500,
          settledAmount: 0,
          status: 'PENDING',
        },
      });
      settlementItemId = item.id;
    }
  });

  afterAll(async () => {
    if (await isDatabaseOnline()) {
      try {
        if (mess1Id) {
          await prisma.notification.deleteMany({ where: { messId: mess1Id } });
          await prisma.announcement.deleteMany({ where: { messId: mess1Id } });
          await prisma.settlementPayment.deleteMany({ where: { settlementItem: { plan: { messId: mess1Id } } } });
          await prisma.settlementItem.deleteMany({ where: { plan: { messId: mess1Id } } });
          await prisma.settlementPlan.deleteMany({ where: { messId: mess1Id } });
          await prisma.leaveRequest.deleteMany({ where: { messId: mess1Id } });
          await prisma.memberHistory.deleteMany({ where: { messId: mess1Id } });
          await prisma.ledgerEntry.deleteMany({ where: { messId: mess1Id } });
          await prisma.messMember.deleteMany({ where: { messId: mess1Id } });
          await prisma.mess.delete({ where: { id: mess1Id } });
        }
        if (mess2Id) {
          await prisma.notification.deleteMany({ where: { messId: mess2Id } });
          await prisma.announcement.deleteMany({ where: { messId: mess2Id } });
          await prisma.messMember.deleteMany({ where: { messId: mess2Id } });
          await prisma.mess.delete({ where: { id: mess2Id } });
        }
        if (userAId) await prisma.user.delete({ where: { id: userAId } });
        if (userBId) await prisma.user.delete({ where: { id: userBId } });
        if (userCId) await prisma.user.delete({ where: { id: userCId } });
      } catch (err: any) {
        console.warn('Phase 8 cleanup notice:', err.message);
      }
    }
  });

  describe('1. Notification Persistence, Unread Counters & Deduplication', () => {
    it('should create persistent notifications in Supabase PostgreSQL', async () => {
      const notif1 = await NotificationService.createNotification({
        messId: mess1Id,
        userId: userBId,
        memberId: memberBId,
        type: 'BALANCE_DUE',
        category: 'FINANCIAL',
        priority: 'HIGH',
        title: 'Monthly Balance Due',
        message: 'Your outstanding balance of ৳1,500 is due for September.',
        idempotencyKey: 'test_due_01',
      });

      expect(notif1.id).toBeDefined();
      expect(notif1.isRead).toBe(false);
      expect(notif1.title).toBe('Monthly Balance Due');
      expect(notif1.category).toBe('FINANCIAL');

      // Verify in Supabase
      const fromDb = await prisma.notification.findUnique({
        where: { id: notif1.id },
      });
      expect(fromDb).not.toBeNull();
      expect(fromDb?.userId).toBe(userBId);
      expect(fromDb?.messId).toBe(mess1Id);
    });

    it('should prevent duplicate notifications with same idempotencyKey', async () => {
      const initial = await NotificationService.createNotification({
        messId: mess1Id,
        userId: userBId,
        type: 'SYSTEM_ALERT',
        title: 'Water Maintenance',
        message: 'Water will be unavailable from 2pm to 4pm.',
        idempotencyKey: 'idemp_water_maintenance_unique',
      });

      // Repeat with same key
      const duplicate = await NotificationService.createNotification({
        messId: mess1Id,
        userId: userBId,
        type: 'SYSTEM_ALERT',
        title: 'Water Maintenance',
        message: 'Water will be unavailable from 2pm to 4pm.',
        idempotencyKey: 'idemp_water_maintenance_unique',
      });

      expect(duplicate.id).toBe(initial.id);

      // Verify only 1 notification exists with this key
      const count = await prisma.notification.count({
        where: {
          messId: mess1Id,
          userId: userBId,
          idempotencyKey: 'idemp_water_maintenance_unique',
        },
      });
      expect(count).toBe(1);
    });

    it('should accurately compute unread counters across notifications', async () => {
      // Create a 3rd notification for User B
      await NotificationService.createNotification({
        messId: mess1Id,
        userId: userBId,
        type: 'UTILITY_POSTED',
        category: 'UTILITIES',
        title: 'Electricity Bill Split',
        message: 'Electricity bill of ৳450 has been allocated to your account.',
        idempotencyKey: 'test_util_01',
      });

      const unreadCount = await NotificationService.getUnreadCount(userBId, mess1Id);
      expect(unreadCount).toBe(3);
    });

    it('should support mark as read and update unread count', async () => {
      const userBNotifs = await NotificationService.getNotifications({
        userId: userBId,
        messId: mess1Id,
        isRead: false,
      });

      expect(userBNotifs.data.length).toBeGreaterThanOrEqual(1);
      const target = userBNotifs.data[0];

      // Mark single notification read
      const updated = await NotificationService.markAsRead(target.id, userBId);
      expect(updated.isRead).toBe(true);
      expect(updated.readAt).toBeInstanceOf(Date);

      // Unread count should drop by 1
      const countAfter = await NotificationService.getUnreadCount(userBId, mess1Id);
      expect(countAfter).toBe(2);
    });

    it('should support mark all as read and reset unread count to 0', async () => {
      await NotificationService.markAllAsRead(userBId, mess1Id);

      const countAfterAll = await NotificationService.getUnreadCount(userBId, mess1Id);
      expect(countAfterAll).toBe(0);
    });
  });

  describe('2. Multi-Tenant Isolation & Privacy Protection', () => {
    it('should strictly isolate notifications between Mess Alpha and Mess Beta', async () => {
      // Create notification in Mess 2 for User C
      await NotificationService.createNotification({
        messId: mess2Id,
        userId: userCId,
        type: 'MEMBER_JOINED',
        category: 'MEMBERS',
        title: 'New Member Joined Mess Beta',
        message: 'Welcome new member to Mess Beta.',
        idempotencyKey: 'test_m2_01',
      });

      // User B in Mess 1 queries notifications
      const userBList = await NotificationService.getNotifications({
        userId: userBId,
        messId: mess1Id,
      });

      // Ensure zero notifications from Mess 2 leak to User B
      const leaked = userBList.data.some((n) => n.messId === mess2Id);
      expect(leaked).toBe(false);

      // User C queries Mess 2
      const userCList = await NotificationService.getNotifications({
        userId: userCId,
        messId: mess2Id,
      });
      expect(userCList.data.length).toBe(1);
      expect(userCList.data[0].messId).toBe(mess2Id);
    });

    it('should prevent User A from marking User C notification as read (IDOR Protection)', async () => {
      const userCNotifs = await NotificationService.getNotifications({
        userId: userCId,
        messId: mess2Id,
      });
      const foreignId = userCNotifs.data[0].id;

      // User A attempts to mark User C's notification as read
      await expect(NotificationService.markAsRead(foreignId, userAId)).rejects.toThrow(
        'Unauthorized: You do not have permission to modify this notification'
      );
    });
  });

  describe('3. Server-Side Pagination & Filtering', () => {
    it('should support server-side pagination with total and page count', async () => {
      // Create 5 additional notifications for User A
      for (let i = 1; i <= 5; i++) {
        await NotificationService.createNotification({
          messId: mess1Id,
          userId: userAId,
          type: 'EXPENSE_SUBMITTED',
          category: 'OPERATIONS',
          title: `Expense Submitted #${i}`,
          message: `Expense of ৳${i * 100} submitted.`,
          idempotencyKey: `test_exp_batch_${i}`,
        });
      }

      const paged = await NotificationService.getNotifications({
        userId: userAId,
        messId: mess1Id,
        page: 1,
        limit: 2,
      });

      expect(paged.data.length).toBe(2);
      expect(paged.pagination.page).toBe(1);
      expect(paged.pagination.limit).toBe(2);
      expect(paged.pagination.total).toBe(5);
      expect(paged.pagination.totalPages).toBe(3);
    });

    it('should filter notifications by category', async () => {
      const opsOnly = await NotificationService.getNotifications({
        userId: userAId,
        messId: mess1Id,
        category: 'OPERATIONS',
      });

      expect(opsOnly.data.length).toBe(5);
      expect(opsOnly.data.every((n) => n.category === 'OPERATIONS')).toBe(true);
    });
  });

  describe('4. Mess Announcements Workflow', () => {
    it('should create an announcement and generate in-app notifications for all members', async () => {
      const announcement = await AnnouncementService.createAnnouncement(mess1Id, memberAId, {
        title: 'Monthly General Meeting',
        message: 'All members please assemble in the dining hall at 9:00 PM tonight.',
        priority: 'HIGH',
        audience: 'ALL_MEMBERS',
      });

      expect(announcement.id).toBeDefined();
      expect(announcement.title).toBe('Monthly General Meeting');
      expect(announcement.audience).toBe('ALL_MEMBERS');

      // Verify in-app notifications were created for User B
      const userBNotifs = await NotificationService.getNotifications({
        userId: userBId,
        messId: mess1Id,
        category: 'ANNOUNCEMENT',
      });

      expect(userBNotifs.data.length).toBeGreaterThanOrEqual(1);
      const meetingNotif = userBNotifs.data.find((n) => n.entityId === announcement.id);
      expect(meetingNotif).toBeDefined();
      expect(meetingNotif?.title).toContain('Notice: Monthly General Meeting');
    });

    it('should filter announcements by audience for roles', async () => {
      // Create admin-only announcement
      const adminOnly = await AnnouncementService.createAnnouncement(mess1Id, memberAId, {
        title: 'Admin Budget Review',
        message: 'Quarterly financial audit meeting for managers.',
        priority: 'NORMAL',
        audience: 'ADMINS',
      });

      // Role OWNER/MANAGER sees both
      const adminView = await AnnouncementService.getAnnouncements(mess1Id, Role.OWNER);
      expect(adminView.some((a) => a.id === adminOnly.id)).toBe(true);

      // Role MEMBER does NOT see admin-only announcement
      const memberView = await AnnouncementService.getAnnouncements(mess1Id, Role.MEMBER);
      expect(memberView.some((a) => a.id === adminOnly.id)).toBe(false);
    });
  });

  describe('5. Business Action Integrations', () => {
    it('should trigger notification on settlement payment confirmation', async () => {
      const payment = await PaymentService.recordPayment({
        messId: mess1Id,
        settlementItemId,
        payerMemberId: memberBId,
        amount: 500,
        paymentMethod: 'BKASH',
        reference: 'BK-123456',
        idempotencyKey: `p8_pay_test_${Date.now()}`,
      });

      expect(payment.id).toBeDefined();

      // Check receiver (User A) received notification
      const receiverNotifs = await NotificationService.getNotifications({
        userId: userAId,
        messId: mess1Id,
        category: 'FINANCIAL',
      });

      const payNotif = receiverNotifs.data.find((n) => n.entityId === payment.id);
      expect(payNotif).toBeDefined();
      expect(payNotif?.title).toBe('Settlement Payment Received');
      expect(payNotif?.message).toContain('৳500');
    });

    it('should trigger notification on leave request submission', async () => {
      const leave = await LeaveRequestService.createLeaveRequest(mess1Id, memberBId, {
        startDate: '2026-10-01',
        endDate: '2026-10-15',
        type: 'TEMPORARY',
        reason: 'Family visit during vacation',
      });

      expect(leave.id).toBeDefined();

      // Admin (User A) should receive notification about leave request
      const adminNotifs = await NotificationService.getNotifications({
        userId: userAId,
        messId: mess1Id,
        category: 'MEMBERS',
      });

      const leaveNotif = adminNotifs.data.find((n) => n.entityId === leave.id);
      expect(leaveNotif).toBeDefined();
      expect(leaveNotif?.title).toBe('Leave Request Submitted');
      expect(leaveNotif?.message).toContain('temporary');
    });
  });
});
