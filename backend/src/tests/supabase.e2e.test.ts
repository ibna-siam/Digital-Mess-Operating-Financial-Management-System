import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, isDatabaseOnline } from '../config/database.js';
import { Role, MessStatus, MemberStatus, PeriodStatus, ExpenseType, ExpenseStatus, SplitMethod } from '@prisma/client';

describe('MessMate Phase 5 — Supabase PostgreSQL Live Database E2E Suite', () => {
  let isLive = false;
  let testMessId: string;
  let adminUserId: string;
  let memberUserId: string;
  let adminMemberId: string;
  let normalMemberId: string;
  let periodId: string;

  const testUnique = `TEST_${Date.now()}`;

  beforeAll(async () => {
    isLive = await isDatabaseOnline();
    if (!isLive) {
      console.warn('⚠️ Supabase database is offline during test run; skipping live queries');
    }
  });

  afterAll(async () => {
    if (isLive && testMessId) {
      // Clean up test mess and all cascaded child records
      try {
        await prisma.mess.delete({ where: { id: testMessId } });
        if (adminUserId) await prisma.user.delete({ where: { id: adminUserId } });
        if (memberUserId) await prisma.user.delete({ where: { id: memberUserId } });
      } catch (err) {
        console.warn('Cleanup warning:', err);
      }
    }
    await prisma.$disconnect();
  });

  it('1. should verify Supabase PostgreSQL connection and messmate schema', async () => {
    expect(isLive).toBe(true);
    const dbInfo = await prisma.$queryRaw<Array<{ current_schema: string }>>`SELECT current_schema() as current_schema;`;
    expect(['public', 'messmate']).toContain(dbInfo[0].current_schema);
  });

  it('2. should persist User and Mess records in Supabase PostgreSQL', async () => {
    // 1. Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: `admin_${testUnique}@test.com`,
        passwordHash: '$2a$10$FakeHashForTestOnly12345678901234567890',
        name: 'Supabase Admin Tester',
        isActive: true,
      },
    });
    adminUserId = adminUser.id;
    expect(adminUser.id).toBeDefined();

    // 2. Create normal user
    const normalUser = await prisma.user.create({
      data: {
        email: `member_${testUnique}@test.com`,
        passwordHash: '$2a$10$FakeHashForTestOnly12345678901234567890',
        name: 'Supabase Member Tester',
        isActive: true,
      },
    });
    memberUserId = normalUser.id;

    // 3. Create Mess
    const mess = await prisma.mess.create({
      data: {
        name: `Supabase Test Mess ${testUnique}`,
        code: `MESS-${testUnique}`,
        currency: 'BDT',
        currencySymbol: '৳',
        status: MessStatus.ACTIVE,
        createdById: adminUser.id,
      },
    });
    testMessId = mess.id;
    expect(mess.code).toBe(`MESS-${testUnique}`);

    // 4. Create Members
    const adminMember = await prisma.messMember.create({
      data: {
        messId: mess.id,
        userId: adminUser.id,
        role: Role.OWNER,
        roomNo: 'A-101',
        status: MemberStatus.ACTIVE,
      },
    });
    adminMemberId = adminMember.id;

    const normalMember = await prisma.messMember.create({
      data: {
        messId: mess.id,
        userId: normalUser.id,
        role: Role.MEMBER,
        roomNo: 'A-102',
        status: MemberStatus.ACTIVE,
      },
    });
    normalMemberId = normalMember.id;

    expect(adminMemberId).toBeDefined();
    expect(normalMemberId).toBeDefined();
  });

  it('3. should create and persist FinancialPeriod in Supabase', async () => {
    const period = await prisma.financialPeriod.create({
      data: {
        messId: testMessId,
        year: 2026,
        month: 9,
        periodKey: '2026-09',
        startDate: new Date('2026-09-01T00:00:00Z'),
        endDate: new Date('2026-09-30T23:59:59Z'),
        status: PeriodStatus.ACTIVE,
        openedById: adminUserId,
      },
    });
    periodId = period.id;
    expect(period.status).toBe(PeriodStatus.ACTIVE);
    expect(period.periodKey).toBe('2026-09');
  });

  it('4. should persist Meals, Expenses, and LedgerEntries with exact Decimals', async () => {
    // Record meal entries for both members
    const mealAdmin = await prisma.meal.create({
      data: {
        messId: testMessId,
        memberId: adminMemberId,
        date: new Date('2026-09-02T12:00:00Z'),
        breakfast: 1.0,
        lunch: 1.0,
        dinner: 1.0,
      },
    });
    expect(Number(mealAdmin.lunch)).toBe(1.0);

    const mealMember = await prisma.meal.create({
      data: {
        messId: testMessId,
        memberId: normalMemberId,
        date: new Date('2026-09-02T12:00:00Z'),
        breakfast: 0.0,
        lunch: 1.0,
        dinner: 1.0,
      },
    });
    expect(Number(mealMember.lunch)).toBe(1.0);

    // Record an Expense
    const expense = await prisma.expense.create({
      data: {
        messId: testMessId,
        payerMemberId: adminMemberId,
        amount: 1000.0,
        type: ExpenseType.VARIABLE,
        category: 'Food',
        date: new Date('2026-09-02T10:00:00Z'),
        description: 'Fish and Chicken Bazar',
        status: ExpenseStatus.APPROVED,
        splitMethod: SplitMethod.EQUAL,
      },
    });
    expect(Number(expense.amount)).toBe(1000.0);

    // Create Balanced Ledger Entries (Credit admin for paying 1000, Debit both 500)
    const creditEntry = await prisma.ledgerEntry.create({
      data: {
        messId: testMessId,
        memberId: adminMemberId,
        entryType: 'BAZAR_CONTRIBUTION',
        direction: 'CREDIT',
        amount: 1000.0,
        balanceAfter: 1000.0,
        referenceType: 'EXPENSE',
        referenceId: expense.id,
        description: 'Bazar purchase deposit',
      },
    });
    expect(Number(creditEntry.amount)).toBe(1000.0);

    const debitAdmin = await prisma.ledgerEntry.create({
      data: {
        messId: testMessId,
        memberId: adminMemberId,
        entryType: 'FOOD_SHARE',
        direction: 'DEBIT',
        amount: 500.0,
        balanceAfter: 500.0,
        referenceType: 'EXPENSE',
        referenceId: expense.id,
        description: 'Bazar share for admin',
      },
    });

    const debitMember = await prisma.ledgerEntry.create({
      data: {
        messId: testMessId,
        memberId: normalMemberId,
        entryType: 'FOOD_SHARE',
        direction: 'DEBIT',
        amount: 500.0,
        balanceAfter: -500.0,
        referenceType: 'EXPENSE',
        referenceId: expense.id,
        description: 'Bazar share for member',
      },
    });

    // Zero-sum invariant check
    const totalCredit = Number(creditEntry.amount);
    const totalDebit = Number(debitAdmin.amount) + Number(debitMember.amount);
    expect(totalCredit).toBe(totalDebit);
  });

  it('5. should create and persist immutable FinancialSnapshot in Supabase upon finalization', async () => {
    // Update period status to FINALIZED
    await prisma.financialPeriod.update({
      where: { id: periodId },
      data: {
        status: PeriodStatus.FINALIZED,
        finalizedAt: new Date(),
        finalizedById: adminUserId,
      },
    });

    // Create immutable financial snapshot
    const snapshot = await prisma.financialSnapshot.create({
      data: {
        periodId: periodId,
        messId: testMessId,
        totalMeals: 5.0,
        totalFoodCost: 1000.0,
        mealRate: 200.0,
        totalFixedExpenses: 0.0,
        totalVariableExpenses: 1000.0,
        totalExpenses: 1000.0,
        totalContributions: 1000.0,
        totalAdvances: 0.0,
        totalPayments: 0.0,
        outstandingBalance: 500.0,
        isReconciled: true,
        memberBalancesJson: [
          { memberId: adminMemberId, balance: 500.0 },
          { memberId: normalMemberId, balance: -500.0 },
        ],
        settlementSummaryJson: { totalDebtPool: 500.0 },
        expenseBreakdownJson: { Food: 1000.0 },
      },
    });

    expect(snapshot.id).toBeDefined();
    expect(Number(snapshot.mealRate)).toBe(200.0);
    expect(snapshot.isReconciled).toBe(true);
  });

  it('6. should close the period and verify closed period state in Supabase', async () => {
    const closedPeriod = await prisma.financialPeriod.update({
      where: { id: periodId },
      data: {
        status: PeriodStatus.CLOSED,
        closedAt: new Date(),
        closedById: adminUserId,
      },
    });

    expect(closedPeriod.status).toBe(PeriodStatus.CLOSED);

    // Verify querying closed period returns CLOSED status directly from Supabase
    const fetched = await prisma.financialPeriod.findUnique({
      where: { id: periodId },
    });
    expect(fetched?.status).toBe('CLOSED');
  });

  it('7. should enforce multi-tenant isolation in Supabase PostgreSQL', async () => {
    // Create a second mess
    const mess2 = await prisma.mess.create({
      data: {
        name: `Second Isolated Mess ${testUnique}`,
        code: `MESS2-${testUnique}`,
        currency: 'BDT',
        status: MessStatus.ACTIVE,
        createdById: adminUserId,
      },
    });

    // Verify queries scoped to mess 2 do NOT leak records from mess 1
    const mess1Meals = await prisma.meal.findMany({ where: { messId: testMessId } });
    const mess2Meals = await prisma.meal.findMany({ where: { messId: mess2.id } });

    expect(mess1Meals.length).toBeGreaterThan(0);
    expect(mess2Meals.length).toBe(0);

    // Clean up second mess
    await prisma.mess.delete({ where: { id: mess2.id } });
  });
});
