import { PeriodService } from '../period/periodService.js';
import { SnapshotService } from '../period/snapshotService.js';
import { MealRateService } from '../financial/mealRateService.js';
import { BalanceService, MemberBalanceReport } from '../financial/balanceService.js';
import { LedgerService, LedgerEntryDTO } from '../financial/ledgerService.js';
import { MemberService } from '../memberService.js';
import { RoundingService } from '../financial/roundingService.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';

export interface StatementTransactionRow {
  id: string;
  date: string;
  description: string;
  reference: string;
  entryType: string;
  debit: number | null;
  credit: number | null;
  runningBalance: number;
}

export interface MemberStatementDTO {
  memberId: string;
  memberName: string;
  roomNo: string;
  role: string;
  periodKey: string;
  periodStatus: string;
  statusBadge: {
    status: 'OWES' | 'RECEIVES' | 'SETTLED';
    label: string;
    amount: number;
  };
  summary: {
    openingBalance: number;
    totalMeals: number;
    mealRate: number;
    foodShare: number;
    rentShare: number;
    utilityShare: number;
    otherSharedExpenses: number;
    totalObligations: number;
    bazarContributions: number;
    advanceDeposits: number;
    settlementPayments: number;
    adjustments: number;
    totalContributions: number;
    closingBalance: number; // Net balance
  };
  transactions: StatementTransactionRow[];
  generatedAt: string;
}

export class MemberStatementService {
  /**
   * Generate an itemized, professional member financial statement
   */
  static async getMemberStatement(
    messId: string,
    memberId: string,
    periodKey: string,
    requestingUser?: { userId: string; role: string }
  ): Promise<MemberStatementDTO> {
    // 1. Fetch member details
    const member = await MemberService.getMember(messId, memberId);
    if (!member) {
      throw new NotFoundError(`Member ${memberId} not found in mess.`);
    }

    // Access Control check: Normal members can only view their own statement
    if (requestingUser && requestingUser.role === 'MEMBER' && member.userId !== requestingUser.userId) {
      throw new ForbiddenError('Access denied: Members may only inspect their own personal financial statement.');
    }

    // 2. Fetch Period info
    const period = await PeriodService.getPeriodByKey(messId, periodKey);
    const periodStatus = period ? period.status : 'ACTIVE';

    // 3. Fetch Meal Rate & Consumption
    const mealRateRes = await MealRateService.calculateMealRate(messId, periodKey);
    const memberConsumption = mealRateRes.memberShares.find((mc) => mc.memberId === memberId);
    const totalMeals = memberConsumption ? memberConsumption.mealCount : 0;
    const foodShare = memberConsumption ? memberConsumption.foodShare : 0;

    // 4. Fetch Member Balances
    const memberBalances = await BalanceService.calculateMemberBalances(messId, periodKey);
    const memberBal = memberBalances.find((b) => b.memberId === memberId);

    // 5. Fetch all ledger entries for this member
    const allLedger = await LedgerService.getMemberLedger(messId, memberId);

    // Filter ledger entries by periodKey (or include opening balances for this period)
    const periodLedger = allLedger.filter((entry) => {
      if (!entry.effectiveDate) return true;
      const d = new Date(entry.effectiveDate);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      return key === periodKey;
    });

    // Sort chronologically ascending
    periodLedger.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

    // Build statement transactions with signed running balance
    let runningBalance = 0;
    let openingBalance = 0;
    let rentShare = 0;
    let utilityShare = 0;
    let otherShared = 0;
    let bazarContrib = 0;
    let advanceDeposits = 0;
    let settlementPayments = 0;
    let adjustments = 0;

    const transactions: StatementTransactionRow[] = [];

    for (const entry of periodLedger) {
      const amt = entry.amount;
      let debit: number | null = null;
      let credit: number | null = null;

      if (entry.direction === 'DEBIT') {
        // Value consumed / obligation increases debt (runningBalance becomes more negative)
        debit = amt;
        runningBalance = RoundingService.roundCurrency(runningBalance - amt);
      } else {
        // Credit / payment made increases credit (runningBalance becomes more positive)
        credit = amt;
        runningBalance = RoundingService.roundCurrency(runningBalance + amt);
      }

      // Track categorized totals
      switch (entry.entryType) {
        case 'OPENING_BALANCE':
          openingBalance = entry.direction === 'CREDIT' ? amt : -amt;
          break;
        case 'RENT_SHARE':
          rentShare = RoundingService.roundCurrency(rentShare + amt);
          break;
        case 'UTILITY_SHARE':
          utilityShare = RoundingService.roundCurrency(utilityShare + amt);
          break;
        case 'EXPENSE_SHARE':
          otherShared = RoundingService.roundCurrency(otherShared + amt);
          break;
        case 'BAZAR_CONTRIBUTION':
          bazarContrib = RoundingService.roundCurrency(bazarContrib + amt);
          break;
        case 'ADVANCE_DEPOSIT':
          advanceDeposits = RoundingService.roundCurrency(advanceDeposits + amt);
          break;
        case 'SETTLEMENT_PAYMENT':
          settlementPayments = RoundingService.roundCurrency(settlementPayments + amt);
          break;
        case 'ADJUSTMENT':
        case 'REVERSAL':
          adjustments = RoundingService.roundCurrency(adjustments + (entry.direction === 'CREDIT' ? amt : -amt));
          break;
      }

      transactions.push({
        id: entry.id,
        date: entry.effectiveDate.slice(0, 10),
        description: entry.description,
        reference: entry.referenceId ? `${entry.referenceType || 'REF'}-${entry.referenceId.slice(-6)}` : '—',
        entryType: entry.entryType,
        debit,
        credit,
        runningBalance,
      });
    }

    // Determine closing balance from Phase 3 balance service or running balance
    const closingBalance = memberBal ? memberBal.netBalance : runningBalance;
    const totalObligations = RoundingService.roundCurrency(foodShare + rentShare + utilityShare + otherShared);
    const totalContributions = RoundingService.roundCurrency(bazarContrib + advanceDeposits + settlementPayments + adjustments);

    // Human-readable status badge
    let statusBadge: MemberStatementDTO['statusBadge'];
    if (closingBalance < -0.01) {
      statusBadge = {
        status: 'OWES',
        label: `YOU OWE ৳${Math.abs(closingBalance).toFixed(2)}`,
        amount: Math.abs(closingBalance),
      };
    } else if (closingBalance > 0.01) {
      statusBadge = {
        status: 'RECEIVES',
        label: `YOU RECEIVE ৳${closingBalance.toFixed(2)}`,
        amount: closingBalance,
      };
    } else {
      statusBadge = {
        status: 'SETTLED',
        label: 'ACCOUNT SETTLED',
        amount: 0,
      };
    }

    return {
      memberId: member.id,
      memberName: member.name,
      roomNo: member.roomNo || 'N/A',
      role: member.role,
      periodKey,
      periodStatus,
      statusBadge,
      summary: {
        openingBalance,
        totalMeals,
        mealRate: mealRateRes.mealRate,
        foodShare,
        rentShare,
        utilityShare,
        otherSharedExpenses: otherShared,
        totalObligations,
        bazarContributions: bazarContrib,
        advanceDeposits,
        settlementPayments,
        adjustments,
        totalContributions,
        closingBalance,
      },
      transactions,
      generatedAt: new Date().toISOString(),
    };
  }
}
