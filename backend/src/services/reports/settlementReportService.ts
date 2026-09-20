import { SettlementService } from '../financial/settlementService.js';
import { BalanceService } from '../financial/balanceService.js';
import { PeriodService } from '../period/periodService.js';
import { MemberService } from '../memberService.js';
import { RoundingService } from '../financial/roundingService.js';

export interface SettlementReportDTO {
  periodKey: string;
  periodStatus: string;
  summary: {
    totalOwedAmount: number;
    totalReceivableAmount: number;
    totalSettledAmount: number;
    remainingAmount: number;
    isFullySettled: boolean;
  };
  memberSummaries: Array<{
    memberId: string;
    name: string;
    roomNo: string;
    totalOwed: number;
    totalReceivable: number;
    paid: number;
    remaining: number;
    status: 'SETTLED' | 'PARTIALLY_PAID' | 'PENDING';
  }>;
  transactions: Array<{
    id: string;
    payerName: string;
    receiverName: string;
    amount: number;
    settledAmount: number;
    status: string;
    paymentMethod?: string;
  }>;
  generatedAt: string;
}

export class SettlementReportService {
  /**
   * Generates monthly settlement and payment reconciliation report
   */
  static async getSettlementReport(
    messId: string,
    periodKey: string,
    precomputedBalances?: any
  ): Promise<SettlementReportDTO> {
    const period = await PeriodService.getPeriodByKey(messId, periodKey);
    const periodStatus = period ? period.status : 'ACTIVE';

    const members = await MemberService.listMembers(messId);
    const memberMap = new Map<string, any>(members.map((m: any) => [m.id, m]));

    const messBalances = precomputedBalances || (await BalanceService.calculateMessBalances(messId, periodKey));
    const balances = messBalances.memberBalances;
    const settlementPlan = await SettlementService.getSettlementPlan(messId, periodKey);

    const transactions = settlementPlan
      ? settlementPlan.items.map((item, idx) => ({
          id: item.id || `item-${idx}`,
          payerName: item.payerName,
          receiverName: item.receiverName,
          amount: item.amount,
          settledAmount: item.settledAmount,
          status: String(item.status),
        }))
      : [];

    let totalOwed = 0;
    let totalReceivable = 0;
    let totalSettled = settlementPlan
      ? settlementPlan.items.reduce((acc, it) => acc + (it.settledAmount || 0), 0)
      : 0;

    const memberSummaries = balances.map((b: any) => {
      const m = memberMap.get(b.memberId);
      const owes = b.netBalance < -0.01 ? Math.abs(b.netBalance) : 0;
      const receives = b.netBalance > 0.01 ? b.netBalance : 0;

      totalOwed = RoundingService.roundCurrency(totalOwed + owes);
      totalReceivable = RoundingService.roundCurrency(totalReceivable + receives);

      // Find settled amount for this member as payer
      let memberSettledPaid = 0;
      if (settlementPlan) {
        for (const item of settlementPlan.items) {
          if (item.payerMemberId === b.memberId) {
            memberSettledPaid = RoundingService.roundCurrency(memberSettledPaid + item.settledAmount);
          }
        }
      }

      const remaining = Math.max(0, RoundingService.roundCurrency(owes - memberSettledPaid));
      let status: 'SETTLED' | 'PARTIALLY_PAID' | 'PENDING' = 'SETTLED';

      if (owes > 0) {
        if (remaining <= 0.01) {
          status = 'SETTLED';
        } else if (memberSettledPaid > 0) {
          status = 'PARTIALLY_PAID';
        } else {
          status = 'PENDING';
        }
      }

      return {
        memberId: b.memberId,
        name: b.memberName,
        roomNo: m?.roomNo || 'N/A',
        totalOwed: owes,
        totalReceivable: receives,
        paid: memberSettledPaid,
        remaining,
        status,
      };
    });

    const remainingAmount = Math.max(0, RoundingService.roundCurrency(totalOwed - totalSettled));

    return {
      periodKey,
      periodStatus,
      summary: {
        totalOwedAmount: totalOwed,
        totalReceivableAmount: totalReceivable,
        totalSettledAmount: totalSettled,
        remainingAmount,
        isFullySettled: remainingAmount <= 0.01,
      },
      memberSummaries,
      transactions,
      generatedAt: new Date().toISOString(),
    };
  }
}
