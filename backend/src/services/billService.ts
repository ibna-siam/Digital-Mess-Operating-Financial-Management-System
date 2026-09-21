import { prisma } from '../config/database.js';
import { BillStatus } from '@prisma/client';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { emitToMess, SOCKET_EVENTS } from '../socket/socketEmitter.js';
import { invalidateDashboardCache } from '../controllers/dashboardController.js';

export interface CreateBillInput {
  name: string;
  category: string;
  amount: number;
  billingPeriod: string;
  dueDate: string;
  isRecurring?: boolean;
  notes?: string;
}

export interface MarkBillPaidInput {
  paidByMemberId: string;
  paymentMethod: string;
  paidAt?: string;
}

// Server-side cache for high-speed listing
interface CacheItem<T> {
  data: T;
  timestamp: number;
}
const billCache = new Map<string, CacheItem<any>>();
const BILL_CACHE_TTL_MS = 0; // Disabled to guarantee fresh bill data

export function invalidateBillCache(messId: string) {
  for (const key of billCache.keys()) {
    if (key.startsWith(`${messId}_`)) {
      billCache.delete(key);
    }
  }
}

export class BillService {
  public static deriveStatus(dueDate: Date, isPaid: boolean): BillStatus {
    if (isPaid) return BillStatus.PAID;
    const now = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return BillStatus.OVERDUE;
    if (diffDays <= 3) return BillStatus.DUE;
    return BillStatus.UPCOMING;
  }

  public static async getBills(
    messId: string,
    filters?: { billingPeriod?: string; status?: BillStatus; category?: string }
  ) {
    const cacheKey = `${messId}_bills_${JSON.stringify(filters || {})}`;
    const cached = billCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < BILL_CACHE_TTL_MS) {
      return cached.data;
    }

    const where: Record<string, unknown> = { messId };
    if (filters?.billingPeriod) where.billingPeriod = filters.billingPeriod;
    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;

    const bills = await prisma.bill.findMany({
      where,
      select: {
        id: true,
        messId: true,
        name: true,
        category: true,
        amount: true,
        billingPeriod: true,
        dueDate: true,
        isRecurring: true,
        paidByMemberId: true,
        paidAt: true,
        paymentMethod: true,
        notes: true,
        paidBy: {
          select: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const result = bills.map((b) => ({
      id: b.id,
      messId: b.messId,
      name: b.name,
      category: b.category,
      amount: Number(b.amount),
      billingPeriod: b.billingPeriod,
      dueDate: b.dueDate.toISOString().split('T')[0],
      status: b.paidAt ? BillStatus.PAID : this.deriveStatus(b.dueDate, false),
      isRecurring: b.isRecurring,
      paidByMemberId: b.paidByMemberId,
      paidByName: b.paidBy?.user?.name || null,
      paidAt: b.paidAt ? b.paidAt.toISOString().split('T')[0] : null,
      paymentMethod: b.paymentMethod,
      notes: b.notes,
    }));

    billCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }

  public static async createBill(messId: string, input: CreateBillInput) {
    if (input.amount <= 0) throw new ValidationError('Amount must be greater than 0');
    const dueDate = new Date(input.dueDate);
    if (isNaN(dueDate.getTime())) throw new ValidationError('Invalid due date format');

    const status = this.deriveStatus(dueDate, false);

    const bill = await prisma.bill.create({
      data: {
        messId,
        name: input.name,
        category: input.category,
        amount: input.amount,
        billingPeriod: input.billingPeriod,
        dueDate,
        status,
        isRecurring: input.isRecurring || false,
        notes: input.notes,
      },
    });

    const result = {
      id: bill.id,
      messId: bill.messId,
      name: bill.name,
      category: bill.category,
      amount: Number(bill.amount),
      billingPeriod: bill.billingPeriod,
      dueDate: bill.dueDate.toISOString().split('T')[0],
      status: bill.status,
      isRecurring: bill.isRecurring,
    };

    invalidateBillCache(messId);
    invalidateDashboardCache(messId);

    emitToMess(messId, SOCKET_EVENTS.BILL_CREATED, result);
    emitToMess(messId, SOCKET_EVENTS.DASHBOARD_UPDATED, { type: 'BILL', billId: bill.id });

    return result;
  }

  public static async markPaid(messId: string, billId: string, input: MarkBillPaidInput) {
    const existing = await prisma.bill.findFirst({
      where: { id: billId, messId },
    });
    if (!existing) {
      throw new NotFoundError('Bill not found in this mess workspace');
    }

    const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();

    const updated = await prisma.bill.update({
      where: { id: billId },
      data: {
        status: BillStatus.PAID,
        paidByMemberId: input.paidByMemberId,
        paidAt,
        paymentMethod: input.paymentMethod,
      },
      include: {
        paidBy: { include: { user: true } },
      },
    });

    const res = {
      id: updated.id,
      status: updated.status,
      paidByMemberId: updated.paidByMemberId,
      paidByName: updated.paidBy?.user?.name,
      paidAt: updated.paidAt?.toISOString().split('T')[0],
      paymentMethod: updated.paymentMethod,
    };

    invalidateBillCache(messId);
    invalidateDashboardCache(messId);

    emitToMess(messId, SOCKET_EVENTS.BILL_CREATED, res);
    emitToMess(messId, SOCKET_EVENTS.DASHBOARD_UPDATED, { type: 'BILL', billId });

    return res;
  }

  // Recurring Bill Templates
  public static async getRecurringTemplates(messId: string) {
    const templates = await prisma.recurringBill.findMany({
      where: { messId },
      orderBy: { dueDay: 'asc' },
    });
    return templates;
  }
}
