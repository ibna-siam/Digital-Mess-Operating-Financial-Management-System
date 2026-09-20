import { prisma } from '../../config/database.js';
import { RoundingService } from './roundingService.js';
import { LedgerService } from './ledgerService.js';
import { PaymentStatus, Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../utils/errors.js';

export interface RecordPaymentInput {
  messId: string;
  settlementItemId: string;
  payerMemberId: string;
  amount: number;
  paymentMethod: string; // CASH, BKASH, NAGAD, BANK
  reference?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface PaymentDTO {
  id: string;
  settlementItemId: string;
  payerMemberId: string;
  payerName?: string;
  receiverMemberId: string;
  receiverName?: string;
  amount: number;
  paymentMethod: string;
  reference: string | null;
  status: PaymentStatus;
  paidAt: string;
  confirmedAt?: string | null;
  notes?: string | null;
}

export class PaymentService {
  /**
   * Records a settlement payment from debtor to creditor.
   * Supports partial payments, idempotency protection, and atomic database transaction safety.
   */
  public static async recordPayment(input: RecordPaymentInput): Promise<PaymentDTO> {
    const amount = RoundingService.roundMoney(input.amount);
    if (amount <= 0) {
      throw new BadRequestError('Payment amount must be greater than zero');
    }

    // Database-backed idempotency check
    if (input.idempotencyKey) {
      const existing = await prisma.settlementPayment.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: {
          payer: { include: { user: true } },
          receiver: { include: { user: true } },
        },
      });
      if (existing) {
        return {
          id: existing.id,
          settlementItemId: existing.settlementItemId,
          payerMemberId: existing.payerMemberId,
          payerName: existing.payer.user.name,
          receiverMemberId: existing.receiverMemberId,
          receiverName: existing.receiver.user.name,
          amount: Number(existing.amount),
          paymentMethod: existing.paymentMethod,
          reference: existing.reference,
          status: existing.status,
          paidAt: existing.paidAt.toISOString(),
          confirmedAt: existing.confirmedAt?.toISOString() || null,
          notes: existing.notes,
        };
      }
    }

    // Verify settlement item and tenant isolation
    const item = await prisma.settlementItem.findFirst({
      where: {
        id: input.settlementItemId,
        plan: { messId: input.messId },
      },
      include: {
        plan: true,
        payer: { include: { user: true } },
        receiver: { include: { user: true } },
      },
    });

    if (!item) {
      throw new NotFoundError('Settlement item not found in current mess');
    }

    if (item.payerMemberId !== input.payerMemberId) {
      throw new UnauthorizedError('Only the assigned debtor can record this payment');
    }

    // Atomic financial transaction: Payment record + SettlementItem progress + Ledger Entry
    const { payment, updatedItem } = await prisma.$transaction(async (tx) => {
      // Re-verify settlement item within transaction
      const freshItem = await tx.settlementItem.findUnique({
        where: { id: item.id },
      });
      if (!freshItem) {
        throw new NotFoundError('Settlement item not found');
      }

      const totalItemAmount = Number(freshItem.amount);
      const currentSettled = Number(freshItem.settledAmount);
      const remainingUnsettled = RoundingService.roundMoney(totalItemAmount - currentSettled);

      if (amount > remainingUnsettled + 0.01) {
        throw new BadRequestError(
          `Payment amount (৳${amount}) cannot exceed remaining unpaid settlement balance (৳${remainingUnsettled})`
        );
      }

      const newSettled = RoundingService.roundMoney(currentSettled + amount);
      const isFullySettled = newSettled >= totalItemAmount - 0.01;

      // 1. Create Settlement Payment
      const paymentRecord = await tx.settlementPayment.create({
        data: {
          settlementItemId: item.id,
          payerMemberId: item.payerMemberId,
          receiverMemberId: item.receiverMemberId,
          amount: new Prisma.Decimal(amount),
          paymentMethod: input.paymentMethod || 'CASH',
          reference: input.reference,
          idempotencyKey: input.idempotencyKey,
          status: 'CONFIRMED',
          notes: input.notes,
        },
      });

      // 2. Update Settlement Item progress
      const updated = await tx.settlementItem.update({
        where: { id: item.id },
        data: {
          settledAmount: new Prisma.Decimal(newSettled),
          status: isFullySettled ? 'PAID' : 'PARTIALLY_PAID',
        },
      });

      // 3. Issue Ledger Entry for Payer (Credit - paid money toward settlement) atomically
      await LedgerService.createEntry({
        messId: input.messId,
        memberId: item.payerMemberId,
        entryType: 'SETTLEMENT_PAYMENT',
        direction: 'CREDIT',
        amount,
        description: `Settlement payment to ${item.receiver.user.name} via ${paymentRecord.paymentMethod}`,
        referenceType: 'SETTLEMENT',
        referenceId: paymentRecord.id,
        createdById: input.payerMemberId,
      }, tx);

      return { payment: paymentRecord, updatedItem: updated };
    });

    // Real-time notifications and socket events outside of the db transaction
    try {
      const { NotificationService } = await import('../notificationService.js');
      const { emitToMess, SOCKET_EVENTS } = await import('../../socket/socketEmitter.js');

      // Notify Receiver
      await NotificationService.createNotification({
        messId: input.messId,
        userId: item.receiver.userId,
        memberId: item.receiverMemberId,
        type: 'PAYMENT_CONFIRMED',
        category: 'FINANCIAL',
        priority: 'NORMAL',
        title: 'Settlement Payment Received',
        message: `You received ৳${amount.toLocaleString()} from ${item.payer.user.name} via ${payment.paymentMethod}.`,
        entityType: 'PAYMENT',
        entityId: payment.id,
        actionUrl: '/settlement',
        idempotencyKey: `pay_rec_${payment.id}`,
      });

      // Notify Payer
      await NotificationService.createNotification({
        messId: input.messId,
        userId: item.payer.userId,
        memberId: item.payerMemberId,
        type: 'PAYMENT_CONFIRMED',
        category: 'FINANCIAL',
        priority: 'NORMAL',
        title: 'Payment Confirmed',
        message: `Your settlement payment of ৳${amount.toLocaleString()} to ${item.receiver.user.name} is confirmed.`,
        entityType: 'PAYMENT',
        entityId: payment.id,
        actionUrl: '/settlement',
        idempotencyKey: `pay_send_${payment.id}`,
      });

      emitToMess(input.messId, SOCKET_EVENTS.DASHBOARD_UPDATED, { messId: input.messId });
    } catch (err: any) {
      // Non-critical notification failure must not fail the financial transaction
      console.warn(`Failed to dispatch payment notification: ${err.message}`);
    }

    return {
      id: payment.id,
      settlementItemId: payment.settlementItemId,
      payerMemberId: payment.payerMemberId,
      payerName: item.payer.user.name,
      receiverMemberId: payment.receiverMemberId,
      receiverName: item.receiver.user.name,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      status: payment.status,
      paidAt: payment.paidAt.toISOString(),
      confirmedAt: payment.confirmedAt?.toISOString() || null,
      notes: payment.notes,
    };
  }

  /**
   * Retrieves payment transaction history for a settlement item or mess.
   * Scoped to the authenticated mess for multi-tenant data isolation.
   */
  public static async getPayments(messId: string, settlementItemId?: string): Promise<PaymentDTO[]> {
    const where: Prisma.SettlementPaymentWhereInput = {
      settlementItem: {
        plan: { messId },
      },
    };
    if (settlementItemId) {
      where.settlementItemId = settlementItemId;
    }

    const payments = await prisma.settlementPayment.findMany({
      where,
      include: {
        payer: { include: { user: true } },
        receiver: { include: { user: true } },
      },
      orderBy: { paidAt: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      settlementItemId: p.settlementItemId,
      payerMemberId: p.payerMemberId,
      payerName: p.payer.user.name,
      receiverMemberId: p.receiverMemberId,
      receiverName: p.receiver.user.name,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      reference: p.reference,
      status: p.status,
      paidAt: p.paidAt.toISOString(),
      confirmedAt: p.confirmedAt?.toISOString() || null,
      notes: p.notes,
    }));
  }
}
