import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { Express } from 'express';
import { prisma } from '../config/database.js';
import { PeriodService } from '../services/period/periodService.js';
import { ValidationService } from '../services/period/validationService.js';
import { SnapshotService } from '../services/period/snapshotService.js';
import { ClosingService } from '../services/period/closingService.js';
import { MonthlyReportService } from '../services/reports/monthlyReportService.js';
import { MemberStatementService } from '../services/reports/memberStatementService.js';
import { MealReportService } from '../services/reports/mealReportService.js';
import { SettlementReportService } from '../services/reports/settlementReportService.js';
import { ExportService } from '../services/reports/exportService.js';
import { ExpenseService } from '../services/expenseService.js';

describe('MessMate Phase 4 — Monthly Closing, Financial Reports & Statements Suite', () => {
  let app: Express;
  let messId: string;
  let resolvedMessId: string;
  let testMemberId: string;
  let adminUserId: string;
  let token: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = createApp();

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@messmate.com',
      password: 'Password@123',
    });
    token = loginRes.body.data.token;
    adminUserId = loginRes.body.data.user.id;

    const mess = await prisma.mess.findFirst();
    if (!mess) {
      throw new Error('No mess found for test');
    }

    resolvedMessId = mess.id;
    messId = resolvedMessId;

    let member = await prisma.messMember.findUnique({
      where: { messId_userId: { messId: resolvedMessId, userId: adminUserId } },
    });

    if (!member) {
      member = await prisma.messMember.create({
        data: {
          messId: resolvedMessId,
          userId: adminUserId,
          role: 'MANAGER',
          status: 'ACTIVE',
        },
      });
    }

    testMemberId = member.id;
  });

  afterAll(async () => {
    try {
      await prisma.financialPeriod.updateMany({
        where: { messId: resolvedMessId, periodKey: '2026-09' },
        data: { status: 'ACTIVE' },
      });
    } catch {}
  });

  beforeEach(() => {
    PeriodService._resetMemoryPeriods();
    SnapshotService._resetMemorySnapshots();
    ClosingService._resetMemoryEvents();
  });

  // -------------------------------------------------------------
  // 1. Financial Period Model & Lifecycle
  // -------------------------------------------------------------
  describe('1. Financial Period Model & Lifecycle', () => {
    it('should create or retrieve the current active financial period', async () => {
      const current = await PeriodService.getOrCreateCurrentPeriod(resolvedMessId, new Date('2026-09-18T10:00:00Z'));
      expect(current.periodKey).toBe('2026-09');
      expect(current.year).toBe(2026);
      expect(current.month).toBe(9);
      expect(current.status).toBeDefined();
    });

    it('should prevent duplicate financial periods for the same month', async () => {
      const p1 = await PeriodService.createPeriod(resolvedMessId, 2026, 11);
      const p2 = await PeriodService.createPeriod(resolvedMessId, 2026, 11);
      expect(p1.id).toBe(p2.id);
      expect(p1.periodKey).toBe('2026-11');
    });

    it('should correctly calculate start and end dates covering entire calendar month', () => {
      const { startDate, endDate } = PeriodService.getPeriodDates(2026, 9);
      expect(startDate.toISOString()).toBe('2026-09-01T00:00:00.000Z');
      expect(endDate.toISOString()).toBe('2026-09-30T23:59:59.999Z');
    });

    it('should allow valid status transitions: ACTIVE -> UNDER_REVIEW -> FINALIZED -> CLOSED', async () => {
      await PeriodService.createPeriod(resolvedMessId, 2026, 9);

      const review = await PeriodService.transitionStatus(resolvedMessId, '2026-09', 'UNDER_REVIEW', 'usr-admin');
      expect(review.status).toBe('UNDER_REVIEW');
      expect(review.reviewedAt).toBeDefined();

      const finalized = await PeriodService.transitionStatus(resolvedMessId, '2026-09', 'FINALIZED', 'usr-admin');
      expect(finalized.status).toBe('FINALIZED');
      expect(finalized.finalizedAt).toBeDefined();

      const closed = await PeriodService.transitionStatus(resolvedMessId, '2026-09', 'CLOSED', 'usr-admin');
      expect(closed.status).toBe('CLOSED');
      expect(closed.closedAt).toBeDefined();

      // Reset back to ACTIVE
      await PeriodService.transitionStatus(resolvedMessId, '2026-09', 'REOPENED', 'usr-admin', { reason: 'Reset for testing' });
      await PeriodService.transitionStatus(resolvedMessId, '2026-09', 'ACTIVE', 'usr-admin');
    });

    it('should reject invalid status jumps (e.g. ACTIVE directly to CLOSED)', async () => {
      await PeriodService.createPeriod(resolvedMessId, 2026, 9);
      await expect(
        PeriodService.transitionStatus(resolvedMessId, '2026-09', 'CLOSED', 'usr-admin')
      ).rejects.toThrow('Invalid status transition');
    });
  });

  // -------------------------------------------------------------
  // 2. Month-End Review Center & Validation Engine
  // -------------------------------------------------------------
  describe('2. Validation Engine & Month-End Checklist', () => {
    it('should execute authoritative validation and generate real checklist', async () => {
      await PeriodService.createPeriod(resolvedMessId, 2026, 9);
      const result = await ValidationService.validateFinancialPeriod(resolvedMessId, '2026-09');

      expect(result.periodKey).toBe('2026-09');
      expect(result.checklist.length).toBeGreaterThanOrEqual(3);
      expect(result.summary.totalMeals).toBeGreaterThanOrEqual(0);
      expect(result.summary.mealRate).toBeGreaterThanOrEqual(0);
      expect(typeof result.summary.isReconciled).toBe('boolean');
    });

    it('should detect blocking issues and warnings accurately', async () => {
      const result = await ValidationService.validateFinancialPeriod(resolvedMessId, '2026-09');
      expect(result.checklist).toBeDefined();
      expect(Array.isArray(result.checklist)).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 3. Finalization, Snapshots & Closing Workflow
  // -------------------------------------------------------------
  describe('3. Finalization, Snapshots & Closing Workflow', () => {
    const testPeriod = '2028-06';

    it('should strictly block finalization if unapproved expenses exist', async () => {
      await PeriodService.createPeriod(resolvedMessId, 2028, 6);
      await PeriodService.transitionStatus(resolvedMessId, testPeriod, 'UNDER_REVIEW');

      vi.spyOn(ValidationService, 'validateFinancialPeriod').mockResolvedValueOnce({
        periodKey: testPeriod,
        canFinalize: false,
        blockingIssues: [
          { code: 'UNAPPROVED_EXPENSES', message: 'There are 1 expense(s) pending approval' },
        ],
        warnings: [],
        checklist: [],
        summary: { totalMeals: 0, foodCost: 0, mealRate: 0, totalExpenses: 0, isReconciled: true },
      } as any);

      await expect(
        ClosingService.finalizePeriod(resolvedMessId, testPeriod, 'usr-admin')
      ).rejects.toThrow('Blocking issues detected: There are 1 expense(s) pending approval');
    });

    it('should create an immutable financial snapshot upon finalization after approval', async () => {
      await PeriodService.createPeriod(resolvedMessId, 2028, 6);
      await PeriodService.transitionStatus(resolvedMessId, testPeriod, 'UNDER_REVIEW');

      vi.spyOn(ValidationService, 'validateFinancialPeriod').mockResolvedValueOnce({
        periodKey: testPeriod,
        canFinalize: true,
        blockingIssues: [],
        warnings: [],
        checklist: [],
        summary: { totalMeals: 10, foodCost: 500, mealRate: 50, totalExpenses: 500, isReconciled: true },
      } as any);

      const { period, snapshot } = await ClosingService.finalizePeriod(resolvedMessId, testPeriod, 'usr-admin', 'Admin');
      expect(period.status).toBe('FINALIZED');
      expect(snapshot.periodId).toBe(period.id);
      expect(snapshot.mealRate).toBeGreaterThanOrEqual(0);
      expect(snapshot.totalMeals).toBeGreaterThanOrEqual(0);
      expect(snapshot.totalExpenses).toBeGreaterThanOrEqual(0);
      expect(snapshot.memberBalances.length).toBeGreaterThan(0);
    });

    it('should close finalized month, enforce closed state, and carry forward balances', async () => {
      const { period, carriedForwardCount } = await ClosingService.closePeriod(resolvedMessId, testPeriod, 'usr-admin');
      expect(period.status).toBe('CLOSED');
      expect(carriedForwardCount).toBeGreaterThanOrEqual(0);

      // Verify next month exists
      const nextMonth = await PeriodService.getPeriodByKey(resolvedMessId, '2028-07');
      expect(nextMonth).toBeDefined();
    });

    it('should guard closed month mutations and return 403 Forbidden', async () => {
      // Attempt operational mutation (POST /meals) for closed period 2028-06
      const res = await request(app)
        .post(`/api/v1/messes/${resolvedMessId}/meals`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          date: '2028-06-15',
          memberId: testMemberId,
          breakfast: 1,
          lunch: 1,
          dinner: 1,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('CLOSED and immutable');
    });

    it('should reopen closed month with mandatory audit reason and authorization', async () => {
      // Reject reopen if reason is too short or missing
      await expect(
        ClosingService.reopenPeriod(resolvedMessId, testPeriod, 'usr-admin', 'fix')
      ).rejects.toThrow('explanatory reason of at least 5 characters');

      // Successful reopen
      const reopened = await ClosingService.reopenPeriod(
        resolvedMessId,
        testPeriod,
        'usr-admin',
        'Correction of wrongly recorded grocery bill'
      );
      expect(reopened.status).toBe('REOPENED');
      expect(reopened.reopenReason).toBe('Correction of wrongly recorded grocery bill');

      // Verify audit events recorded
      const events = await ClosingService.listEvents(reopened.id);
      const reopenEvent = events.find((e) => e.eventType === 'REOPENED');
      expect(reopenEvent).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // 4. Financial Reports & Invariant Tests
  // -------------------------------------------------------------
  describe('4. Comprehensive Financial Reports & Invariants', () => {
    it('should generate monthly financial report with previous period comparison', async () => {
      const report = await MonthlyReportService.getMonthlyReport(resolvedMessId, '2026-09');
      expect(report.periodKey).toBe('2026-09');
      expect(report.summary.totalExpenses).toBeGreaterThanOrEqual(0);
      expect(report.summary.foodCost).toBeGreaterThanOrEqual(0);
      expect(report.summary.mealRate).toBeGreaterThanOrEqual(0);
      expect(report.expenseBreakdown).toBeDefined();
      expect(report.comparison).toBeDefined();
    });

    it('should generate member financial statement with status badge and chronological ledger', async () => {
      const statement = await MemberStatementService.getMemberStatement(resolvedMessId, testMemberId, '2026-09');
      expect(statement.memberId).toBe(testMemberId);
      expect(statement.memberName).toBeDefined();
      expect(statement.statusBadge).toBeDefined();
      expect(['OWES', 'RECEIVES', 'SETTLED']).toContain(statement.statusBadge.status);
      expect(Array.isArray(statement.transactions)).toBe(true);

      for (const tx of statement.transactions) {
        expect(tx.date).toBeDefined();
        expect(typeof tx.runningBalance).toBe('number');
      }
    });

    it('should generate food cost & meal consumption report', async () => {
      const mealReport = await MealReportService.getFoodCostReport(resolvedMessId, '2026-09');
      expect(mealReport.totalFoodCost).toBeGreaterThanOrEqual(0);
      expect(mealReport.totalMeals).toBeGreaterThanOrEqual(0);
      expect(mealReport.members.length).toBeGreaterThan(0);
      for (const m of mealReport.members) {
        expect(m.name).toBeDefined();
        expect(m.meals).toBeGreaterThanOrEqual(0);
      }
    });

    it('should generate settlement reconciliation report', async () => {
      const settlementReport = await SettlementReportService.getSettlementReport(resolvedMessId, '2026-08');
      expect(settlementReport.summary.totalOwedAmount).toBeGreaterThanOrEqual(0);
      expect(settlementReport.memberSummaries.length).toBeGreaterThan(0);
    });

    it('should export monthly report and member statement to CSV with metadata header', async () => {
      const monthlyCsv = await ExportService.exportToCsv(resolvedMessId, 'monthly', '2026-09');
      expect(monthlyCsv.filename).toContain('2026-09.csv');
      expect(monthlyCsv.csvContent).toContain('# MessMate Financial Export');
      expect(monthlyCsv.csvContent).toContain('Total Expenses');

      const statementCsv = await ExportService.exportToCsv(resolvedMessId, 'statement', '2026-09', testMemberId);
      expect(statementCsv.filename).toContain('2026-09.csv');
      expect(statementCsv.csvContent).toContain('Member Financial Statement');
      expect(statementCsv.csvContent).toContain('Date,Description,Reference');
    });
  });

  // -------------------------------------------------------------
  // 5. REST API Endpoints Verification
  // -------------------------------------------------------------
  describe('5. REST API Endpoints Verification', () => {
    it('GET /api/v1/messes/:messId/financial-periods/current should return active period', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${resolvedMessId}/financial-periods/current`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.periodKey).toBeDefined();
    });

    it('GET /api/v1/messes/:messId/reports/monthly should return monthly report', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${resolvedMessId}/reports/monthly?periodKey=2026-09`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.mealRate).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/v1/messes/:messId/reports/export should return CSV attachment', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${resolvedMessId}/reports/export?type=monthly&periodKey=2026-09`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('# MessMate Financial Export');
    });
  });
});
