import { prisma } from '../../config/database.js';
import { RoundingService } from './roundingService.js';
import { LedgerService } from './ledgerService.js';
import { BadRequestError } from '../../utils/errors.js';
import { Prisma } from '@prisma/client';

export interface RecordAdvanceInput {
  messId: string;
  memberId: string;
  amount: number;
  paymentMethod?: string;
  reference?: string;
  billingPeriod: string;
  date?: string;
  notes?: string;
  createdById?: string;
}

export interface AdvanceDepositDTO {
  id: string;
  messId: string;
  memberId: string;
  memberName?: string;
  amount: number;
  paymentMethod: string;
  reference: string | null;
  billingPeriod: string;
  date: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

export class AdvanceService {
  /**
   * Records a member advance/deposit, creates a corresponding CREDIT ledger entry,
   * and saves audit trail inside an atomic database transaction.
   */
  public static async recordAdvance(input: RecordAdvanceInput): Promise<AdvanceDepositDTO> {
    const amount = RoundingService.roundMoney(input.amount);
    if (amount <= 0) {
      throw new BadRequestError('Advance deposit amount must be greater than zero');
    }

    // Atomic transaction for advance deposit creation and ledger entry
    const deposit = await prisma.$transaction(async (tx) => {
      const depositRecord = await tx.advanceDeposit.create({
        data: {
          messId: input.messId,
          memberId: input.memberId,
          amount: new Prisma.Decimal(amount),
          paymentMethod: input.paymentMethod || 'CASH',
          reference: input.reference,
          billingPeriod: input.billingPeriod,
          date: input.date ? new Date(input.date) : new Date(),
          notes: input.notes,
          createdById: input.createdById,
        },
        include: {
          member: { include: { user: true } },
        },
      });

      // Issue ledger credit atomically
      await LedgerService.createEntry({
        messId: input.messId,
        memberId: input.memberId,
        entryType: 'ADVANCE_DEPOSIT',
        direction: 'CREDIT',
        amount,
        description: `Advance Deposit (${depositRecord.paymentMethod}) for ${input.billingPeriod}`,
        referenceType: 'ADVANCE',
        referenceId: depositRecord.id,
        createdById: input.createdById,
      }, tx);

      return depositRecord;
    });

    return {
      id: deposit.id,
      messId: deposit.messId,
      memberId: deposit.memberId,
      memberName: deposit.member.user.name,
      amount: Number(deposit.amount),
      paymentMethod: deposit.paymentMethod,
      reference: deposit.reference,
      billingPeriod: deposit.billingPeriod,
      date: deposit.date.toISOString().split('T')[0],
      status: deposit.status,
      notes: deposit.notes,
      createdAt: deposit.createdAt.toISOString(),
    };
  }

  /**
   * Lists advance deposits for a mess, optionally filtered by billing period.
   * Strictly tenant-isolated to the given messId.
   */
  public static async getAdvances(messId: string, billingPeriod?: string): Promise<AdvanceDepositDTO[]> {
    const where: Prisma.AdvanceDepositWhereInput = { messId };
    if (billingPeriod) where.billingPeriod = billingPeriod;

    const deposits = await prisma.advanceDeposit.findMany({
      where,
      include: {
        member: { include: { user: true } },
      },
      orderBy: { date: 'desc' },
    });

    return deposits.map((d) => ({
      id: d.id,
      messId: d.messId,
      memberId: d.memberId,
      memberName: d.member.user.name,
      amount: Number(d.amount),
      paymentMethod: d.paymentMethod,
      reference: d.reference,
      billingPeriod: d.billingPeriod,
      date: d.date.toISOString().split('T')[0],
      status: d.status,
      notes: d.notes,
      createdAt: d.createdAt.toISOString(),
    }));
  }
}

