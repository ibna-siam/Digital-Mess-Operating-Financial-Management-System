import { prisma } from '../config/database.js';

export interface AuditLogFilterOptions {
  category?: string;
  action?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class AuditService {
  /**
   * Log an immutable audit action into the database
   */
  static async log(data: {
    messId: string;
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    details?: string | null;
    ipAddress?: string | null;
  }) {
    try {
      return await prisma.auditLog.create({
        data: {
          messId: data.messId,
          userId: data.userId || null,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId || null,
          details: data.details || null,
          ipAddress: data.ipAddress || '127.0.0.1',
        },
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
      return null;
    }
  }

  /**
   * Get paginated audit logs with flexible multi-dimensional filtering
   */
  static async getMessAuditLogs(messId: string, options: AuditLogFilterOptions = {}) {

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(10, options.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = { messId };

    if (options.category && options.category !== 'ALL') {
      const cat = options.category.toUpperCase();
      if (cat === 'FINANCIAL') {
        where.OR = [
          { entity: { in: ['LEDGER', 'DEPOSIT', 'BAZAR', 'EXPENSE', 'SETTLEMENT', 'FINANCIAL_PERIOD'] } },
          { action: { contains: 'FINANCIAL', mode: 'insensitive' } },
          { action: { contains: 'DEPOSIT', mode: 'insensitive' } },
          { action: { contains: 'SETTLEMENT', mode: 'insensitive' } },
        ];
      } else if (cat === 'MEMBER') {
        where.entity = { in: ['MEMBER', 'ROOM', 'USER', 'INVITATION', 'LEAVE_REQUEST'] };
      } else if (cat === 'UTILITY') {
        where.entity = { in: ['UTILITY', 'BILL', 'METER', 'RECURRING_BILL'] };
      } else if (cat === 'DOCUMENT') {
        where.entity = { in: ['DOCUMENT', 'FILE', 'STORAGE'] };
      } else if (cat === 'SECURITY') {
        where.entity = { in: ['AUTH', 'SETTINGS', 'ROLE', 'SYSTEM', 'MESS'] };
      } else {
        where.entity = { contains: cat, mode: 'insensitive' };
      }
    }

    if (options.action && options.action !== 'ALL') {
      where.action = { contains: options.action, mode: 'insensitive' };
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      const searchConditions = [
        { action: { contains: q, mode: 'insensitive' } },
        { entity: { contains: q, mode: 'insensitive' } },
        { details: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { ipAddress: { contains: q, mode: 'insensitive' } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = new Date(options.startDate);
      if (options.endDate) where.createdAt.lte = new Date(options.endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Summary statistics for header cards
    const [allCount, financialCount, memberCount, utilityCount, securityCount] = await Promise.all([
      prisma.auditLog.count({ where: { messId } }),
      prisma.auditLog.count({
        where: {
          messId,
          OR: [
            { entity: { in: ['LEDGER', 'DEPOSIT', 'BAZAR', 'EXPENSE', 'SETTLEMENT', 'FINANCIAL_PERIOD'] } },
            { action: { contains: 'FINANCIAL', mode: 'insensitive' } },
            { action: { contains: 'DEPOSIT', mode: 'insensitive' } },
          ],
        },
      }),
      prisma.auditLog.count({
        where: {
          messId,
          entity: { in: ['MEMBER', 'ROOM', 'USER', 'INVITATION', 'LEAVE_REQUEST'] },
        },
      }),
      prisma.auditLog.count({
        where: {
          messId,
          entity: { in: ['UTILITY', 'BILL', 'METER', 'RECURRING_BILL'] },
        },
      }),
      prisma.auditLog.count({
        where: {
          messId,
          entity: { in: ['AUTH', 'SETTINGS', 'DOCUMENT', 'ROLE', 'SYSTEM', 'MESS'] },
        },
      }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        total: allCount,
        financialCount,
        memberCount,
        utilityCount,
        securityCount,
      },
    };
  }
}
