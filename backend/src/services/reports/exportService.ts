import { MonthlyReportService } from './monthlyReportService.js';
import { MemberStatementService } from './memberStatementService.js';
import { MealReportService } from './mealReportService.js';
import { SettlementReportService } from './settlementReportService.js';
import { AnalyticsService } from './analyticsService.js';
import { ExpenseService } from '../expenseService.js';
import { MessService } from '../messService.js';
import { BadRequestError } from '../../utils/errors.js';

import { prisma } from '../../config/database.js';

export type ReportExportType =
  | 'monthly'
  | 'statement'
  | 'meals'
  | 'expenses'
  | 'settlements'
  | 'executive'
  | 'cash-flow'
  | 'cost-structure'
  | 'utilities'
  | 'daily-trends'
  | 'member-comparison'
  | 'fixed-bills'
  | 'bazar-summary'
  | 'ledger'
  | 'month-end';

export class ExportService {
  /**
   * Generates formatted CSV string for reports and statements
   */
  static async exportToCsv(
    messId: string,
    reportType: ReportExportType,
    periodKey: string,
    memberId?: string
  ): Promise<{ filename: string; csvContent: string }> {
    const mess = await MessService.getMessById(messId);
    const messName = mess ? mess.name : 'Mess';
    const timestamp = new Date().toISOString();

    let title = '';
    let rows: string[] = [];

    switch (reportType) {
      case 'monthly': {
        title = `Monthly Financial Statement - ${periodKey}`;
        const data = await MonthlyReportService.getMonthlyReport(messId, periodKey);
        rows.push('Metric,Amount (BDT)');
        rows.push(`Total Expenses,${data.summary.totalExpenses.toFixed(2)}`);
        rows.push(`Food Cost,${data.summary.foodCost.toFixed(2)}`);
        rows.push(`Fixed Costs,${data.summary.fixedCosts.toFixed(2)}`);
        rows.push(`Variable Costs,${data.summary.variableCosts.toFixed(2)}`);
        rows.push(`Total Meals,${data.summary.totalMeals.toFixed(2)}`);
        rows.push(`Meal Rate,${data.summary.mealRate.toFixed(4)}`);
        rows.push(`Average Cost Per Member,${data.summary.averageCostPerMember.toFixed(2)}`);
        rows.push(`Total Contributions,${data.summary.totalContributions.toFixed(2)}`);
        rows.push(`Total Advances,${data.summary.totalAdvances.toFixed(2)}`);
        rows.push(`Total Payments,${data.summary.totalPayments.toFixed(2)}`);
        rows.push(`Outstanding Balance,${data.summary.outstandingAmount.toFixed(2)}`);
        rows.push('');
        rows.push('Expense Breakdown by Category');
        rows.push('Category,Amount (BDT),Percentage');
        for (const cat of data.expenseBreakdown) {
          rows.push(`"${cat.category}",${cat.amount.toFixed(2)},${cat.percentage.toFixed(1)}%`);
        }
        break;
      }

      case 'statement': {
        if (!memberId) {
          throw new BadRequestError('memberId is required to export an individual member statement.');
        }
        const data = await MemberStatementService.getMemberStatement(messId, memberId, periodKey);
        title = `Member Financial Statement - ${data.memberName} (${periodKey})`;
        rows.push(`Member Name,"${data.memberName}"`);
        rows.push(`Room,"${data.roomNo}"`);
        rows.push(`Status Badge,"${data.statusBadge.label}"`);
        rows.push('');
        rows.push('Summary Metric,Amount (BDT)');
        rows.push(`Opening Balance,${data.summary.openingBalance.toFixed(2)}`);
        rows.push(`Total Meals,${data.summary.totalMeals.toFixed(2)}`);
        rows.push(`Meal Rate,${data.summary.mealRate.toFixed(4)}`);
        rows.push(`Food Share,${data.summary.foodShare.toFixed(2)}`);
        rows.push(`Rent Share,${data.summary.rentShare.toFixed(2)}`);
        rows.push(`Utility Share,${data.summary.utilityShare.toFixed(2)}`);
        rows.push(`Other Shared Expenses,${data.summary.otherSharedExpenses.toFixed(2)}`);
        rows.push(`Total Obligations,${data.summary.totalObligations.toFixed(2)}`);
        rows.push(`Bazar Contributions,${data.summary.bazarContributions.toFixed(2)}`);
        rows.push(`Advance Deposits,${data.summary.advanceDeposits.toFixed(2)}`);
        rows.push(`Settlement Payments,${data.summary.settlementPayments.toFixed(2)}`);
        rows.push(`Adjustments,${data.summary.adjustments.toFixed(2)}`);
        rows.push(`Total Contributions,${data.summary.totalContributions.toFixed(2)}`);
        rows.push(`Closing Net Balance,${data.summary.closingBalance.toFixed(2)}`);
        rows.push('');
        rows.push('Transaction Ledger');
        rows.push('Date,Description,Reference,Type,Debit (BDT),Credit (BDT),Running Balance (BDT)');
        for (const tx of data.transactions) {
          rows.push(
            `"${tx.date}","${tx.description.replace(/"/g, '""')}","${tx.reference}","${tx.entryType}",${tx.debit !== null ? tx.debit.toFixed(2) : ''},${tx.credit !== null ? tx.credit.toFixed(2) : ''},${tx.runningBalance.toFixed(2)}`
          );
        }
        break;
      }

      case 'meals': {
        title = `Food Cost & Meal Consumption Report - ${periodKey}`;
        const data = await MealReportService.getFoodCostReport(messId, periodKey);
        rows.push(`Total Food Cost,${data.totalFoodCost.toFixed(2)}`);
        rows.push(`Total Meals,${data.totalMeals.toFixed(2)}`);
        rows.push(`Meal Rate,${data.mealRate.toFixed(4)}`);
        rows.push('');
        rows.push('Member Name,Room,Meals Consumed,Food Share (BDT)');
        for (const m of data.members) {
          rows.push(`"${m.name}","${m.roomNo}",${m.meals.toFixed(2)},${m.foodShare.toFixed(2)}`);
        }
        break;
      }

      case 'settlements': {
        title = `Settlement & Payment Reconciliation Report - ${periodKey}`;
        const data = await SettlementReportService.getSettlementReport(messId, periodKey);
        rows.push(`Total Owed,${data.summary.totalOwedAmount.toFixed(2)}`);
        rows.push(`Total Receivable,${data.summary.totalReceivableAmount.toFixed(2)}`);
        rows.push(`Total Settled,${data.summary.totalSettledAmount.toFixed(2)}`);
        rows.push(`Remaining Outstanding,${data.summary.remainingAmount.toFixed(2)}`);
        rows.push('');
        rows.push('Member,Room,Total Owed (BDT),Total Receivable (BDT),Paid (BDT),Remaining (BDT),Status');
        for (const ms of data.memberSummaries) {
          rows.push(
            `"${ms.name}","${ms.roomNo}",${ms.totalOwed.toFixed(2)},${ms.totalReceivable.toFixed(2)},${ms.paid.toFixed(2)},${ms.remaining.toFixed(2)},${ms.status}`
          );
        }
        break;
      }

      case 'expenses': {
        title = `Itemized Expense Report - ${periodKey}`;
        const expenses = await ExpenseService.listExpenses(messId);
        const periodExpenses = expenses.filter((e: any) => {
          if (!e.date) return true;
          const d = new Date(e.date);
          const y = d.getUTCFullYear();
          const m = d.getUTCMonth() + 1;
          return `${y}-${String(m).padStart(2, '0')}` === periodKey;
        });
        rows.push('Date,Description,Category,Type,Amount (BDT),Paid By,Status');
        for (const exp of periodExpenses) {
          rows.push(
            `"${exp.date ? exp.date.slice(0, 10) : ''}","${(exp.description || '').replace(/"/g, '""')}","${exp.category}","${exp.type}",${exp.amount.toFixed(2)},"${exp.payerMemberId || ''}","${exp.status}"`
          );
        }
        break;
      }

      case 'executive': {
        title = `Executive Financial Summary - ${periodKey}`;
        const data = await AnalyticsService.getExecutiveDashboard(messId, periodKey);
        rows.push('Metric,Value (BDT)');
        rows.push(`Total Income,${data.summary.totalIncome.toFixed(2)}`);
        rows.push(`Total Expenses,${data.summary.totalExpenses.toFixed(2)}`);
        rows.push(`Market & Food Cost,${data.summary.totalMarketCost.toFixed(2)}`);
        rows.push(`Fixed Costs,${data.summary.fixedCosts.toFixed(2)}`);
        rows.push(`Variable Costs,${data.summary.variableCosts.toFixed(2)}`);
        rows.push(`Total Meals Counted,${data.summary.totalMeals.toFixed(1)}`);
        rows.push(`Meal Rate,${data.summary.mealRate.toFixed(4)}`);
        rows.push(`Outstanding Receivables (Dues),${data.summary.outstandingReceivables.toFixed(2)}`);
        rows.push(`Outstanding Payables (Credits),${data.summary.outstandingPayables.toFixed(2)}`);
        rows.push(`Current Cash Position,${data.summary.currentCashPosition.toFixed(2)}`);
        rows.push(`Pending Settlement Pool,${data.summary.pendingSettlementAmount.toFixed(2)}`);
        rows.push('');
        rows.push('Key Analytical Insights');
        for (const ins of data.insights) {
          rows.push(`"${ins.category}","${ins.text.replace(/"/g, '""')}"`);
        }
        break;
      }

      case 'cash-flow': {
        title = `Cash Flow Statement - ${periodKey}`;
        const data = await AnalyticsService.getCashFlowReport(messId, periodKey);
        rows.push('Category,Amount (BDT)');
        rows.push(`Opening Balance,${data.openingBalance.toFixed(2)}`);
        rows.push('');
        rows.push('--- CASH INFLOWS ---');
        rows.push(`Bazar Contributions,${data.inflows.bazarContributions.toFixed(2)}`);
        rows.push(`Advance Deposits,${data.inflows.advanceDeposits.toFixed(2)}`);
        rows.push(`Settlement Payments,${data.inflows.settlementPayments.toFixed(2)}`);
        rows.push(`Total Cash Inflow,${data.inflows.totalInflow.toFixed(2)}`);
        rows.push('');
        rows.push('--- CASH OUTFLOWS ---');
        rows.push(`Market Expenses,${data.outflows.market.toFixed(2)}`);
        rows.push(`House Rent,${data.outflows.rent.toFixed(2)}`);
        rows.push(`Utilities (Electricity/Gas/Water/WiFi),${data.outflows.utilities.toFixed(2)}`);
        rows.push(`Staff & Maid Salaries,${data.outflows.salary.toFixed(2)}`);
        rows.push(`Other Expenses,${data.outflows.other.toFixed(2)}`);
        rows.push(`Total Cash Outflow,${data.outflows.totalOutflow.toFixed(2)}`);
        rows.push('');
        rows.push(`Net Cash Flow,${data.netCashFlow.toFixed(2)}`);
        rows.push(`Closing Balance,${data.closingBalance.toFixed(2)}`);
        break;
      }

      case 'cost-structure': {
        title = `Cost Structure Breakdown - ${periodKey}`;
        const data = await AnalyticsService.getCostStructureReport(messId, periodKey);
        rows.push('Type,Amount (BDT),Percentage');
        rows.push(`Fixed Costs,${data.fixedCost.amount.toFixed(2)},${data.fixedCost.percentage}%`);
        rows.push(`Variable Costs,${data.variableCost.amount.toFixed(2)},${data.variableCost.percentage}%`);
        rows.push(`Total Expenditure,${data.totalCost.toFixed(2)},100.0%`);
        rows.push('');
        rows.push('Category Breakdown');
        rows.push('Category,Amount (BDT),Share');
        for (const cat of data.categoryBreakdown) {
          rows.push(`"${cat.category}",${cat.amount.toFixed(2)},${cat.percentage.toFixed(1)}%`);
        }
        break;
      }

      case 'utilities': {
        title = `Utility & Recurring Cost Analytics - ${periodKey}`;
        const data = await AnalyticsService.getUtilityAnalytics(messId, periodKey);
        rows.push(`Total Utility Expenditure,${data.totalUtilityCost.toFixed(2)}`);
        rows.push('');
        rows.push('Category,Total (BDT),Bills Count,Average (BDT)');
        for (const c of data.categories) {
          rows.push(`"${c.category}",${c.totalAmount.toFixed(2)},${c.count},${c.average.toFixed(2)}`);
        }
        break;
      }

      case 'daily-trends': {
        title = `Daily Activity Trends - ${periodKey}`;
        const data = await AnalyticsService.getDailyTrends(messId, periodKey);
        rows.push('Date,Meals Counted,Market Expense (BDT),Other Expenses (BDT)');
        for (const d of data.days) {
          rows.push(`"${d.date}",${d.meals.toFixed(1)},${d.marketCost.toFixed(2)},${d.otherCost.toFixed(2)}`);
        }
        break;
      }

      case 'member-comparison': {
        title = `Member Consumption & Cost Comparison - ${periodKey}`;
        const data = await AnalyticsService.getMemberComparison(messId, periodKey);
        rows.push('Member Name,Room,Role,Meals,Food Cost (BDT),Fixed Share (BDT),Variable Share (BDT),Total Cost (BDT),Contributions (BDT),Net Balance (BDT),Status');
        for (const m of data.members) {
          rows.push(
            `"${m.memberName}","${m.roomNo}","${m.role}",${m.mealsConsumed.toFixed(1)},${m.foodShare.toFixed(2)},${m.fixedShare.toFixed(2)},${m.variableShare.toFixed(2)},${m.totalObligations.toFixed(2)},${m.totalContributions.toFixed(2)},${m.netBalance.toFixed(2)},"${m.status}"`
          );
        }
        break;
      }

      case 'fixed-bills': {
        title = `Fixed & Recurring Bills Report - ${periodKey}`;
        const bills = await prisma.bill.findMany({
          where: { messId, billingPeriod: periodKey },
          include: { paidBy: { include: { user: { select: { name: true } } } } },
          orderBy: { dueDate: 'asc' },
        });
        rows.push('Bill Name,Category,Amount (BDT),Due Date,Status,Paid By,Payment Method');
        let total = 0;
        for (const b of bills) {
          const amt = Number(b.amount);
          total += amt;
          rows.push(
            `"${b.name.replace(/"/g, '""')}","${b.category}",${amt.toFixed(2)},"${b.dueDate.toISOString().slice(0, 10)}","${b.status}","${b.paidBy?.user?.name || ''}","${b.paymentMethod || ''}"`
          );
        }
        rows.push('');
        rows.push(`Total Fixed Bills,${total.toFixed(2)}`);
        break;
      }

      case 'bazar-summary': {
        title = `Bazar & Market Purchases Report - ${periodKey}`;
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
        rows.push('Date,Buyer,Description,Amount (BDT),Payment Method,Items Summary');
        let total = 0;
        for (const e of periodEntries) {
          const amt = Number(e.amount);
          total += amt;
          rows.push(
            `"${e.date.toISOString().slice(0, 10)}","${e.buyer?.user?.name || ''}","${(e.description || '').replace(/"/g, '""')}",${amt.toFixed(2)},"${e.paymentMethod || 'CASH'}","${(e.itemsSummary || '').replace(/"/g, '""')}"`
          );
        }
        rows.push('');
        rows.push(`Total Bazar Expense,${total.toFixed(2)}`);
        break;
      }

      case 'ledger': {
        title = `Shared Ledger Audit Statement - ${periodKey}`;
        const entries = await prisma.ledgerEntry.findMany({
          where: { messId },
          include: { member: { include: { user: { select: { name: true } } } } },
          orderBy: { effectiveDate: 'asc' },
        });
        const periodEntries = entries.filter((e) => {
          const d = new Date(e.effectiveDate);
          const y = d.getUTCFullYear();
          const m = d.getUTCMonth() + 1;
          return `${y}-${String(m).padStart(2, '0')}` === periodKey;
        });
        rows.push('Effective Date,Member,Entry Type,Direction,Amount (BDT),Balance After (BDT),Description');
        for (const e of periodEntries) {
          rows.push(
            `"${e.effectiveDate.toISOString().slice(0, 10)}","${e.member?.user?.name || ''}","${e.entryType}","${e.direction}",${Number(e.amount).toFixed(2)},${Number(e.balanceAfter).toFixed(2)},"${(e.description || '').replace(/"/g, '""')}"`
          );
        }
        break;
      }

      case 'month-end': {
        title = `Month-End Financial Summary Snapshot - ${periodKey}`;
        const period = await prisma.financialPeriod.findUnique({
          where: { messId_periodKey: { messId, periodKey } },
          include: { snapshot: true },
        });
        if (period && period.snapshot) {
          const s = period.snapshot;
          rows.push('Metric,Value');
          rows.push(`Period Status,"${period.status}"`);
          rows.push(`Total Meals,${Number(s.totalMeals).toFixed(2)}`);
          rows.push(`Meal Rate,${Number(s.mealRate).toFixed(4)}`);
          rows.push(`Total Food Cost (BDT),${Number(s.totalFoodCost).toFixed(2)}`);
          rows.push(`Total Fixed Expenses (BDT),${Number(s.totalFixedExpenses).toFixed(2)}`);
          rows.push(`Total Variable Expenses (BDT),${Number(s.totalVariableExpenses).toFixed(2)}`);
          rows.push(`Total Expenses (BDT),${Number(s.totalExpenses).toFixed(2)}`);
          rows.push(`Total Contributions (BDT),${Number(s.totalContributions).toFixed(2)}`);
          rows.push(`Total Advances (BDT),${Number(s.totalAdvances).toFixed(2)}`);
          rows.push(`Outstanding Balance (BDT),${Number(s.outstandingBalance).toFixed(2)}`);
          rows.push(`Ledger Reconciled,"${s.isReconciled ? 'Yes' : 'No'}"`);
        } else {
          rows.push(`Period Key,${periodKey}`);
          rows.push('Status,Snapshot not yet finalized');
        }
        break;
      }

      default:
        throw new BadRequestError(`Unsupported report type: ${reportType}`);
    }

    const header = [
      `# MessMate Financial Export`,
      `# Mess: ${messName}`,
      `# Report: ${title}`,
      `# Period: ${periodKey}`,
      `# Generated: ${timestamp}`,
      '',
    ].join('\r\n');

    const csvContent = header + rows.join('\r\n');
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const filename = `${safeTitle}_${periodKey}.csv`;

    return { filename, csvContent };
  }
}
