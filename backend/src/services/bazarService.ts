import { prisma } from '../config/database.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { emitToMess, SOCKET_EVENTS } from '../socket/socketEmitter.js';
import { invalidateDashboardCache } from '../controllers/dashboardController.js';

export interface CreateBazarItemInput {
  name: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalAmount: number;
}

export interface CreateBazarInput {
  buyerMemberId: string;
  amount: number;
  date: string;
  description?: string;
  category?: string;
  paymentMethod?: string;
  notes?: string;
  receiptUrl?: string;
  items?: CreateBazarItemInput[];
}

// Server-side cache for high-speed listing
interface CacheItem<T> {
  data: T;
  timestamp: number;
}
const bazarCache = new Map<string, CacheItem<any>>();
const BAZAR_CACHE_TTL_MS = 15_000;

export function invalidateBazarCache(messId: string) {
  for (const key of bazarCache.keys()) {
    if (key.startsWith(`${messId}_`)) {
      bazarCache.delete(key);
    }
  }
}

export class BazarService {
  public static async getBazarEntries(
    messId: string,
    filters?: { category?: string; buyerId?: string; dateFrom?: string; dateTo?: string; search?: string }
  ) {
    const cacheKey = `${messId}_bazar_${JSON.stringify(filters || {})}`;
    const cached = bazarCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < BAZAR_CACHE_TTL_MS) {
      return cached.data;
    }

    const where: Record<string, unknown> = { messId };
    if (filters?.buyerId) where.buyerMemberId = filters.buyerId;

    const entries = await prisma.bazarEntry.findMany({
      where,
      select: {
        id: true,
        messId: true,
        buyerMemberId: true,
        amount: true,
        date: true,
        description: true,
        paymentMethod: true,
        receiptUrl: true,
        buyer: {
          select: {
            user: { select: { name: true } },
          },
        },
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unit: true,
            unitPrice: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    let result = entries.map((b) => ({
      id: b.id,
      messId: b.messId,
      buyerMemberId: b.buyerMemberId,
      buyerName: b.buyer.user.name,
      amount: Number(b.amount),
      date: b.date.toISOString().split('T')[0],
      description: b.description || 'Bazar Purchase',
      category: 'Food',
      paymentMethod: b.paymentMethod,
      receiptUrl: b.receiptUrl,
      items: b.items.map((it) => ({
        id: it.id,
        name: it.name,
        quantity: it.quantity ? Number(it.quantity) : null,
        unit: it.unit,
        unitPrice: it.unitPrice ? Number(it.unitPrice) : null,
        totalAmount: Number(it.totalAmount),
      })),
    }));

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (b) =>
          b.description.toLowerCase().includes(s) ||
          b.buyerName.toLowerCase().includes(s) ||
          b.category.toLowerCase().includes(s)
      );
    }

    bazarCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }

  public static async getBazarById(messId: string, id: string) {
    const entry = await prisma.bazarEntry.findFirst({
      where: { id, messId },
      include: {
        buyer: { include: { user: true } },
        items: true,
      },
    });
    if (!entry) throw new NotFoundError('Bazar entry not found');

    return {
      id: entry.id,
      messId: entry.messId,
      buyerMemberId: entry.buyerMemberId,
      buyerName: entry.buyer.user.name,
      amount: Number(entry.amount),
      date: entry.date.toISOString().split('T')[0],
      description: entry.description || 'Bazar purchase',
      category: 'Food',
      paymentMethod: entry.paymentMethod,
      receiptUrl: entry.receiptUrl,
      items: entry.items.map((it) => ({
        id: it.id,
        name: it.name,
        quantity: it.quantity ? Number(it.quantity) : null,
        unit: it.unit,
        unitPrice: it.unitPrice ? Number(it.unitPrice) : null,
        totalAmount: Number(it.totalAmount),
      })),
    };
  }

  public static async createBazar(messId: string, input: CreateBazarInput) {
    if (input.amount <= 0) {
      throw new ValidationError('Amount must be greater than 0');
    }

    if (input.items && input.items.length > 0) {
      const itemsSum = input.items.reduce((sum, it) => sum + it.totalAmount, 0);
      if (Math.abs(itemsSum - input.amount) > 0.05) {
        throw new ValidationError(
          `Itemized amounts sum (৳${itemsSum}) must equal the total bazar amount (৳${input.amount})`
        );
      }
    }

    const date = new Date(input.date);
    if (isNaN(date.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.bazarEntry.create({
        data: {
          messId,
          buyerMemberId: input.buyerMemberId,
          amount: input.amount,
          date,
          description: input.description,
          paymentMethod: input.paymentMethod || 'CASH',
          notes: input.notes,
          receiptUrl: input.receiptUrl,
        },
      });

      if (input.items && input.items.length > 0) {
        await tx.bazarItem.createMany({
          data: input.items.map((it) => ({
            bazarEntryId: created.id,
            name: it.name,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitPrice,
            totalAmount: it.totalAmount,
          })),
        });
      }

      return created;
    });

    invalidateBazarCache(messId);
    invalidateDashboardCache(messId);

    const result = await this.getBazarById(messId, entry.id);
    emitToMess(messId, SOCKET_EVENTS.BAZAR_CREATED, result);
    emitToMess(messId, SOCKET_EVENTS.DASHBOARD_UPDATED, { type: 'BAZAR', entryId: entry.id });
    return result;
  }
}
