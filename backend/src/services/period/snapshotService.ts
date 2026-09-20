import { prisma, isDatabaseOnline } from '../../config/database.js';
import { MealRateService } from '../financial/mealRateService.js';
import { BalanceService } from '../financial/balanceService.js';
import { SettlementService } from '../financial/settlementService.js';
import { ExpenseService } from '../expenseService.js';
import { RoundingService } from '../financial/roundingService.js';
import { NotFoundError } from '../../utils/errors.js';

export interface FinancialSnapshotDTO {
  id: string;
  periodId: string;
  messId: string;
  totalMeals: number;
  totalFoodCost: number;
  mealRate: number;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  totalExpenses: number;
  totalContributions: number;
  totalAdvances: number;
  totalPayments: number;
  outstandingBalance: number;
  isReconciled: boolean;
  memberBalances: any[];
  settlementSummary: any;
  expenseBreakdown: any[];
  createdAt: string;
}

// In-memory snapshot fallback store
const memorySnapshots: Record<string, FinancialSnapshotDTO> = {};

export class SnapshotService {
  /**
   * Create and persist an immutable financial snapshot from Phase 3 services
   */
  static async createFinancialSnapshot(messId: string, periodId: string, periodKey: string): Promise<FinancialSnapshotDTO> {
    // 1. Fetch Meal Rate calculations
    const mealRateResult = await MealRateService.calculateMealRate(messId, periodKey);

    // 2. Fetch Member Balances
    const memberBalances = await BalanceService.calculateMemberBalances(messId, periodKey);

    // 3. Fetch Ledger Reconciliation
    const recon = await BalanceService.reconcileLedger(messId, periodKey);

    // 4. Fetch Settlement Plan
    const settlementPlan = await SettlementService.getSettlementPlan(messId, periodKey);

    // 5. Fetch and aggregate expenses by category
    const allExpenses = await ExpenseService.listExpenses(messId);
    const periodExpenses = allExpenses.filter((e: any) => {
      if (!e.date) return true;
      const d = new Date(e.date);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      return `${y}-${String(m).padStart(2, '0')}` === periodKey;
    });

    let totalFixed = 0;
    let totalVariable = 0;
    const categoryMap: Record<string, number> = {};

    for (const exp of periodExpenses) {
      if (exp.status === 'APPROVED') {
        const cat = exp.category || 'OTHER';
        categoryMap[cat] = RoundingService.roundCurrency((categoryMap[cat] || 0) + exp.amount);
        if (exp.type === 'FIXED') {
          totalFixed = RoundingService.roundCurrency(totalFixed + exp.amount);
        } else {
          totalVariable = RoundingService.roundCurrency(totalVariable + exp.amount);
        }
      }
    }

    const expenseBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
      category,
      amount,
    }));

    // Aggregate contributions & payments
    let totalAdvances = 0;
    let outstandingDebt = 0;
    for (const b of memberBalances) {
      totalAdvances = RoundingService.roundCurrency(totalAdvances + (b.advancePaid || 0));
      if (b.netBalance < -0.01) {
        outstandingDebt = RoundingService.roundCurrency(outstandingDebt + Math.abs(b.netBalance));
      }
    }

    const totalContributions = recon.totalCredits;
    const totalPayments = settlementPlan
      ? settlementPlan.items.reduce((acc: number, it: any) => acc + (it.settledAmount || 0), 0)
      : 0;
    const totalExpenses = RoundingService.roundCurrency(totalFixed + totalVariable);

    const snapshotDTO: FinancialSnapshotDTO = {
      id: `snap-${periodKey}`,
      periodId,
      messId,
      totalMeals: mealRateResult.totalMeals,
      totalFoodCost: mealRateResult.totalFoodCost,
      mealRate: mealRateResult.mealRate,
      totalFixedExpenses: totalFixed,
      totalVariableExpenses: totalVariable,
      totalExpenses,
      totalContributions,
      totalAdvances,
      totalPayments,
      outstandingBalance: outstandingDebt,
      isReconciled: recon.isReconciled,
      memberBalances,
      settlementSummary: settlementPlan ? { totalDebtPool: settlementPlan.totalDebtPool, totalSettledAmount: totalPayments } : {},
      expenseBreakdown,
      createdAt: new Date().toISOString(),
    };

    if (await isDatabaseOnline()) {
      const created = await prisma.financialSnapshot.upsert({
        where: { periodId },
        create: {
          periodId,
          messId,
          totalMeals: snapshotDTO.totalMeals,
          totalFoodCost: snapshotDTO.totalFoodCost,
          mealRate: snapshotDTO.mealRate,
          totalFixedExpenses: snapshotDTO.totalFixedExpenses,
          totalVariableExpenses: snapshotDTO.totalVariableExpenses,
          totalExpenses: snapshotDTO.totalExpenses,
          totalContributions: snapshotDTO.totalContributions,
          totalAdvances: snapshotDTO.totalAdvances,
          totalPayments: snapshotDTO.totalPayments,
          outstandingBalance: snapshotDTO.outstandingBalance,
          isReconciled: snapshotDTO.isReconciled,
          memberBalancesJson: memberBalances as any,
          settlementSummaryJson: snapshotDTO.settlementSummary as any,
          expenseBreakdownJson: expenseBreakdown as any,
        },
        update: {
          totalMeals: snapshotDTO.totalMeals,
          totalFoodCost: snapshotDTO.totalFoodCost,
          mealRate: snapshotDTO.mealRate,
          totalFixedExpenses: snapshotDTO.totalFixedExpenses,
          totalVariableExpenses: snapshotDTO.totalVariableExpenses,
          totalExpenses: snapshotDTO.totalExpenses,
          totalContributions: snapshotDTO.totalContributions,
          totalAdvances: snapshotDTO.totalAdvances,
          totalPayments: snapshotDTO.totalPayments,
          outstandingBalance: snapshotDTO.outstandingBalance,
          isReconciled: snapshotDTO.isReconciled,
          memberBalancesJson: memberBalances as any,
          settlementSummaryJson: snapshotDTO.settlementSummary as any,
          expenseBreakdownJson: expenseBreakdown as any,
        },
      });

      return this.mapPrismaToDTO(created);
    }

    memorySnapshots[periodId] = snapshotDTO;
    return snapshotDTO;
  }

  /**
   * Retrieve snapshot for a period
   */
  static async getSnapshot(periodId: string): Promise<FinancialSnapshotDTO | null> {
    if (await isDatabaseOnline()) {
      const found = await prisma.financialSnapshot.findUnique({
        where: { periodId },
      });
      return found ? this.mapPrismaToDTO(found) : null;
    }

    return memorySnapshots[periodId] || null;
  }

  private static mapPrismaToDTO(s: any): FinancialSnapshotDTO {
    return {
      id: s.id,
      periodId: s.periodId,
      messId: s.messId,
      totalMeals: Number(s.totalMeals),
      totalFoodCost: Number(s.totalFoodCost),
      mealRate: Number(s.mealRate),
      totalFixedExpenses: Number(s.totalFixedExpenses),
      totalVariableExpenses: Number(s.totalVariableExpenses),
      totalExpenses: Number(s.totalExpenses),
      totalContributions: Number(s.totalContributions),
      totalAdvances: Number(s.totalAdvances),
      totalPayments: Number(s.totalPayments),
      outstandingBalance: Number(s.outstandingBalance),
      isReconciled: s.isReconciled,
      memberBalances: Array.isArray(s.memberBalancesJson) ? s.memberBalancesJson : [],
      settlementSummary: s.settlementSummaryJson || {},
      expenseBreakdown: Array.isArray(s.expenseBreakdownJson) ? s.expenseBreakdownJson : [],
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
    };
  }

  // Test helper
  static _resetMemorySnapshots() {
    for (const key of Object.keys(memorySnapshots)) {
      delete memorySnapshots[key];
    }
  }
}
