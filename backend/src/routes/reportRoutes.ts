import { Router, Request, Response, NextFunction } from 'express';
import { MonthlyReportService } from '../services/reports/monthlyReportService.js';
import { MemberStatementService } from '../services/reports/memberStatementService.js';
import { MealReportService } from '../services/reports/mealReportService.js';
import { SettlementReportService } from '../services/reports/settlementReportService.js';
import { AnalyticsService } from '../services/reports/analyticsService.js';
import { ExportService, ReportExportType } from '../services/reports/exportService.js';
import { ExpenseService } from '../services/expenseService.js';
import { PeriodService } from '../services/period/periodService.js';
import { BadRequestError, ForbiddenError } from '../utils/errors.js';
import { prisma } from '../config/database.js';

export const reportRouter = Router({ mergeParams: true });

/**
 * Helper to extract or default periodKey
 */
async function resolvePeriodKey(messId: string, reqPeriodKey?: string): Promise<string> {
  if (reqPeriodKey) return reqPeriodKey;
  const current = await PeriodService.getOrCreateCurrentPeriod(messId);
  return current.periodKey;
}

/**
 * GET /api/v1/messes/:messId/reports/executive
 * Executive Financial Dashboard with KPI summary, anomalies, and insights
 */
reportRouter.get('/executive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const data = await AnalyticsService.getExecutiveDashboard(messId, periodKey);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/cash-flow
 * Reconciled Cash Flow Statement: Opening + Inflows - Outflows = Closing
 */
reportRouter.get('/cash-flow', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const data = await AnalyticsService.getCashFlowReport(messId, periodKey);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/cost-structure
 * Fixed vs Variable cost analytics and percentage share
 */
reportRouter.get('/cost-structure', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const data = await AnalyticsService.getCostStructureReport(messId, periodKey);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/utilities
 * Recurring and meter-based utility analytics
 */
reportRouter.get('/utilities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const data = await AnalyticsService.getUtilityAnalytics(messId, periodKey);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/daily-trends
 * Daily meal consumption and market expense rhythm
 */
reportRouter.get('/daily-trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const data = await AnalyticsService.getDailyTrends(messId, periodKey);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/member-comparison
 * Non-judgmental side-by-side consumption matrix
 */
reportRouter.get('/member-comparison', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const data = await AnalyticsService.getMemberComparison(messId, periodKey);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/monthly
 * Comprehensive monthly financial report with previous month comparison
 */
reportRouter.get('/monthly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const report = await MonthlyReportService.getMonthlyReport(messId, periodKey);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/statement
 * Mess-level monthly financial statement
 */
reportRouter.get('/statement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const report = await MonthlyReportService.getMonthlyReport(messId, periodKey);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/members/:memberId/statement
 * Individual member statement (scoped: member can only inspect self unless manager/treasurer/auditor)
 */
reportRouter.get('/members/:memberId/statement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messId, memberId } = req.params;
    const user = (req as any).user;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);

    const statement = await MemberStatementService.getMemberStatement(
      messId,
      memberId,
      periodKey,
      user ? { userId: user.userId, role: user.role } : undefined
    );

    res.json({ success: true, data: statement });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/meals
 * Food cost & meal consumption breakdown
 */
reportRouter.get('/meals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const report = await MealReportService.getFoodCostReport(messId, periodKey);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/settlements
 * Monthly settlement reconciliation report
 */
reportRouter.get('/settlements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const report = await SettlementReportService.getSettlementReport(messId, periodKey);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/expenses
 * Itemized categorized expenses for the period
 */
reportRouter.get('/expenses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const allExpenses = await ExpenseService.listExpenses(messId);

    const periodExpenses = allExpenses.filter((e: any) => {
      if (!e.date) return true;
      const d = new Date(e.date);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      return `${y}-${String(m).padStart(2, '0')}` === periodKey;
    });

    res.json({ success: true, data: periodExpenses });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/fixed-bills
 * Itemized fixed and recurring bills for the period
 */
reportRouter.get('/fixed-bills', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const bills = await prisma.bill.findMany({
      where: { messId, billingPeriod: periodKey },
      include: { paidBy: { include: { user: { select: { name: true } } } } },
      orderBy: { dueDate: 'asc' },
    });
    const totalAmount = bills.reduce((sum, b) => sum + Number(b.amount), 0);
    const paidAmount = bills.filter((b) => b.status === 'PAID').reduce((sum, b) => sum + Number(b.amount), 0);
    const pendingAmount = totalAmount - paidAmount;

    res.json({
      success: true,
      data: {
        periodKey,
        summary: { totalAmount, paidAmount, pendingAmount, totalCount: bills.length },
        bills: bills.map((b) => ({
          id: b.id,
          name: b.name,
          category: b.category,
          amount: Number(b.amount),
          dueDate: b.dueDate,
          paidAt: b.paidAt,
          status: b.status,
          paidByName: b.paidBy?.user?.name || null,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/bazar-summary
 * Itemized market expense and shopper logs for the period
 */
reportRouter.get('/bazar-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const entries = await prisma.bazarEntry.findMany({
      where: { messId },
      include: {
        buyer: { include: { user: { select: { name: true } } } },
        items: true,
      },
      orderBy: { date: 'asc' },
    });
    const periodEntries = entries.filter((e) => {
      const d = new Date(e.date);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      return `${y}-${String(m).padStart(2, '0')}` === periodKey;
    });
    const totalCost = periodEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalItems = periodEntries.reduce((sum, e) => sum + e.items.length, 0);

    const shopperTotals: Record<string, { name: string; total: number; count: number }> = {};
    for (const entry of periodEntries) {
      const name = entry.buyer?.user?.name || 'General';
      if (!shopperTotals[name]) shopperTotals[name] = { name, total: 0, count: 0 };
      shopperTotals[name].total += Number(entry.amount);
      shopperTotals[name].count += 1;
    }

    res.json({
      success: true,
      data: {
        periodKey,
        summary: {
          totalCost,
          totalTrips: periodEntries.length,
          totalItems,
          averagePerTrip: periodEntries.length > 0 ? totalCost / periodEntries.length : 0,
        },
        shopperBreakdown: Object.values(shopperTotals),
        entries: periodEntries.map((e) => ({
          id: e.id,
          date: e.date,
          shopperName: e.buyer?.user?.name || 'General',
          totalCost: Number(e.amount),
          itemCount: e.items.length,
          itemsSummary: e.itemsSummary,
          items: e.items.map((i: any) => ({
            id: i.id,
            name: i.name,
            quantity: Number(i.quantity),
            unit: i.unit,
            totalAmount: Number(i.totalAmount),
          })),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/ledger
 * Complete shared ledger journal and audit reconciliation
 */
reportRouter.get('/ledger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const entries = await prisma.ledgerEntry.findMany({
      where: { messId },
      include: {
        member: { include: { user: { select: { name: true } } } },
      },
      orderBy: { effectiveDate: 'asc' },
    });
    const periodEntries = entries.filter((e) => {
      const d = new Date(e.effectiveDate);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      return `${y}-${String(m).padStart(2, '0')}` === periodKey;
    });

    let totalCredits = 0;
    let totalDebits = 0;
    for (const e of periodEntries) {
      const amt = Number(e.amount);
      if (e.direction === 'CREDIT') totalCredits += amt;
      else if (e.direction === 'DEBIT') totalDebits += amt;
    }

    res.json({
      success: true,
      data: {
        periodKey,
        summary: {
          totalEntries: periodEntries.length,
          totalCredits,
          totalDebits,
          netFlow: totalCredits - totalDebits,
        },
        entries: periodEntries.map((e) => ({
          id: e.id,
          effectiveDate: e.effectiveDate,
          memberName: e.member?.user?.name || 'General',
          entryType: e.entryType,
          direction: e.direction,
          amount: Number(e.amount),
          balanceAfter: Number(e.balanceAfter),
          description: e.description,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/month-end
 * Month-end closing verification and financial snapshots
 */
reportRouter.get('/month-end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const period = await prisma.financialPeriod.findUnique({
      where: { messId_periodKey: { messId, periodKey } },
      include: { snapshot: true },
    });

    const liveReport = await MonthlyReportService.getMonthlyReport(messId, periodKey);

    res.json({
      success: true,
      data: {
        periodKey,
        status: period?.status || 'ACTIVE',
        snapshot: period?.snapshot
          ? {
              totalMeals: Number(period.snapshot.totalMeals),
              mealRate: Number(period.snapshot.mealRate),
              totalFoodCost: Number(period.snapshot.totalFoodCost),
              totalFixedExpenses: Number(period.snapshot.totalFixedExpenses),
              totalVariableExpenses: Number(period.snapshot.totalVariableExpenses),
              totalExpenses: Number(period.snapshot.totalExpenses),
              totalContributions: Number(period.snapshot.totalContributions),
              totalAdvances: Number(period.snapshot.totalAdvances),
              outstandingBalance: Number(period.snapshot.outstandingBalance),
              isReconciled: period.snapshot.isReconciled,
              createdAt: period.snapshot.createdAt,
            }
          : null,
        liveSummary: liveReport.summary,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/reports/export
 * Export report to formatted CSV
 */
reportRouter.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const type = ((req.query.type as string) || 'monthly') as ReportExportType;
    const periodKey = await resolvePeriodKey(messId, req.query.periodKey as string);
    const memberId = req.query.memberId as string | undefined;

    const { filename, csvContent } = await ExportService.exportToCsv(messId, type, periodKey, memberId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
});
