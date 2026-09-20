import { prisma } from '../../config/database.js';
import { MonthlyReportService } from './monthlyReportService.js';
import { BalanceService, MemberBalanceReport } from '../financial/balanceService.js';
import { SettlementReportService } from './settlementReportService.js';
import { MealReportService } from './mealReportService.js';
import { PeriodService } from '../period/periodService.js';
import { NotFoundError } from '../../utils/errors.js';

export interface FinancialAnomaly {
  id: string;
  type: 'LARGE_TRANSACTION' | 'BALANCE_DEFICIT' | 'UNUSUAL_MEAL_COUNT' | 'MISSING_RECURRING_BILL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  description: string;
  amount?: number;
  entityId?: string;
  entityType?: string;
}

export interface AnalyticalInsight {
  id: string;
  category: 'EXPENSE' | 'MEAL' | 'UTILITY' | 'CASH_FLOW' | 'MEMBER';
  text: string;
  trend?: 'UP' | 'DOWN' | 'NEUTRAL';
  deltaPercent?: number;
}

export class AnalyticsService {
  /**
   * Executive Financial Dashboard: High-level metrics, cash position, anomalies, and insights.
   */
  static async getExecutiveDashboard(messId: string, periodKey: string) {
    const period = await PeriodService.getPeriodByKey(messId, periodKey);
    if (!period) {
      throw new NotFoundError(`Financial period ${periodKey} not found.`);
    }

    // 1. Consume authoritative Balances first
    const balanceReport = await BalanceService.calculateMessBalances(messId, periodKey);
    const memberBalances: MemberBalanceReport[] = balanceReport.memberBalances;

    // 2. Concurrently generate settlement and monthly reports reusing precomputed balances
    const [settlementReport, monthlyReport] = await Promise.all([
      SettlementReportService.getSettlementReport(messId, periodKey, balanceReport),
      MonthlyReportService.getMonthlyReport(messId, periodKey, balanceReport),
    ]);

    // 3. Compute Dues, Credits, Cash Position
    let totalMemberDue = 0;
    let totalMemberCredit = 0;
    memberBalances.forEach((mb: MemberBalanceReport) => {
      if (mb.netBalance < 0) {
        totalMemberDue += Math.abs(mb.netBalance);
      } else if (mb.netBalance > 0) {
        totalMemberCredit += mb.netBalance;
      }
    });

    // Cash position: Total inflows (contributions + advances + settlements) minus actual cash expenses paid
    const currentCashPosition =
      monthlyReport.summary.totalContributions +
      monthlyReport.summary.totalAdvances +
      monthlyReport.summary.totalPayments -
      monthlyReport.summary.totalExpenses;

    // 4. Anomaly Detection (Factual flags requiring review)
    const anomalies: FinancialAnomaly[] = [];

    // Check for large individual expenses (> 2x daily average)
    const daysInPeriod = 30;
    const avgDailyExpense = monthlyReport.summary.totalExpenses / daysInPeriod;
    const highExpenseThreshold = Math.max(2000, avgDailyExpense * 2);

    const expenses = await prisma.expense.findMany({
      where: {
        messId,
        billingPeriod: periodKey,
        amount: { gt: highExpenseThreshold },
      },
      take: 5,
    });

    expenses.forEach((e) => {
      anomalies.push({
        id: `exp-${e.id}`,
        type: 'LARGE_TRANSACTION',
        severity: 'MEDIUM',
        title: `High Expense: ${e.category}`,
        description: `Expense of ৳${Number(e.amount).toFixed(2)} for "${e.description}" exceeds standard threshold.`,
        amount: Number(e.amount),
        entityId: e.id,
        entityType: 'EXPENSE',
      });
    });

    // Check for members with heavy deficits (> ৳3,000)
    memberBalances.forEach((mb: MemberBalanceReport) => {
      if (mb.netBalance < -3000) {
        anomalies.push({
          id: `def-${mb.memberId}`,
          type: 'BALANCE_DEFICIT',
          severity: 'HIGH',
          title: `Large Outstanding Due: ${mb.memberName}`,
          description: `Member has an outstanding deficit of ৳${Math.abs(mb.netBalance).toFixed(2)}.`,
          amount: Math.abs(mb.netBalance),
          entityId: mb.memberId,
          entityType: 'MEMBER',
        });
      }
    });

    // 5. Automated Factual Insights
    const insights: AnalyticalInsight[] = [];

    if (monthlyReport.comparison.hasPrevious) {
      const expDelta = monthlyReport.comparison.totalExpensesDeltaPercent;
      insights.push({
        id: 'ins-exp',
        category: 'EXPENSE',
        text: `Total monthly expenses changed by ${expDelta >= 0 ? '+' : ''}${expDelta.toFixed(1)}% compared to ${monthlyReport.comparison.prevPeriodKey}.`,
        trend: expDelta > 0 ? 'UP' : expDelta < 0 ? 'DOWN' : 'NEUTRAL',
        deltaPercent: expDelta,
      });

      const mealDelta = monthlyReport.comparison.mealRateDeltaPercent;
      insights.push({
        id: 'ins-meal',
        category: 'MEAL',
        text: `Meal rate is ৳${monthlyReport.summary.mealRate.toFixed(2)}, a ${mealDelta >= 0 ? '+' : ''}${mealDelta.toFixed(1)}% shift from previous month.`,
        trend: mealDelta > 0 ? 'UP' : mealDelta < 0 ? 'DOWN' : 'NEUTRAL',
        deltaPercent: mealDelta,
      });
    } else {
      insights.push({
        id: 'ins-first',
        category: 'EXPENSE',
        text: `Baseline financial period established for ${periodKey}.`,
        trend: 'NEUTRAL',
      });
    }

    if (settlementReport.summary.isFullySettled) {
      insights.push({
        id: 'ins-settle',
        category: 'CASH_FLOW',
        text: 'All member settlement transfers have been completed for this period.',
        trend: 'NEUTRAL',
      });
    } else {
      insights.push({
        id: 'ins-settle-pending',
        category: 'CASH_FLOW',
        text: `৳${settlementReport.summary.remainingAmount.toFixed(2)} remains to be settled across members.`,
        trend: 'DOWN',
      });
    }

    return {
      periodKey,
      periodStatus: period.status,
      summary: {
        totalIncome: monthlyReport.summary.totalContributions + monthlyReport.summary.totalAdvances + monthlyReport.summary.totalPayments,
        totalExpenses: monthlyReport.summary.totalExpenses,
        totalMarketCost: monthlyReport.summary.foodCost,
        totalMeals: monthlyReport.summary.totalMeals,
        mealRate: monthlyReport.summary.mealRate,
        fixedCosts: monthlyReport.summary.fixedCosts,
        variableCosts: monthlyReport.summary.variableCosts,
        outstandingReceivables: totalMemberDue,
        outstandingPayables: totalMemberCredit,
        totalMemberDue,
        totalMemberCredit,
        currentCashPosition,
        pendingSettlementAmount: settlementReport.summary.remainingAmount,
        activeMembersCount: monthlyReport.summary.activeMembersCount,
      },
      expenseBreakdown: monthlyReport.expenseBreakdown,
      anomalies,
      insights,
    };
  }

  /**
   * Cash Flow Statement: Opening Balance + Inflows - Outflows = Closing Balance
   */
  static async getCashFlowReport(messId: string, periodKey: string) {
    const period = await PeriodService.getPeriodByKey(messId, periodKey);
    if (!period) {
      throw new NotFoundError(`Financial period ${periodKey} not found.`);
    }

    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);

    // Inflows
    const [bazarContributions, advanceDeposits, settlementPayments] = await Promise.all([
      prisma.bazarEntry.findMany({
        where: { messId, date: { gte: startDate, lte: endDate } },
      }),
      prisma.advanceDeposit.findMany({
        where: { messId, date: { gte: startDate, lte: endDate } },
      }),
      prisma.settlementPayment.findMany({
        where: {
          settlementItem: { plan: { messId } },
          createdAt: { gte: startDate, lte: endDate },
          status: 'CONFIRMED',
        },
      }),
    ]);

    const totalBazarInflow = bazarContributions.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalAdvanceInflow = advanceDeposits.reduce((sum, a) => sum + Number(a.amount), 0);
    const totalSettlementInflow = settlementPayments.reduce((sum, s) => sum + Number(s.amount), 0);
    const totalInflow = totalBazarInflow + totalAdvanceInflow + totalSettlementInflow;

    // Outflows (Itemized by category)
    const expenses = await prisma.expense.findMany({
      where: { messId, date: { gte: startDate, lte: endDate }, status: 'APPROVED' },
    });

    const utilities = await prisma.utilityBill.findMany({
      where: { messId, billingPeriod: periodKey, isPosted: true },
    });

    let marketOutflow = 0;
    let rentOutflow = 0;
    let utilitiesOutflow = 0;
    let salaryOutflow = 0;
    let otherOutflow = 0;

    expenses.forEach((e) => {
      const amt = Number(e.amount);
      const cat = (e.category || '').toUpperCase();
      if (cat === 'FOOD' || cat === 'BAZAR' || cat === 'MARKET') {
        marketOutflow += amt;
      } else if (cat.includes('RENT')) {
        rentOutflow += amt;
      } else if (cat.includes('SALARY') || cat.includes('MAID')) {
        salaryOutflow += amt;
      } else {
        otherOutflow += amt;
      }
    });

    utilities.forEach((u) => {
      const amt = Number(u.amount);
      const cat = (u.category || '').toUpperCase();
      if (cat.includes('RENT')) {
        rentOutflow += amt;
      } else if (cat.includes('MAID') || cat.includes('SALARY')) {
        salaryOutflow += amt;
      } else {
        utilitiesOutflow += amt;
      }
    });

    const totalOutflow = marketOutflow + rentOutflow + utilitiesOutflow + salaryOutflow + otherOutflow;

    // Opening balance from previous period snapshot if available, else 0
    let openingBalance = 0;
    const prevPeriod = await prisma.financialPeriod.findFirst({
      where: { messId, endDate: { lt: startDate } },
      orderBy: { endDate: 'desc' },
      include: { snapshot: true },
    });

    if (prevPeriod?.snapshot) {
      openingBalance =
        Number(prevPeriod.snapshot.totalContributions) +
        Number(prevPeriod.snapshot.totalAdvances) +
        Number(prevPeriod.snapshot.totalPayments) -
        Number(prevPeriod.snapshot.totalExpenses);
    }

    const netCashFlow = totalInflow - totalOutflow;
    const closingBalance = openingBalance + netCashFlow;

    return {
      periodKey,
      periodStatus: period.status,
      openingBalance,
      inflows: {
        bazarContributions: totalBazarInflow,
        advanceDeposits: totalAdvanceInflow,
        settlementPayments: totalSettlementInflow,
        totalInflow,
      },
      outflows: {
        market: marketOutflow,
        rent: rentOutflow,
        utilities: utilitiesOutflow,
        salary: salaryOutflow,
        other: otherOutflow,
        totalOutflow,
      },
      netCashFlow,
      closingBalance,
      isReconciled: Math.abs((openingBalance + totalInflow - totalOutflow) - closingBalance) < 0.01,
    };
  }

  /**
   * Fixed vs Variable Cost Structure Analytics
   */
  static async getCostStructureReport(messId: string, periodKey: string) {
    const monthlyReport = await MonthlyReportService.getMonthlyReport(messId, periodKey);

    const fixed = monthlyReport.summary.fixedCosts;
    const variable = monthlyReport.summary.variableCosts + monthlyReport.summary.foodCost;
    const total = fixed + variable;

    const fixedPercent = total > 0 ? (fixed / total) * 100 : 0;
    const variablePercent = total > 0 ? (variable / total) * 100 : 0;

    return {
      periodKey,
      periodStatus: monthlyReport.periodStatus,
      totalCost: total,
      fixedCost: {
        amount: fixed,
        percentage: Number(fixedPercent.toFixed(1)),
      },
      variableCost: {
        amount: variable,
        percentage: Number(variablePercent.toFixed(1)),
      },
      categoryBreakdown: monthlyReport.expenseBreakdown,
    };
  }

  /**
   * Utility Analytics: Trend and cost behavior across recurring and meter-based utilities.
   */
  static async getUtilityAnalytics(messId: string, periodKey: string) {
    const utilities = await prisma.utilityBill.findMany({
      where: { messId, billingPeriod: periodKey },
      include: { allocations: true },
    });

    const categoryStats: Record<string, { total: number; count: number; bills: any[] }> = {};

    utilities.forEach((u) => {
      const cat = u.category.toUpperCase();
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, count: 0, bills: [] };
      }
      const amt = Number(u.amount);
      categoryStats[cat].total += amt;
      categoryStats[cat].count += 1;
      categoryStats[cat].bills.push({
        id: u.id,
        title: u.title,
        amount: amt,
        billType: u.billType,
        status: u.status,
      });
    });

    const categories = Object.keys(categoryStats).map((cat) => ({
      category: cat,
      totalAmount: categoryStats[cat].total,
      count: categoryStats[cat].count,
      average: categoryStats[cat].count > 0 ? categoryStats[cat].total / categoryStats[cat].count : 0,
      bills: categoryStats[cat].bills,
    }));

    const totalUtilityCost = categories.reduce((sum, c) => sum + c.totalAmount, 0);

    return {
      periodKey,
      totalUtilityCost,
      categoryCount: categories.length,
      categories,
    };
  }

  /**
   * Daily Trends: Correlation between daily meals, food purchases, and payments.
   */
  static async getDailyTrends(messId: string, periodKey: string) {
    const period = await PeriodService.getPeriodByKey(messId, periodKey);
    if (!period) {
      throw new NotFoundError(`Financial period ${periodKey} not found.`);
    }

    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);

    const [meals, expenses, bazars] = await Promise.all([
      prisma.meal.findMany({
        where: { messId, date: { gte: startDate, lte: endDate } },
      }),
      prisma.expense.findMany({
        where: { messId, date: { gte: startDate, lte: endDate }, status: 'APPROVED' },
      }),
      prisma.bazarEntry.findMany({
        where: { messId, date: { gte: startDate, lte: endDate } },
      }),
    ]);

    const dailyMap: Record<string, { date: string; meals: number; marketCost: number; otherCost: number }> = {};

    meals.forEach((m) => {
      const dateStr = m.date.toISOString().slice(0, 10);
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, meals: 0, marketCost: 0, otherCost: 0 };
      const dayMeals =
        Number(m.breakfast) +
        Number(m.lunch) +
        Number(m.dinner) +
        Number(m.guestBreakfast) +
        Number(m.guestLunch) +
        Number(m.guestDinner);
      dailyMap[dateStr].meals += dayMeals;
    });

    bazars.forEach((b) => {
      const dateStr = b.date.toISOString().slice(0, 10);
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, meals: 0, marketCost: 0, otherCost: 0 };
      dailyMap[dateStr].marketCost += Number(b.amount);
    });

    expenses.forEach((e) => {
      const dateStr = e.date.toISOString().slice(0, 10);
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, meals: 0, marketCost: 0, otherCost: 0 };
      const cat = (e.category || '').toUpperCase();
      if (cat === 'FOOD' || cat === 'BAZAR' || cat === 'MARKET') {
        dailyMap[dateStr].marketCost += Number(e.amount);
      } else {
        dailyMap[dateStr].otherCost += Number(e.amount);
      }
    });

    const days = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      periodKey,
      totalDaysRecorded: days.length,
      days,
    };
  }

  /**
   * Member Cost Comparison: Non-judgmental side-by-side consumption matrix.
   */
  static async getMemberComparison(messId: string, periodKey: string) {
    const [balanceReport, mealReport] = await Promise.all([
      BalanceService.calculateMessBalances(messId, periodKey),
      MealReportService.getFoodCostReport(messId, periodKey),
    ]);

    const mealMap = new Map(mealReport.members.map((m: any) => [m.memberId, m.meals]));

    const members = balanceReport.memberBalances.map((mb: MemberBalanceReport) => {
      const meals = mealMap.get(mb.memberId) || 0;
      return {
        memberId: mb.memberId,
        memberName: mb.memberName,
        roomNo: mb.roomNo || 'N/A',
        role: mb.role,
        mealsConsumed: meals,
        foodShare: mb.foodShare,
        fixedShare: mb.rentShare + mb.utilityShare,
        variableShare: mb.variableShare,
        totalObligations: mb.totalCharges,
        totalContributions: mb.totalContributions,
        netBalance: mb.netBalance,
        status: mb.status,
      };
    });

    return {
      periodKey,
      memberCount: members.length,
      members,
    };
  }
}
