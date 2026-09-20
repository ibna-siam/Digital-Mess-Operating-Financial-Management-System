import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma, isDatabaseOnline } from '../config/database.js';
import { PeriodService } from '../services/period/periodService.js';
import { AnalyticsService } from '../services/reports/analyticsService.js';
import { ExportService } from '../services/reports/exportService.js';
import jwt from 'jsonwebtoken';

describe('Phase 10: Advanced Reports, Analytics & Financial Intelligence Suite', () => {
  const app = createApp();
  let messAlphaId: string;
  let messBetaId: string;
  let ownerAlphaId: string;
  let memberAlphaId: string;
  let ownerBetaId: string;
  let tokenOwnerAlpha: string;
  let tokenMemberAlpha: string;
  let tokenOwnerBeta: string;
  const periodKey = '2026-09';

  beforeAll(async () => {
    if (await isDatabaseOnline()) {
      // 1. Create Mess Alpha and Owner
      const ownerAlpha = await prisma.user.create({
        data: {
          email: `analytics_owner_alpha_${Date.now()}@test.com`,
          name: 'Alpha Owner',
          passwordHash: 'hashed_pw',
        },
      });
      ownerAlphaId = ownerAlpha.id;

      const messAlpha = await prisma.mess.create({
        data: {
          name: 'Analytics Alpha Mess',
          code: `ALPHAREP_${Date.now()}`,
          createdById: ownerAlphaId,
        },
      });
      messAlphaId = messAlpha.id;

      await prisma.messMember.create({
        data: {
          messId: messAlphaId,
          userId: ownerAlphaId,
          role: 'OWNER',
        },
      });

      // 2. Create Member in Alpha
      const memberAlpha = await prisma.user.create({
        data: {
          email: `analytics_member_alpha_${Date.now()}@test.com`,
          name: 'Alpha Member Siam',
          passwordHash: 'hashed_pw',
        },
      });
      memberAlphaId = memberAlpha.id;

      const memberAlphaRec = await prisma.messMember.create({
        data: {
          messId: messAlphaId,
          userId: memberAlphaId,
          role: 'MEMBER',
          roomNo: 'Room 201',
        },
      });

      // 3. Create Mess Beta and Owner
      const ownerBeta = await prisma.user.create({
        data: {
          email: `analytics_owner_beta_${Date.now()}@test.com`,
          name: 'Beta Owner',
          passwordHash: 'hashed_pw',
        },
      });
      ownerBetaId = ownerBeta.id;

      const messBeta = await prisma.mess.create({
        data: {
          name: 'Analytics Beta Mess',
          code: `BETAREP_${Date.now()}`,
          createdById: ownerBetaId,
        },
      });
      messBetaId = messBeta.id;

      await prisma.messMember.create({
        data: {
          messId: messBetaId,
          userId: ownerBetaId,
          role: 'OWNER',
        },
      });

      // 4. Generate JWT tokens
      const jwtSecret = process.env.JWT_SECRET || 'test_secret';
      tokenOwnerAlpha = jwt.sign({ userId: ownerAlphaId, email: ownerAlpha.email, messId: messAlphaId, role: 'OWNER' }, jwtSecret);
      tokenMemberAlpha = jwt.sign({ userId: memberAlphaId, email: memberAlpha.email, messId: messAlphaId, role: 'MEMBER' }, jwtSecret);
      tokenOwnerBeta = jwt.sign({ userId: ownerBetaId, email: ownerBeta.email, messId: messBetaId, role: 'OWNER' }, jwtSecret);

      // 5. Seed Financial Period & Financial Transactions for Mess Alpha
      await PeriodService.getOrCreateCurrentPeriod(messAlphaId, new Date('2026-09-15'));

      // Seed Expenses
      await prisma.expense.create({
        data: {
          messId: messAlphaId,
          payerMemberId: memberAlphaRec.id,
          amount: 5000.00,
          category: 'BAZAR',
          type: 'VARIABLE',
          date: new Date('2026-09-05'),
          billingPeriod: periodKey,
          description: 'Weekly bulk bazar (Rice, Oil, Meat)',
          status: 'APPROVED',
        },
      });

      await prisma.expense.create({
        data: {
          messId: messAlphaId,
          payerMemberId: memberAlphaRec.id,
          amount: 8000.00,
          category: 'RENT',
          type: 'FIXED',
          date: new Date('2026-09-08'),
          billingPeriod: periodKey,
          description: 'House flat rent advance',
          status: 'APPROVED',
        },
      });

      // Seed Bazar Entry
      await prisma.bazarEntry.create({
        data: {
          messId: messAlphaId,
          buyerMemberId: memberAlphaRec.id,
          amount: 3200.00,
          date: new Date('2026-09-10'),
          description: 'Fresh vegetables and fish',
          itemsSummary: 'Vegetables, Fish',
        },
      });

      // Seed Advance Deposit
      await prisma.advanceDeposit.create({
        data: {
          messId: messAlphaId,
          memberId: memberAlphaRec.id,
          amount: 4000.00,
          paymentMethod: 'BKASH',
          reference: 'TRX9928172',
          billingPeriod: periodKey,
          date: new Date('2026-09-02'),
          status: 'CONFIRMED',
        },
      });

      // Seed Utility Bill
      await prisma.utilityBill.create({
        data: {
          messId: messAlphaId,
          title: 'September Electricity Bill',
          category: 'ELECTRICITY',
          billType: 'METER_BASED',
          amount: 2400.00,
          billingPeriod: periodKey,
          billingDate: new Date('2026-09-05'),
          dueDate: new Date('2026-09-20'),
          status: 'APPROVED',
          isPosted: true,
        },
      });

      // Seed Meals
      await prisma.meal.create({
        data: {
          messId: messAlphaId,
          memberId: memberAlphaRec.id,
          date: new Date('2026-09-10'),
          breakfast: 1.0,
          lunch: 1.0,
          dinner: 1.0,
          guestBreakfast: 0,
          guestLunch: 0,
          guestDinner: 0,
        },
      });
    }
  });

  afterAll(async () => {
    if (await isDatabaseOnline()) {
      try {
        if (messAlphaId) {
          await (prisma as any).document?.deleteMany({ where: { messId: messAlphaId } }).catch(() => {});
          await prisma.meal.deleteMany({ where: { messId: messAlphaId } }).catch(() => {});
          await prisma.bazarEntry.deleteMany({ where: { messId: messAlphaId } }).catch(() => {});
          await prisma.expense.deleteMany({ where: { messId: messAlphaId } }).catch(() => {});
          await prisma.advanceDeposit.deleteMany({ where: { messId: messAlphaId } }).catch(() => {});
          await prisma.utilityBill.deleteMany({ where: { messId: messAlphaId } }).catch(() => {});
          await prisma.financialPeriod.deleteMany({ where: { messId: messAlphaId } }).catch(() => {});
          await prisma.messMember.deleteMany({ where: { messId: messAlphaId } }).catch(() => {});
          await prisma.mess.delete({ where: { id: messAlphaId } }).catch(() => {});
        }
        if (messBetaId) {
          await prisma.financialPeriod.deleteMany({ where: { messId: messBetaId } }).catch(() => {});
          await prisma.messMember.deleteMany({ where: { messId: messBetaId } }).catch(() => {});
          await prisma.mess.delete({ where: { id: messBetaId } }).catch(() => {});
        }
        if (ownerAlphaId) await prisma.user.delete({ where: { id: ownerAlphaId } }).catch(() => {});
        if (memberAlphaId) await prisma.user.delete({ where: { id: memberAlphaId } }).catch(() => {});
        if (ownerBetaId) await prisma.user.delete({ where: { id: ownerBetaId } }).catch(() => {});
      } catch {
        // Cleanup errors ignored
      }
    }
  });

  describe('1. Executive Financial Dashboard & Anomaly Detection', () => {
    it('should calculate executive dashboard metrics and reconcile with underlying expenses', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messAlphaId}/reports/executive?periodKey=${periodKey}`)
        .set('Authorization', `Bearer ${tokenOwnerAlpha}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.periodKey).toBe(periodKey);
      expect(data.summary).toBeDefined();

      // Total expenses should match sum of expenses (5000 + 8000 = 13000)
      expect(data.summary.totalExpenses).toBeGreaterThanOrEqual(13000);
      expect(data.summary.totalMarketCost).toBeGreaterThan(0);
      expect(data.summary.fixedCosts).toBeGreaterThanOrEqual(8000);
      expect(data.summary.currentCashPosition).toBeTypeOf('number');

      // Check anomalies array exists and has factual flags
      expect(Array.isArray(data.anomalies)).toBe(true);
      expect(Array.isArray(data.insights)).toBe(true);
      expect(data.insights.length).toBeGreaterThan(0);
    });
  });

  describe('2. Cash Flow Statement & Reconciliation', () => {
    it('should verify the authoritative cash flow identity: Opening + Inflow - Outflow = Closing', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messAlphaId}/reports/cash-flow?periodKey=${periodKey}`)
        .set('Authorization', `Bearer ${tokenOwnerAlpha}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cashFlow = res.body.data;
      expect(cashFlow.periodKey).toBe(periodKey);
      expect(cashFlow.inflows).toBeDefined();
      expect(cashFlow.outflows).toBeDefined();

      // Inflow includes Advance Deposits (4000) + Bazar (3200) = 7200
      expect(cashFlow.inflows.totalInflow).toBeGreaterThanOrEqual(7200);
      expect(cashFlow.outflows.totalOutflow).toBeGreaterThan(0);

      // Verify mathematical reconciliation
      const computedClosing = cashFlow.openingBalance + cashFlow.inflows.totalInflow - cashFlow.outflows.totalOutflow;
      expect(Math.abs(cashFlow.closingBalance - computedClosing)).toBeLessThan(0.01);
      expect(cashFlow.isReconciled).toBe(true);
    });
  });

  describe('3. Cost Structure & Utility Analytics', () => {
    it('should provide fixed vs variable cost structure breakdown with percentages summing to 100%', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messAlphaId}/reports/cost-structure?periodKey=${periodKey}`)
        .set('Authorization', `Bearer ${tokenOwnerAlpha}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cost = res.body.data;
      expect(cost.totalCost).toBeGreaterThan(0);
      expect(cost.fixedCost.amount).toBeGreaterThanOrEqual(8000);
      expect(cost.variableCost.amount).toBeGreaterThan(0);

      // Percentage check: fixed% + variable% = 100% (within rounding)
      const sumPercentage = cost.fixedCost.percentage + cost.variableCost.percentage;
      expect(Math.abs(sumPercentage - 100)).toBeLessThanOrEqual(0.5);
    });

    it('should aggregate utility expenditure by category', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messAlphaId}/reports/utilities?periodKey=${periodKey}`)
        .set('Authorization', `Bearer ${tokenOwnerAlpha}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const util = res.body.data;
      expect(util.totalUtilityCost).toBeGreaterThanOrEqual(2400);
      expect(util.categories.length).toBeGreaterThan(0);

      const elecCat = util.categories.find((c: any) => c.category === 'ELECTRICITY');
      expect(elecCat).toBeDefined();
      expect(elecCat.totalAmount).toBe(2400);
    });
  });

  describe('4. Daily Financial Trends & Member Comparison', () => {
    it('should aggregate daily meal and market activity rhythms', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messAlphaId}/reports/daily-trends?periodKey=${periodKey}`)
        .set('Authorization', `Bearer ${tokenOwnerAlpha}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(Array.isArray(data.days)).toBe(true);
      expect(data.totalDaysRecorded).toBeGreaterThan(0);

      // Find 2026-09-10 where meals and bazar were recorded
      const day10 = data.days.find((d: any) => d.date === '2026-09-10');
      expect(day10).toBeDefined();
      expect(day10.meals).toBe(3); // breakfast + lunch + dinner
      expect(day10.marketCost).toBe(3200);
    });

    it('should provide objective member comparison matrix without judgmental labels', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messAlphaId}/reports/member-comparison?periodKey=${periodKey}`)
        .set('Authorization', `Bearer ${tokenOwnerAlpha}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.memberCount).toBeGreaterThan(0);
      expect(Array.isArray(data.members)).toBe(true);

      const memberRow = data.members.find((m: any) => m.memberName === 'Alpha Member Siam');
      expect(memberRow).toBeDefined();
      expect(memberRow.mealsConsumed).toBe(3);
      expect(memberRow.totalObligations).toBeGreaterThan(0);
      expect(memberRow.netBalance).toBeTypeOf('number');

      // Verify no competitive/judgmental labels exist in the payload
      const jsonStr = JSON.stringify(data);
      expect(jsonStr).not.toContain('best spender');
      expect(jsonStr).not.toContain('bad payer');
      expect(jsonStr).not.toContain('worst member');
    });
  });

  describe('5. Comprehensive Multi-Format CSV Exports', () => {
    it('should export executive dashboard to CSV', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messAlphaId}/reports/export?type=executive&periodKey=${periodKey}`)
        .set('Authorization', `Bearer ${tokenOwnerAlpha}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('# MessMate Financial Export');
      expect(res.text).toContain('Executive Financial Summary');
      expect(res.text).toContain('Total Expenses');
    });

    it('should export cash flow statement to CSV', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messAlphaId}/reports/export?type=cash-flow&periodKey=${periodKey}`)
        .set('Authorization', `Bearer ${tokenOwnerAlpha}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Cash Flow Statement');
      expect(res.text).toContain('Closing Balance');
    });

    it('should export member comparison to CSV', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messAlphaId}/reports/export?type=member-comparison&periodKey=${periodKey}`)
        .set('Authorization', `Bearer ${tokenOwnerAlpha}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Member Consumption & Cost Comparison');
      expect(res.text).toContain('Alpha Member Siam');
    });
  });

  describe('6. Multi-Tenant Isolation & Security', () => {
    it('should strictly block Mess Beta owner from viewing Mess Alpha reports', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messAlphaId}/reports/executive?periodKey=${periodKey}`)
        .set('Authorization', `Bearer ${tokenOwnerBeta}`);

      expect(res.status).toBe(403);
    });

    it('should block unauthenticated requests to report endpoints', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messAlphaId}/reports/cash-flow?periodKey=${periodKey}`);

      expect(res.status).toBe(401);
    });
  });
});
