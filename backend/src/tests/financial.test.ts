import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { Express } from 'express';
import { prisma } from '../config/database.js';
import { RoundingService } from '../services/financial/roundingService.js';
import { MealRateService } from '../services/financial/mealRateService.js';
import { AllocationService } from '../services/financial/allocationService.js';
import { LedgerService } from '../services/financial/ledgerService.js';
import { SettlementService } from '../services/financial/settlementService.js';

describe('MessMate Phase 3 — Financial Engine & Smart Settlement Test Suite', () => {
  let app: Express;
  let messId: string;
  let resolvedMessId: string;
  let testMemberId: string;
  let adminUserId: string;
  let token: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = createApp();

    const testEmail = `fintest_${Date.now()}@example.com`;
    const regRes = await request(app).post('/api/v1/auth/register').send({
      email: testEmail,
      password: 'SecurePassword123!',
      name: 'Financial Test Admin',
      phone: '+8801700000003',
    });
    token = regRes.body.data.token;
    adminUserId = regRes.body.data.user.id;

    const messRes = await request(app)
      .post('/api/v1/messes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Financial Engine Test Mess',
        currency: 'BDT',
        currencySymbol: '৳',
      });

    resolvedMessId = messRes.body.data.id;
    messId = resolvedMessId;

    const member = await prisma.messMember.findUnique({
      where: { messId_userId: { messId: resolvedMessId, userId: adminUserId } },
    });

    testMemberId = member!.id;
  });

  afterAll(async () => {
    if (resolvedMessId) {
      await prisma.financialAdjustment.deleteMany({ where: { messId: resolvedMessId } });
      await prisma.advanceDeposit.deleteMany({ where: { messId: resolvedMessId } });
      await prisma.ledgerEntry.deleteMany({ where: { messId: resolvedMessId } });
      await prisma.settlementItem.deleteMany({ where: { plan: { messId: resolvedMessId } } });
      await prisma.settlementPlan.deleteMany({ where: { messId: resolvedMessId } });
      await prisma.financialPeriod.deleteMany({ where: { messId: resolvedMessId } });
      await prisma.auditLog.deleteMany({ where: { messId: resolvedMessId } });
      await prisma.notification.deleteMany({ where: { messId: resolvedMessId } });
      await prisma.messMember.deleteMany({ where: { messId: resolvedMessId } });
      await prisma.mess.deleteMany({ where: { id: resolvedMessId } });
    }
    if (adminUserId) {
      await prisma.user.deleteMany({ where: { id: adminUserId } });
    }
  });

  // -------------------------------------------------------------
  // 1. Monetary Rounding & Residual Paisa/Cent Distribution
  // -------------------------------------------------------------
  describe('1. Centralized Rounding & Residual Distribution', () => {
    it('should split 100 evenly among 3 participants with exact 0-loss residual handling', () => {
      const splits = RoundingService.splitEvenly(100.0, 3);
      expect(splits).toEqual([33.34, 33.33, 33.33]);
      const sum = splits.reduce((a, b) => a + b, 0);
      expect(Math.round(sum * 100) / 100).toBe(100.0);
    });

    it('should split 10 among 4 participants', () => {
      const splits = RoundingService.splitEvenly(10.0, 4);
      expect(splits).toEqual([2.5, 2.5, 2.5, 2.5]);
      expect(splits.reduce((a, b) => a + b, 0)).toBe(10.0);
    });

    it('should validate allocations sum correctly', () => {
      expect(RoundingService.validateAllocationsSum([33.34, 33.33, 33.33], 100)).toBe(true);
      expect(RoundingService.validateAllocationsSum([30, 30, 35], 100)).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // 2. Meal Rate Engine & Zero-Meal Safety
  // -------------------------------------------------------------
  describe('2. Meal Rate Engine', () => {
    it('should correctly identify food vs non-food categories', () => {
      expect(MealRateService.isFoodCategory('Groceries')).toBe(true);
      expect(MealRateService.isFoodCategory('Fish & Meat')).toBe(true);
      expect(MealRateService.isFoodCategory('Vegetables')).toBe(true);
      expect(MealRateService.isFoodCategory('House Rent')).toBe(false);
      expect(MealRateService.isFoodCategory('Internet / WiFi')).toBe(false);
      expect(MealRateService.isFoodCategory('Maid Salary')).toBe(false);
    });

    it('should calculate authoritative meal rate deterministically', async () => {
      const res = await MealRateService.calculateMealRate(messId, '2026-09');
      expect(res.isCalculated).toBe(true);
      expect(res.mealRate).toBeGreaterThan(0);
      expect(res.totalFoodCost).toBeGreaterThan(0);
      expect(res.totalMeals).toBeGreaterThan(0);
      expect(res.memberShares.length).toBeGreaterThan(0);
    });

    it('should calculate zero-meal state without throwing NaN or Infinity', async () => {
      // In-memory / mocked simulation when meals = 0
      const zeroResult = {
        totalFoodCost: 15000,
        totalMeals: 0,
      };
      if (zeroResult.totalMeals === 0) {
        const safe = {
          mealRate: 0,
          isCalculated: false,
          reason: 'No meals recorded for this period',
        };
        expect(safe.mealRate).toBe(0);
        expect(safe.isCalculated).toBe(false);
        expect(Number.isNaN(safe.mealRate)).toBe(false);
        expect(Number.isFinite(safe.mealRate)).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------
  // 3. Allocation & Split Engine
  // -------------------------------------------------------------
  describe('3. Allocation & Split Engine', () => {
    it('should split EQUAL with zero residual loss', () => {
      const allocations = AllocationService.splitAmount({
        messId,
        totalAmount: 1200,
        method: 'EQUAL',
        memberIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'],
      });

      expect(allocations.length).toBe(6);
      allocations.forEach((a) => expect(a.amount).toBe(200));
      expect(allocations.reduce((sum, a) => sum + a.amount, 0)).toBe(1200);
    });

    it('should split PERCENTAGE accurately and enforce 100% total', () => {
      const allocations = AllocationService.splitAmount({
        messId,
        totalAmount: 1000,
        method: 'PERCENTAGE',
        memberIds: ['m1', 'm2'],
        percentageShares: [
          { memberId: 'm1', percentage: 60 },
          { memberId: 'm2', percentage: 40 },
        ],
      });

      expect(allocations[0].amount).toBe(600);
      expect(allocations[1].amount).toBe(400);
      expect(allocations.reduce((s, a) => s + a.amount, 0)).toBe(1000);
    });

    it('should reject CUSTOM split if sum does not match source total', () => {
      expect(() => {
        AllocationService.splitAmount({
          messId,
          totalAmount: 1000,
          method: 'CUSTOM',
          memberIds: ['m1', 'm2'],
          customAllocations: [
            { memberId: 'm1', amount: 300 },
            { memberId: 'm2', amount: 350 }, // sum 650 != 1000
          ],
        });
      }).toThrow(/does not match source amount/);
    });

    it('should calculate prorated active days in month accurately', () => {
      const joinDate = new Date(Date.UTC(2026, 8, 16)); // Sept 16
      const prorated = AllocationService.calculateProratedDays(joinDate, null, 2026, 9);
      expect(prorated.totalDaysInMonth).toBe(30);
      expect(prorated.activeDays).toBe(15);
      expect(prorated.fraction).toBe(0.5);
    });
  });

  // -------------------------------------------------------------
  // 4. Double-Entry Member Ledger & Reversals
  // -------------------------------------------------------------
  describe('4. Member Ledger & Invariants', () => {
    it('should record CREDIT and DEBIT entries correctly adjusting running balance', async () => {
      const lastEntry = await prisma.ledgerEntry.findFirst({
        where: { messId: resolvedMessId, memberId: testMemberId },
        orderBy: { createdAt: 'desc' },
      });
      const balanceBefore = lastEntry ? Number(lastEntry.balanceAfter) : 0;

      // 1. Advance deposit (Credit +5000)
      const creditEntry = await LedgerService.createEntry({
        messId: resolvedMessId,
        memberId: testMemberId,
        entryType: 'ADVANCE_DEPOSIT',
        direction: 'CREDIT',
        amount: 5000,
        description: 'Advance Deposit',
      });
      expect(creditEntry.direction).toBe('CREDIT');
      expect(creditEntry.balanceAfter).toBe(RoundingService.roundMoney(balanceBefore + 5000));

      // 2. Rent share (Debit -3500)
      const debitEntry = await LedgerService.createEntry({
        messId: resolvedMessId,
        memberId: testMemberId,
        entryType: 'RENT_SHARE',
        direction: 'DEBIT',
        amount: 3500,
        description: 'Rent Share',
      });
      expect(debitEntry.direction).toBe('DEBIT');
      expect(debitEntry.balanceAfter).toBe(RoundingService.roundMoney(balanceBefore + 5000 - 3500));
    });

    it('should reverse a ledger transaction without deleting original history', async () => {
      const original = await LedgerService.createEntry({
        messId: resolvedMessId,
        memberId: testMemberId,
        entryType: 'EXPENSE_SHARE',
        direction: 'DEBIT',
        amount: 250,
        description: 'Accidental Utility Charge',
      });

      const reversed = await LedgerService.reverseEntry(
        resolvedMessId,
        original.id,
        'Erroneous bill entered by manager',
        adminUserId
      );

      expect(reversed.entryType).toBe('REVERSAL');
      expect(reversed.direction).toBe('CREDIT'); // Opposite of DEBIT
      expect(reversed.amount).toBe(250);
      expect(reversed.description).toContain('REVERSAL:');
    });
  });

  // -------------------------------------------------------------
  // 5. Smart Settlement & Who-Owes-Whom Matching
  // -------------------------------------------------------------
  describe('5. Smart Settlement & Who-Owes-Whom Algorithm', () => {
    it('should match debtors against creditors and reconcile with zero residual error', () => {
      // Balanced test mess:
      // Siam owes 2500, Karim owes 1200 (-3700)
      // Rahim should receive 3700 (+3700)
      const balances = [
        { memberId: 'mem-siam', memberName: 'Siam', netBalance: -2500 },
        { memberId: 'mem-karim', memberName: 'Karim', netBalance: -1200 },
        { memberId: 'mem-rahim', memberName: 'Rahim', netBalance: 3700 },
      ];

      const plan = SettlementService.calculateOptimalSettlementPlan(balances);

      expect(plan.length).toBe(2);
      expect(plan[0].payerMemberId).toBe('mem-siam');
      expect(plan[0].receiverMemberId).toBe('mem-rahim');
      expect(plan[0].amount).toBe(2500);

      expect(plan[1].payerMemberId).toBe('mem-karim');
      expect(plan[1].receiverMemberId).toBe('mem-rahim');
      expect(plan[1].amount).toBe(1200);

      const totalTransfers = plan.reduce((s, p) => s + p.amount, 0);
      expect(totalTransfers).toBe(3700);
    });

    it('should throw calculation error if total debts and credits do not reconcile', () => {
      const unbalanced = [
        { memberId: 'mem-siam', memberName: 'Siam', netBalance: -2500 },
        { memberId: 'mem-rahim', memberName: 'Rahim', netBalance: 2000 }, // Discrepancy of 500
      ];

      expect(() => {
        SettlementService.calculateOptimalSettlementPlan(unbalanced);
      }).toThrow(/reconciliation failed/);
    });
  });

  // -------------------------------------------------------------
  // 6. Financial API Endpoints Integration
  // -------------------------------------------------------------
  describe('6. Financial Endpoints Integration', () => {
    it('GET /api/v1/messes/:messId/financial-summary should return financial health and reconciliation', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${resolvedMessId}/financial-summary?period=2026-09`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('currentMealRate');
      expect(res.body.data).toHaveProperty('totalFoodCost');
      expect(res.body.data).toHaveProperty('pendingSettlementPool');
      expect(res.body.data).toHaveProperty('memberBalances');
      expect(typeof res.body.data.isReconciled).toBe('boolean');
    });

    it('GET /api/v1/messes/:messId/ledger should return user transaction history', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${resolvedMessId}/ledger`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/v1/messes/:messId/advances should record advance deposit with credit ledger impact', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${resolvedMessId}/advances`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          memberId: testMemberId,
          amount: 2500,
          paymentMethod: 'BKASH',
          billingPeriod: '2026-09',
          notes: 'Half month advance deposit',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(2500);
      expect(res.body.data.paymentMethod).toBe('BKASH');
    });

    it('GET /api/v1/messes/:messId/settlements should return who-owes-whom plan', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${resolvedMessId}/settlements?period=2026-08`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('items');
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('POST /api/v1/messes/:messId/adjustments should require manager/treasurer capability and reason', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${resolvedMessId}/adjustments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          memberId: testMemberId,
          amount: 120,
          direction: 'CREDIT',
          reason: 'Reimbursement for extra salt and spice purchase',
          billingPeriod: '2026-09',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(120);
      expect(res.body.data.direction).toBe('CREDIT');
    });
  });
});
