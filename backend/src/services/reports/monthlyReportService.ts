import { BillStatus } from '@prisma/client';
import { PeriodService } from '../period/periodService.js';
import { SnapshotService, FinancialSnapshotDTO } from '../period/snapshotService.js';
import { MealRateService } from '../financial/mealRateService.js';
import { BalanceService } from '../financial/balanceService.js';
import { SettlementService } from '../financial/settlementService.js';
import { ExpenseService } from '../expenseService.js';
import { UtilityService } from '../utilityService.js';
import { RoundingService } from '../financial/roundingService.js';
import { MemberService } from '../memberService.js';

export interface MonthlyFinancialReportDTO {
  periodKey: string;
  periodStatus: string;
  isSnapshot: boolean;
  generatedAt: string;
  summary: {
    totalExpenses: number;
    foodCost: number;
    fixedCosts: number;
    variableCosts: number;
    mealRate: number;
    totalMeals: number;
    averageCostPerMember: number;
    totalContributions: number;
    totalAdvances: number;
    totalPayments: number;
    outstandingAmount: number;
    activeMembersCount: number;
    isReconciled: boolean;
  };
  expenseBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  comparison: {
    hasPrevious: boolean;
    prevPeriodKey: string | null;
    totalExpensesDelta: number;
    totalExpensesDeltaPercent: number;
    mealRateDelta: number;
    mealRateDeltaPercent: number;
    mealsDelta: number;
    foodCostDelta: number;
  };
}

export class MonthlyReportService {
  /**
   * Generates comprehensive monthly financial report with previous-month comparison
   */
  static async getMonthlyReport(
    messId: string,
    periodKey: string,
    precomputedBalances?: any
  ): Promise<MonthlyFinancialReportDTO> {
    const period = await PeriodService.getPeriodByKey(messId, periodKey);
    const periodStatus = period ? period.status : 'ACTIVE';

    // Check if snapshot exists (for CLOSED or FINALIZED)
    let snapshot: FinancialSnapshotDTO | null = null;
    if (period) {
      snapshot = await SnapshotService.getSnapshot(period.id);
    }

    let summary: MonthlyFinancialReportDTO['summary'];
    let expenseBreakdown: MonthlyFinancialReportDTO['expenseBreakdown'] = [];

    // Active members count
    const members = await MemberService.listMembers(messId);
    const activeMembersCount = Math.max(1, members.filter((m: any) => m.status === 'ACTIVE').length);

    if (snapshot) {
      // Use snapshot data for guaranteed historical immutability
      const totalExp = snapshot.totalExpenses;
      summary = {
        totalExpenses: totalExp,
        foodCost: snapshot.totalFoodCost,
        fixedCosts: snapshot.totalFixedExpenses,
        variableCosts: snapshot.totalVariableExpenses,
        mealRate: snapshot.mealRate,
        totalMeals: snapshot.totalMeals,
        averageCostPerMember: RoundingService.roundCurrency(totalExp / activeMembersCount),
        totalContributions: snapshot.totalContributions,
        totalAdvances: snapshot.totalAdvances,
        totalPayments: snapshot.totalPayments,
        outstandingAmount: snapshot.outstandingBalance,
        activeMembersCount,
        isReconciled: snapshot.isReconciled,
      };

      expenseBreakdown = (snapshot.expenseBreakdown || []).map((eb: any) => ({
        category: eb.category,
        amount: eb.amount,
        percentage: totalExp > 0 ? RoundingService.roundCurrency((eb.amount / totalExp) * 100) : 0,
      }));
    } else {
      // Live calculation reusing precomputed balances or single authoritative calculateMessBalances
      const messBalances = precomputedBalances || (await BalanceService.calculateMessBalances(messId, periodKey));
      const memberBalances = messBalances.memberBalances;
      const mealRateRes = {
        totalFoodCost: messBalances.totalFoodCost,
        totalMeals: messBalances.totalCountedMeals,
        mealRate: messBalances.currentMealRate,
      };
      const recon = {
        totalCredits: messBalances.totalContributions,
        isReconciled: messBalances.isReconciled,
      };
      const settlement = await SettlementService.getSettlementPlan(messId, periodKey);

      const allExpenses = await ExpenseService.listExpenses(messId);
      const periodExpenses = allExpenses.filter((e: any) => {
        if (!e.date) return true;
        const d = new Date(e.date);
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth() + 1;
        return `${y}-${String(m).padStart(2, '0')}` === periodKey;
      });

      let fixed = 0;
      let variable = 0;
      const catMap: Record<string, number> = {};

      for (const exp of periodExpenses) {
        if (exp.status === 'APPROVED') {
          const cat = exp.category || 'OTHER';
          catMap[cat] = RoundingService.roundCurrency((catMap[cat] || 0) + exp.amount);
          if (exp.type === 'FIXED') {
            fixed = RoundingService.roundCurrency(fixed + exp.amount);
          } else {
            variable = RoundingService.roundCurrency(variable + exp.amount);
          }
        }
      }

      // Add posted utility bills for this period (Rent, Electricity, Gas, Water, WiFi, Maid)
      try {
        const utilityBills = await UtilityService.listUtilityBills(messId, { periodKey });
        for (const ub of utilityBills) {
          if ((ub.status as string) === 'POSTED') {
            const cat = ub.category;
            catMap[cat] = RoundingService.roundCurrency((catMap[cat] || 0) + ub.amount);
            fixed = RoundingService.roundCurrency(fixed + ub.amount);
          }
        }
      } catch {
        // Fallback safe
      }

      const totalExp = RoundingService.roundCurrency(fixed + variable);
      expenseBreakdown = Object.entries(catMap).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExp > 0 ? RoundingService.roundCurrency((amount / totalExp) * 100) : 0,
      }));

      let totalAdv = 0;
      let debt = 0;
      for (const b of memberBalances) {
        totalAdv = RoundingService.roundCurrency(totalAdv + (b.advancePaid || 0));
        if (b.netBalance < -0.01) {
          debt = RoundingService.roundCurrency(debt + Math.abs(b.netBalance));
        }
      }

      summary = {
        totalExpenses: totalExp,
        foodCost: mealRateRes.totalFoodCost,
        fixedCosts: fixed,
        variableCosts: variable,
        mealRate: mealRateRes.mealRate,
        totalMeals: mealRateRes.totalMeals,
        averageCostPerMember: RoundingService.roundCurrency(totalExp / activeMembersCount),
        totalContributions: recon.totalCredits,
        totalAdvances: totalAdv,
        totalPayments: settlement ? settlement.items.reduce((acc, it) => acc + (it.settledAmount || 0), 0) : 0,
        outstandingAmount: debt,
        activeMembersCount,
        isReconciled: recon.isReconciled,
      };
    }

    // Previous month comparison
    const { year, month } = PeriodService.parsePeriodKey(periodKey);
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevPeriodKey = PeriodService.getPeriodKey(prevYear, prevMonth);

    const prevPeriod = await PeriodService.getPeriodByKey(messId, prevPeriodKey);
    let comparison: MonthlyFinancialReportDTO['comparison'] = {
      hasPrevious: false,
      prevPeriodKey: null,
      totalExpensesDelta: 0,
      totalExpensesDeltaPercent: 0,
      mealRateDelta: 0,
      mealRateDeltaPercent: 0,
      mealsDelta: 0,
      foodCostDelta: 0,
    };

    if (prevPeriod) {
      try {
        const prevSnapshot = await SnapshotService.getSnapshot(prevPeriod.id);
        const prevExp = prevSnapshot ? prevSnapshot.totalExpenses : 0;
        const prevMealRate = prevSnapshot ? prevSnapshot.mealRate : 0;
        const prevMeals = prevSnapshot ? prevSnapshot.totalMeals : 0;
        const prevFoodCost = prevSnapshot ? prevSnapshot.totalFoodCost : 0;

        const expDelta = RoundingService.roundCurrency(summary.totalExpenses - prevExp);
        const expDeltaPct = prevExp > 0 ? RoundingService.roundCurrency((expDelta / prevExp) * 100) : 0;

        const rateDelta = RoundingService.roundCurrency(summary.mealRate - prevMealRate);
        const rateDeltaPct = prevMealRate > 0 ? RoundingService.roundCurrency((rateDelta / prevMealRate) * 100) : 0;

        comparison = {
          hasPrevious: true,
          prevPeriodKey,
          totalExpensesDelta: expDelta,
          totalExpensesDeltaPercent: expDeltaPct,
          mealRateDelta: rateDelta,
          mealRateDeltaPercent: rateDeltaPct,
          mealsDelta: summary.totalMeals - prevMeals,
          foodCostDelta: RoundingService.roundCurrency(summary.foodCost - prevFoodCost),
        };
      } catch {
        // Leave comparison as empty state
      }
    }

    return {
      periodKey,
      periodStatus,
      isSnapshot: !!snapshot,
      generatedAt: new Date().toISOString(),
      summary,
      expenseBreakdown,
      comparison,
    };
  }
}
