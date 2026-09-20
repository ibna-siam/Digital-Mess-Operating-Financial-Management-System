import { prisma } from '../../config/database.js';
import { RoundingService } from './roundingService.js';
import { LedgerService } from './ledgerService.js';
import { LedgerDirection, Prisma } from '@prisma/client';
import { BadRequestError } from '../../utils/errors.js';

export interface CreateAdjustmentInput {
  messId: string;
  memberId: string;
  amount: number;
  direction: LedgerDirection; // DEBIT (increase charge) vs CREDIT (increase credit/deposit)
  reason: string;
  billingPeriod?: string;
  createdById: string;
}

export interface AdjustmentDTO {
  id: string;
  messId: string;
  memberId: string;
  memberName?: string;
  amount: number;
  direction: LedgerDirection;
  reason: string;
  billingPeriod: string | null;
  createdById: string;
  createdAt: string;
}

export class AdjustmentService {
  /**
   * Creates a controlled financial adjustment with mandatory reason and ledger entry,
   * executed inside an atomic database transaction.
   */
  public static async createAdjustment(input: CreateAdjustmentInput): Promise<AdjustmentDTO> {
    const amount = RoundingService.roundMoney(input.amount);
    if (amount <= 0) {
      throw new BadRequestError('Adjustment amount must be greater than zero');
    }

    if (!input.reason || input.reason.trim().length < 5) {
      throw new BadRequestError('A specific reason (minimum 5 characters) is required for financial adjustments');
    }

    const adj = await prisma.$transaction(async (tx) => {
      const adjustmentRecord = await tx.financialAdjustment.create({
        data: {
          messId: input.messId,
          memberId: input.memberId,
          amount: new Prisma.Decimal(amount),
          direction: input.direction,
          reason: input.reason.trim(),
          billingPeriod: input.billingPeriod,
          createdById: input.createdById,
        },
        include: {
          member: { include: { user: true } },
        },
      });

      // Issue ledger entry atomically
      await LedgerService.createEntry({
        messId: input.messId,
        memberId: input.memberId,
        entryType: 'ADJUSTMENT',
        direction: input.direction,
        amount,
        description: `FINANCIAL ADJUSTMENT: ${adjustmentRecord.reason}`,
        referenceType: 'ADJUSTMENT',
        referenceId: adjustmentRecord.id,
        createdById: input.createdById,
      }, tx);

      return adjustmentRecord;
    });

    return {
      id: adj.id,
      messId: adj.messId,
      memberId: adj.memberId,
      memberName: adj.member.user.name,
      amount: Number(adj.amount),
      direction: adj.direction,
      reason: adj.reason,
      billingPeriod: adj.billingPeriod,
      createdById: adj.createdById,
      createdAt: adj.createdAt.toISOString(),
    };
  }
}

