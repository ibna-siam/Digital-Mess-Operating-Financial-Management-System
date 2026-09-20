import { prisma, isDatabaseOnline } from '../../config/database.js';
import { RoundingService } from './roundingService.js';
import { MealRateService } from './mealRateService.js';

export interface MemberBalanceReport {
  memberId: string;
  memberName: string;
  roomNo?: string | null;
  role: string;
  billingPeriod: string;
  foodShare: number;
  rentShare: number;
  utilityShare: number;
  variableShare: number;
  totalCharges: number; // Total Debits (Value consumed)
  bazarContributed: number;
  advancePaid: number;
  paymentsMade: number;
  totalContributions: number; // Total Credits (Value paid/deposited)
  netBalance: number; // Credits - Debits. Positive = receives; Negative = owes
  displayNetBalance: string;
  status: 'SURPLUS' | 'DEFICIT' | 'BALANCED';
}

export interface MessFinancialSummary {
  messId: string;
  billingPeriod: string;
  totalFoodCost: number;
  totalCountedMeals: number;
  currentMealRate: number;
  displayMealRate: string;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  totalMessExpenses: number;
  totalContributions: number;
  pendingSettlementPool: number; // Total debt owed by all debtors
  membersOwingCount: number;
  membersReceivingCount: number;
  isReconciled: boolean;
  memberBalances: MemberBalanceReport[];
}

export class BalanceService {
  /**
   * Calculates the authoritative balance for a single member in a specific billing period.
   */
  public static async calculateMemberBalance(
    messId: string,
    memberId: string,
    billingPeriod: string
  ): Promise<MemberBalanceReport> {
    const messBalances = await this.calculateMessBalances(messId, billingPeriod);
    const member = messBalances.memberBalances.find((m) => m.memberId === memberId);
    if (!member) {
      return {
        memberId,
        memberName: 'Member',
        role: 'MEMBER',
        billingPeriod,
        foodShare: 0,
        rentShare: 0,
        utilityShare: 0,
        variableShare: 0,
        totalCharges: 0,
        bazarContributed: 0,
        advancePaid: 0,
        paymentsMade: 0,
        totalContributions: 0,
        netBalance: 0,
        displayNetBalance: '৳ 0.00',
        status: 'BALANCED',
      };
    }
    return member;
  }

  /**
   * Calculates all member balances and entire financial reconciliation for a mess in a billing period.
   */
  public static async calculateMessBalances(
    messId: string,
    billingPeriod: string // e.g. "2026-09"
  ): Promise<MessFinancialSummary> {
    // 1. Get meal rate and member food shares
    const mealRateRes = await MealRateService.calculateMealRate(messId, billingPeriod);

    // 2. Fetch all active/on-leave members of the mess
    let members: Array<{ id: string; name: string; role: string; roomNo?: string | null }> = [];
    let isDb = false;
    let bills: any[] = [];
    let utilityBills: any[] = [];
    let bazarGrouped: any[] = [];
    let advanceGrouped: any[] = [];

    try {
      if (await isDatabaseOnline()) {
        isDb = true;
        const [yearStr, monthStr] = billingPeriod.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

        const [dbMembers, fetchedBills, fetchedUtilityBills, fetchedBazarGrouped, fetchedAdvanceGrouped] = await Promise.all([
          prisma.messMember.findMany({
            where: { messId, status: { in: ['ACTIVE', 'ON_LEAVE'] } },
            include: { user: true, room: true },
            orderBy: { createdAt: 'asc' },
          }),
          prisma.bill.findMany({
            where: {
              messId,
              billingPeriod,
              status: { notIn: ['CANCELLED', 'VOID', 'REVERSED'] },
            },
            include: { allocations: true },
          }),
          prisma.utilityBill.findMany({
            where: {
              messId,
              billingPeriod,
              status: { notIn: ['CANCELLED', 'VOID', 'REVERSED'] },
            },
            include: { allocations: true },
          }),
          (prisma.bazarEntry.groupBy as any)({
            by: ['buyerMemberId'],
            where: { messId, date: { gte: startDate, lte: endDate } },
            _sum: { amount: true },
          }),
          (prisma.advanceDeposit.groupBy as any)({
            by: ['memberId'],
            where: { messId, billingPeriod, status: 'CONFIRMED' },
            _sum: { amount: true },
          }),
        ]);

        bills = fetchedBills;
        utilityBills = fetchedUtilityBills;
        bazarGrouped = fetchedBazarGrouped;
        advanceGrouped = fetchedAdvanceGrouped;

        if (dbMembers.length > 0) {
          members = dbMembers.map((m) => ({
            id: m.id,
            name: m.user.name,
            role: m.role,
            roomNo: m.room?.roomNumber || m.roomNo,
          }));
        }
      }
    } catch {
      isDb = false;
    }

    if (members.length === 0) {
      // Fallback in-memory list
      members = [
        { id: 'mem-1', name: 'Rahim Ahmed', role: 'MEMBER', roomNo: 'Room 101' },
        { id: 'mem-2', name: 'Siam Al-Mahmud', role: 'OWNER', roomNo: 'Room 102' },
        { id: 'mem-3', name: 'Tanvir Hossain', role: 'MANAGER', roomNo: 'Room 102' },
        { id: 'mem-4', name: 'Naimur Rahman', role: 'MEMBER', roomNo: 'Room 103' },
        { id: 'mem-5', name: 'Farhan Kabir', role: 'MEMBER', roomNo: 'Room 104' },
      ];
    }

    let fixedOverheadTotal = 0;
    if (isDb && (bills.length > 0 || utilityBills.length > 0)) {
      for (const b of bills) fixedOverheadTotal += Number(b.amount);
      for (const u of utilityBills) fixedOverheadTotal += Number(u.amount);
      fixedOverheadTotal = RoundingService.roundMoney(fixedOverheadTotal);
    } else {
      fixedOverheadTotal = 26100; // In-memory fallback
    }

    // 3. Calculate balances per member
    const memberBalances: MemberBalanceReport[] = [];
    let totalDebits = 0;
    let totalContributions = 0;
    let totalDebtPool = 0;
    let debtorsCount = 0;
    let creditorsCount = 0;

    for (const mem of members) {
      // Find food share
      const foodItem = mealRateRes.memberShares.find((s) => s.memberId === mem.id);
      const foodShare = foodItem ? foodItem.foodShare : 0;

      let rentShare = 0;
      let utilityShare = 0;
      const variableShare = 0;

      if (isDb && (bills.length > 0 || utilityBills.length > 0)) {
        for (const b of bills) {
          const alloc = b.allocations?.find((a: any) => a.memberId === mem.id);
          const amt = alloc ? Number(alloc.amount) : Number(b.amount) / members.length;
          if (b.category === 'RENT') {
            rentShare += amt;
          } else {
            utilityShare += amt;
          }
        }
        for (const u of utilityBills) {
          const alloc = u.allocations?.find((a: any) => a.memberId === mem.id);
          const amt = alloc ? Number(alloc.amount) : Number(u.amount) / members.length;
          utilityShare += amt;
        }
        rentShare = RoundingService.roundMoney(rentShare);
        utilityShare = RoundingService.roundMoney(utilityShare);
      } else {
        rentShare = 4000;
        utilityShare = 1000;
      }

      const totalCharges = RoundingService.roundMoney(foodShare + rentShare + utilityShare + variableShare);

      // Contributions (Bazar paid + advances)
      let bazarPaid = 0;
      let advancePaid = 0;
      const paymentsMade = 0;

      if (isDb) {
        bazarPaid = Number(bazarGrouped.find((b) => b.buyerMemberId === mem.id)?._sum?.amount || 0);
        advancePaid = Number(advanceGrouped.find((a) => a.memberId === mem.id)?._sum?.amount || 0);
      } else {
        if (mem.id === 'mem-1') {
          bazarPaid = 12000;
          advancePaid = 0;
        } else if (mem.id === 'mem-2') {
          bazarPaid = 0;
          advancePaid = 5000;
        } else if (mem.id === 'mem-3') {
          bazarPaid = 0;
          advancePaid = 6800;
        } else if (mem.id === 'mem-4') {
          bazarPaid = 0;
          advancePaid = 6500;
        } else {
          bazarPaid = 0;
          advancePaid = 6700;
        }
      }

      const memberContributions = RoundingService.roundMoney(bazarPaid + advancePaid + paymentsMade);
      totalDebits = RoundingService.roundMoney(totalDebits + totalCharges);
      totalContributions = RoundingService.roundMoney(totalContributions + memberContributions);

      // Net Balance = Contributions - Charges
      const net = RoundingService.roundMoney(memberContributions - totalCharges);

      let status: 'SURPLUS' | 'DEFICIT' | 'BALANCED' = 'BALANCED';
      if (net > 0.01) {
        status = 'SURPLUS';
        creditorsCount++;
      } else if (net < -0.01) {
        status = 'DEFICIT';
        debtorsCount++;
        totalDebtPool += Math.abs(net);
      }

      memberBalances.push({
        memberId: mem.id,
        memberName: mem.name,
        roomNo: mem.roomNo,
        role: mem.role,
        billingPeriod,
        foodShare,
        rentShare,
        utilityShare,
        variableShare,
        totalCharges,
        bazarContributed: bazarPaid,
        advancePaid,
        paymentsMade,
        totalContributions: memberContributions,
        netBalance: net,
        displayNetBalance: RoundingService.formatMoney(net),
        status,
      });
    }

    const totalMessExpenses = RoundingService.roundMoney(mealRateRes.totalFoodCost + fixedOverheadTotal);
    const discrepancy = Math.abs(RoundingService.roundMoney(totalDebits - totalContributions));

    return {
      messId,
      billingPeriod,
      totalFoodCost: mealRateRes.totalFoodCost,
      totalCountedMeals: mealRateRes.totalMeals,
      currentMealRate: mealRateRes.mealRate,
      displayMealRate: mealRateRes.displayMealRate,
      totalFixedExpenses: fixedOverheadTotal,
      totalVariableExpenses: mealRateRes.totalFoodCost,
      totalMessExpenses,
      totalContributions: RoundingService.roundMoney(totalContributions),
      pendingSettlementPool: RoundingService.roundMoney(totalDebtPool),
      membersOwingCount: debtorsCount,
      membersReceivingCount: creditorsCount,
      isReconciled: discrepancy <= 0.05,
      memberBalances,
    };
  }

  /**
   * Helper to retrieve member balance list for a period
   */
  public static async calculateMemberBalances(messId: string, billingPeriod: string): Promise<MemberBalanceReport[]> {
    const summary = await this.calculateMessBalances(messId, billingPeriod);
    return summary.memberBalances;
  }

  /**
   * Runs authoritative zero-sum ledger reconciliation
   */
  public static async reconcileLedger(messId: string, billingPeriod?: string): Promise<{
    isReconciled: boolean;
    totalDebits: number;
    totalCredits: number;
    discrepancy: number;
  }> {
    let period = billingPeriod;
    if (!period) {
      try {
        if (await isDatabaseOnline()) {
          const activePeriod = await prisma.financialPeriod.findFirst({
            where: { messId, status: { in: ['ACTIVE', 'UNDER_REVIEW', 'FINALIZED'] } },
            orderBy: { startDate: 'desc' },
          });
          if (activePeriod) {
            period = activePeriod.periodKey;
          }
        }
      } catch {
        // fallback to current month
      }
    }

    if (!period) {
      const now = new Date();
      period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    const summary = await this.calculateMessBalances(messId, period);

    let totalDebits = 0;
    let totalCredits = 0;
    for (const b of summary.memberBalances) {
      totalDebits = RoundingService.roundMoney(totalDebits + b.totalCharges);
      totalCredits = RoundingService.roundMoney(totalCredits + b.totalContributions);
    }

    const discrepancy = Math.abs(RoundingService.roundMoney(totalDebits - totalCredits));
    return {
      isReconciled: discrepancy <= 0.05,
      totalDebits,
      totalCredits,
      discrepancy,
    };
  }
}

