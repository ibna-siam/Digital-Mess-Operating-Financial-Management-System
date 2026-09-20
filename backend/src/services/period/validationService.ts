import { prisma, isDatabaseOnline } from '../../config/database.js';
import { BillStatus } from '@prisma/client';
import { PeriodService } from './periodService.js';
import { MealRateService } from '../financial/mealRateService.js';
import { BalanceService } from '../financial/balanceService.js';
import { SettlementService } from '../financial/settlementService.js';
import { ExpenseService } from '../expenseService.js';
import { UtilityService } from '../utilityService.js';
import { RoundingService } from '../financial/roundingService.js';

export interface MonthEndChecklistItem {
  id: string;
  title: string;
  status: 'PASSED' | 'WARNING' | 'BLOCKED';
  details: string;
  count?: number;
}

export interface ValidationIssue {
  code: string;
  message: string;
  entityId?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  entityId?: string;
}

export interface FinancialValidationResult {
  canFinalize: boolean;
  canClose: boolean;
  periodKey: string;
  periodStatus: string;
  checklist: MonthEndChecklistItem[];
  warnings: ValidationWarning[];
  blockingIssues: ValidationIssue[];
  summary: {
    totalMeals: number;
    totalFoodCost: number;
    mealRate: number;
    totalExpenses: number;
    totalContributions: number;
    totalPayments: number;
    outstandingBalance: number;
    isReconciled: boolean;
  };
}

export class ValidationService {
  /**
   * Authoritative validation engine for financial periods before finalize or close
   */
  static async validateFinancialPeriod(messId: string, periodKey: string): Promise<FinancialValidationResult> {
    const blockingIssues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    const checklist: MonthEndChecklistItem[] = [];

    // Parallelize all 6 independent domain services
    const [
      periodRes,
      mealRateRes,
      expensesRes,
      utilityBillsRes,
      reconRes,
      balancesRes,
      settlementPlanRes,
    ] = await Promise.allSettled([
      PeriodService.getPeriodByKey(messId, periodKey),
      MealRateService.calculateMealRate(messId, periodKey),
      ExpenseService.listExpenses(messId),
      UtilityService.listUtilityBills(messId, { periodKey }),
      BalanceService.reconcileLedger(messId, periodKey),
      BalanceService.calculateMemberBalances(messId, periodKey),
      SettlementService.getSettlementPlan(messId, periodKey),
    ]);

    const period = periodRes.status === 'fulfilled' ? periodRes.value : null;
    const periodStatus = period ? period.status : 'ACTIVE';

    // 1. Process Meals & Meal Rate
    let totalMeals = 0;
    let totalFoodCost = 0;
    let mealRate = 0;
    if (mealRateRes.status === 'fulfilled') {
      totalMeals = mealRateRes.value.totalMeals;
      totalFoodCost = mealRateRes.value.totalFoodCost;
      mealRate = mealRateRes.value.mealRate;

      if (totalMeals === 0) {
        warnings.push({
          code: 'ZERO_MEALS',
          message: 'No meals have been recorded for this billing period.',
          severity: 'HIGH',
        });
        checklist.push({
          id: 'meals_recorded',
          title: 'Meal records reviewed',
          status: 'WARNING',
          details: '0 meals recorded for this month',
          count: 0,
        });
      } else {
        checklist.push({
          id: 'meals_recorded',
          title: 'Meal records reviewed',
          status: 'PASSED',
          details: `${totalMeals} meals recorded at meal rate ৳${mealRate.toFixed(2)}`,
          count: totalMeals,
        });
      }
    } else {
      blockingIssues.push({
        code: 'MEAL_RATE_ERROR',
        message: `Failed to calculate meal rate: ${mealRateRes.reason?.message || 'Unknown error'}`,
      });
      checklist.push({
        id: 'meals_recorded',
        title: 'Meal records reviewed',
        status: 'BLOCKED',
        details: `Calculation error: ${mealRateRes.reason?.message || 'Unknown error'}`,
      });
    }

    // 2. Process Expenses & Unapproved Status
    let unapprovedExpensesCount = 0;
    let missingReceiptsCount = 0;
    let totalExpenses = 0;
    if (expensesRes.status === 'fulfilled') {
      const expenses = expensesRes.value;
      const periodExpenses = expenses.filter((e: any) => {
        if (!e.date) return true;
        const d = new Date(e.date);
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth() + 1;
        const key = `${y}-${String(m).padStart(2, '0')}`;
        return key === periodKey;
      });

      for (const exp of periodExpenses) {
        if (exp.status === 'PENDING_APPROVAL') {
          unapprovedExpensesCount++;
        }
        if (exp.status === 'APPROVED') {
          totalExpenses = RoundingService.roundCurrency(totalExpenses + exp.amount);
          if (exp.amount >= 1000 && !exp.receiptUrl) {
            missingReceiptsCount++;
          }
        }
      }

      if (unapprovedExpensesCount > 0) {
        blockingIssues.push({
          code: 'UNAPPROVED_EXPENSES',
          message: `There are ${unapprovedExpensesCount} expense(s) pending approval. All expenses must be approved or rejected before finalization.`,
        });
        checklist.push({
          id: 'expenses_approved',
          title: 'All expenses approved',
          status: 'BLOCKED',
          details: `${unapprovedExpensesCount} pending approval`,
          count: unapprovedExpensesCount,
        });
      } else {
        checklist.push({
          id: 'expenses_approved',
          title: 'All expenses approved',
          status: 'PASSED',
          details: 'All recorded expenses have been reviewed and approved',
          count: periodExpenses.length,
        });
      }

      if (missingReceiptsCount > 0) {
        warnings.push({
          code: 'MISSING_RECEIPTS',
          message: `${missingReceiptsCount} major expense(s) (>= ৳1,000) are missing receipt attachments.`,
          severity: 'MEDIUM',
        });
        checklist.push({
          id: 'receipts_attached',
          title: 'Receipts verified',
          status: 'WARNING',
          details: `${missingReceiptsCount} expense(s) over ৳1,000 missing receipts`,
          count: missingReceiptsCount,
        });
      } else {
        checklist.push({
          id: 'receipts_attached',
          title: 'Receipts verified',
          status: 'PASSED',
          details: 'All major expenses have receipts attached',
        });
      }
    } else {
      warnings.push({
        code: 'EXPENSE_AUDIT_WARNING',
        message: `Could not complete expense audit: ${expensesRes.reason?.message || 'Unknown error'}`,
        severity: 'LOW',
      });
    }

    // 3. Process Utility Bills
    if (utilityBillsRes.status === 'fulfilled') {
      const utilityBills = utilityBillsRes.value;
      const unpostedBills = utilityBills.filter(
        (b) => (b.status as string) === 'PENDING_REVIEW' || (b.status as string) === 'APPROVED'
      );

      if (unpostedBills.length > 0) {
        warnings.push({
          code: 'UNPOSTED_UTILITY_BILLS',
          message: `${unpostedBills.length} utility bill(s) are pending review or posting. Post them to ensure member statements reflect complete utility shares.`,
          severity: 'MEDIUM',
        });
        checklist.push({
          id: 'utilities_verified',
          title: 'Utility bills reviewed & posted',
          status: 'WARNING',
          details: `${unpostedBills.length} unposted bill(s) pending in period`,
          count: unpostedBills.length,
        });
      } else {
        checklist.push({
          id: 'utilities_verified',
          title: 'Utility bills reviewed & posted',
          status: 'PASSED',
          details: utilityBills.length > 0 
            ? `All ${utilityBills.length} utility bills are posted to the ledger`
            : 'No utility bills registered or all posted',
          count: utilityBills.length,
        });
      }
    }

    // 4. Process Ledger Zero-Sum Reconciliation
    let isReconciled = true;
    let totalContributions = 0;
    if (reconRes.status === 'fulfilled') {
      const recon = reconRes.value;
      isReconciled = recon.isReconciled;
      totalContributions = recon.totalCredits;

      if (!recon.isReconciled) {
        blockingIssues.push({
          code: 'LEDGER_MISMATCH',
          message: `Shared financial ledger has an unreconciled variance of ৳${recon.discrepancy.toFixed(2)}. Total Debits: ৳${recon.totalDebits.toFixed(2)}, Total Credits: ৳${recon.totalCredits.toFixed(2)}.`,
        });
        checklist.push({
          id: 'ledger_reconciled',
          title: 'Shared ledger balanced',
          status: 'BLOCKED',
          details: `Variance detected: ৳${recon.discrepancy.toFixed(2)}`,
        });
      } else {
        checklist.push({
          id: 'ledger_reconciled',
          title: 'Shared ledger balanced',
          status: 'PASSED',
          details: `Debits and credits fully balanced (৳${recon.totalDebits.toFixed(2)})`,
        });
      }
    } else {
      blockingIssues.push({
        code: 'RECONCILIATION_ERROR',
        message: `Ledger reconciliation error: ${reconRes.reason?.message || 'Unknown error'}`,
      });
      checklist.push({
        id: 'ledger_reconciled',
        title: 'Shared ledger balanced',
        status: 'BLOCKED',
        details: `Reconciliation error: ${reconRes.reason?.message || 'Unknown error'}`,
      });
    }

    // 5. Member Balances & Settlement Plan
    let outstandingBalance = 0;
    let totalPayments = 0;
    if (balancesRes.status === 'fulfilled') {
      const balances = balancesRes.value;
      let debtorsCount = 0;
      let creditorsCount = 0;

      for (const b of balances) {
        if (b.netBalance < -0.01) {
          debtorsCount++;
          outstandingBalance = RoundingService.roundCurrency(outstandingBalance + Math.abs(b.netBalance));
        } else if (b.netBalance > 0.01) {
          creditorsCount++;
        }
      }

      checklist.push({
        id: 'balances_calculated',
        title: 'Member balances calculated',
        status: 'PASSED',
        details: `${debtorsCount} members owe total ৳${outstandingBalance.toFixed(2)}, ${creditorsCount} members in credit`,
      });
    }

    // Settlement Plan check
    if (settlementPlanRes.status === 'fulfilled') {
      const settlementPlan = settlementPlanRes.value;
      if (!settlementPlan) {
        warnings.push({
          code: 'NO_SETTLEMENT_PLAN',
          message: 'Settlement plan has not yet been computed for this month.',
          severity: 'MEDIUM',
        });
        checklist.push({
          id: 'settlement_generated',
          title: 'Settlement plan generated',
          status: 'WARNING',
          details: 'Settlement plan not yet finalized',
        });
      } else {
        totalPayments = settlementPlan.items.reduce((acc: number, it: any) => acc + (it.settledAmount || 0), 0);
        const pendingItems = settlementPlan.items.filter((item: any) => item.status === 'PENDING');
        if (pendingItems.length > 0) {
          warnings.push({
            code: 'PENDING_SETTLEMENT_PAYMENTS',
            message: `${pendingItems.length} settlement transaction(s) are still pending payment.`,
            severity: 'LOW',
          });
          checklist.push({
            id: 'settlement_generated',
            title: 'Settlement plan generated',
            status: 'PASSED',
            details: `${settlementPlan.items.length} transfers mapped (${pendingItems.length} pending execution)`,
          });
        } else {
          checklist.push({
            id: 'settlement_generated',
            title: 'Settlement plan generated',
            status: 'PASSED',
            details: `All ${settlementPlan.items.length} settlement transfers executed and confirmed`,
          });
        }
      }
    } else {
      warnings.push({
        code: 'SETTLEMENT_CHECK_FAILED',
        message: `Settlement verification error: ${settlementPlanRes.reason?.message || 'Unknown error'}`,
        severity: 'LOW',
      });
    }

    const canFinalize = blockingIssues.length === 0;
    const canClose = blockingIssues.length === 0 && (periodStatus === 'FINALIZED' || periodStatus === 'UNDER_REVIEW');

    return {
      canFinalize,
      canClose,
      periodKey,
      periodStatus,
      checklist,
      warnings,
      blockingIssues,
      summary: {
        totalMeals,
        totalFoodCost,
        mealRate,
        totalExpenses,
        totalContributions,
        totalPayments,
        outstandingBalance,
        isReconciled,
      },
    };
  }
}
