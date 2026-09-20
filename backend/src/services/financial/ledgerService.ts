import { prisma, isDatabaseOnline } from '../../config/database.js';
import { RoundingService } from './roundingService.js';
import { LedgerDirection, LedgerEntryType, Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

export interface CreateLedgerEntryInput {
  messId: string;
  memberId: string;
  entryType: LedgerEntryType;
  direction: LedgerDirection; // DEBIT (charge/obligation) vs CREDIT (payment/contribution)
  amount: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
  effectiveDate?: Date;
  createdById?: string;
}

export interface LedgerEntryDTO {
  id: string;
  messId: string;
  memberId: string;
  entryType: LedgerEntryType;
  direction: LedgerDirection;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  effectiveDate: string;
  createdAt: string;
}

export class LedgerService {
  public static postLedgerEntry = LedgerService.createEntry;

  /**
   * Appends an immutable ledger entry. Calculates the member's running balanceAfter.
   * Can execute within an existing atomic Prisma transaction (tx) or standalone (prisma).
   */
  public static async createEntry(
    input: CreateLedgerEntryInput,
    tx?: Prisma.TransactionClient
  ): Promise<LedgerEntryDTO> {
    const amount = RoundingService.roundMoney(input.amount);
    if (amount <= 0) {
      throw new BadRequestError('Ledger entry amount must be positive');
    }

    const client = tx || prisma;

    // Find previous balance for this member
    const lastEntry = await client.ledgerEntry.findFirst({
      where: {
        messId: input.messId,
        memberId: input.memberId,
      },
      orderBy: { createdAt: 'desc' },
    });

    const previousBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
    // Net Balance = Credits - Debits
    const balanceAfter =
      input.direction === 'CREDIT'
        ? RoundingService.roundMoney(previousBalance + amount)
        : RoundingService.roundMoney(previousBalance - amount);

    const created = await client.ledgerEntry.create({
      data: {
        messId: input.messId,
        memberId: input.memberId,
        entryType: input.entryType,
        direction: input.direction,
        amount: new Prisma.Decimal(amount),
        balanceAfter: new Prisma.Decimal(balanceAfter),
        description: input.description,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        effectiveDate: input.effectiveDate || new Date(),
        createdById: input.createdById,
      },
    });

    return {
      id: created.id,
      messId: created.messId,
      memberId: created.memberId,
      entryType: created.entryType,
      direction: created.direction,
      amount: Number(created.amount),
      balanceAfter: Number(created.balanceAfter),
      description: created.description,
      referenceType: created.referenceType,
      referenceId: created.referenceId,
      effectiveDate: created.effectiveDate.toISOString().split('T')[0],
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Reverses an existing ledger entry by appending an equal and opposite entry.
   * Preserves full financial audit history without deleting records.
   */
  public static async reverseEntry(
    messId: string,
    entryId: string,
    reason: string,
    reversedById: string
  ): Promise<LedgerEntryDTO> {
    const original = await prisma.ledgerEntry.findUnique({
      where: { id: entryId },
    });

    if (!original || original.messId !== messId) {
      throw new NotFoundError('Original ledger entry not found in this mess workspace');
    }

    // Reverse direction
    const oppositeDirection: LedgerDirection = original.direction === 'CREDIT' ? 'DEBIT' : 'CREDIT';

    return this.createEntry({
      messId,
      memberId: original.memberId,
      entryType: 'REVERSAL',
      direction: oppositeDirection,
      amount: Number(original.amount),
      description: `REVERSAL: ${original.description} (${reason})`,
      referenceType: 'REVERSAL',
      referenceId: original.id,
      createdById: reversedById,
    });
  }

  /**
   * Retrieves ledger transactions for a member, optionally filtered by billing period (YYYY-MM).
   */
  public static async getMemberLedger(
    messId: string,
    memberId: string,
    billingPeriod?: string
  ): Promise<LedgerEntryDTO[]> {
    const where: Prisma.LedgerEntryWhereInput = {
      messId,
      memberId,
    };

    if (billingPeriod) {
      const [yearStr, monthStr] = billingPeriod.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
      where.effectiveDate = { gte: start, lte: end };
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      orderBy: { effectiveDate: 'asc' },
    });

    return entries.map((e) => ({
      id: e.id,
      messId: e.messId,
      memberId: e.memberId,
      entryType: e.entryType,
      direction: e.direction,
      amount: Number(e.amount),
      balanceAfter: Number(e.balanceAfter),
      description: e.description,
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      effectiveDate: e.effectiveDate.toISOString().split('T')[0],
      createdAt: e.createdAt.toISOString(),
    }));
  }
}
