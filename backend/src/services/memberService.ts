import { prisma } from '../config/database.js';
import { Role, MemberStatus } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import { RoundingService } from './financial/roundingService.js';
import { emitToMess, SOCKET_EVENTS } from '../socket/socketEmitter.js';
import { invalidateDashboardCache } from '../controllers/dashboardController.js';

export interface GetMembersOptions {
  page?: number;
  limit?: number;
  status?: MemberStatus;
  role?: Role;
  roomId?: string;
  search?: string;
  balanceFilter?: 'ALL' | 'DEFICIT' | 'SURPLUS' | 'SETTLED';
}

// Server-side cache for high-speed directory loading
interface CacheItem<T> {
  data: T;
  timestamp: number;
}
const memberCache = new Map<string, CacheItem<any>>();
const MEMBER_CACHE_TTL_MS = 15_000;

export function invalidateMemberCache(messId: string) {
  for (const key of memberCache.keys()) {
    if (key.startsWith(`${messId}_`)) {
      memberCache.delete(key);
    }
  }
}

export class MemberService {
  public static listMembers = MemberService.getMembers;
  public static getMember = MemberService.getMemberById;

  public static async getMembers(messId: string, filters?: { status?: MemberStatus; search?: string }) {
    const result = await this.getMembersPaginated(messId, {
      status: filters?.status,
      search: filters?.search,
      page: 1,
      limit: 100,
    });
    return result.members;
  }

  public static async getMembersPaginated(messId: string, options: GetMembersOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const skip = (page - 1) * limit;

    const cacheKey = `${messId}_members_${JSON.stringify(options)}`;
    const cached = memberCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < MEMBER_CACHE_TTL_MS) {
      return cached.data;
    }

    const where: any = { messId };

    if (options.status) {
      where.status = options.status;
    }

    if (options.role) {
      where.role = options.role;
    }

    if (options.roomId) {
      where.roomId = options.roomId;
    }

    if (options.search) {
      const s = options.search.trim();
      where.OR = [
        { user: { name: { contains: s, mode: 'insensitive' } } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
        { user: { phone: { contains: s, mode: 'insensitive' } } },
        { roomNo: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, members] = await Promise.all([
      prisma.messMember.count({ where }),
      prisma.messMember.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
          },
          room: {
            select: { id: true, roomNumber: true, floor: true, capacity: true, monthlyRent: true },
          },
        },
        orderBy: [{ status: 'asc' }, { joinDate: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    const memberIds = members.map((m) => m.id);
    const balanceGroups = memberIds.length > 0
      ? await prisma.ledgerEntry.groupBy({
          by: ['memberId', 'direction'],
          where: { messId, memberId: { in: memberIds } },
          _sum: { amount: true },
        })
      : [];

    const balanceMap = new Map<string, { credits: number; debits: number }>();
    for (const bg of balanceGroups) {
      if (!balanceMap.has(bg.memberId)) {
        balanceMap.set(bg.memberId, { credits: 0, debits: 0 });
      }
      const cur = balanceMap.get(bg.memberId)!;
      const val = Number(bg._sum.amount || 0);
      if (bg.direction === 'CREDIT') cur.credits += val;
      else if (bg.direction === 'DEBIT') cur.debits += val;
    }

    const mappedMembers = members.map((mem) => {
      const b = balanceMap.get(mem.id) || { credits: 0, debits: 0 };
      const netBalance = RoundingService.roundMoney(b.credits - b.debits);

      return {
        id: mem.id,
        messId: mem.messId,
        userId: mem.userId,
        name: mem.user.name,
        email: mem.user.email,
        phone: mem.user.phone,
        avatarUrl: mem.user.avatarUrl,
        role: mem.role,
        roomNo: mem.roomNo || mem.room?.roomNumber || 'Unassigned',
        roomId: mem.roomId,
        room: mem.room
          ? {
              id: mem.room.id,
              roomNumber: mem.room.roomNumber,
              floor: mem.room.floor,
              capacity: mem.room.capacity,
              monthlyRent: Number(mem.room.monthlyRent),
            }
          : null,
        status: mem.status,
        emergencyContact: mem.emergencyContact,
        address: mem.address,
        notes: mem.notes,
        costEligibility: mem.costEligibility as Record<string, boolean> | null,
        joinDate: mem.joinDate.toISOString().split('T')[0],
        leaveDate: mem.leaveDate ? mem.leaveDate.toISOString().split('T')[0] : null,
        netBalance,
        balanceStatus: netBalance < 0 ? 'DEFICIT' : netBalance > 0 ? 'SURPLUS' : 'SETTLED',
      };
    });

    let filteredMembers = mappedMembers;
    if (options.balanceFilter && options.balanceFilter !== 'ALL') {
      filteredMembers = mappedMembers.filter((m) => m.balanceStatus === options.balanceFilter);
    }

    const result = {
      members: filteredMembers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };

    memberCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }

  public static async getMemberById(messId: string, memberId: string) {
    const member = await prisma.messMember.findFirst({
      where: { id: memberId, messId },
      include: {
        user: true,
        room: true,
        leaveRequests: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!member) throw new NotFoundError('Member not found');

    const [ledgerEntries, mealsCount, expensesSum] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: { messId, memberId },
        select: { amount: true, direction: true },
      }),
      prisma.meal.count({
        where: { messId, memberId },
      }),
      prisma.expense.aggregate({
        where: { messId, payerMemberId: memberId, status: 'APPROVED' },
        _sum: { amount: true },
      }),
    ]);

    let credits = 0;
    let debits = 0;
    for (const e of ledgerEntries) {
      const amt = Number(e.amount);
      if (e.direction === 'CREDIT') credits += amt;
      else if (e.direction === 'DEBIT') debits += amt;
    }
    const netBalance = RoundingService.roundMoney(credits - debits);
    const totalExpensesPaid = Number(expensesSum._sum.amount || 0);

    return {
      id: member.id,
      messId: member.messId,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      phone: member.user.phone,
      avatarUrl: member.user.avatarUrl,
      role: member.role,
      roomNo: member.roomNo || member.room?.roomNumber || 'Unassigned',
      roomId: member.roomId,
      room: member.room
        ? {
            id: member.room.id,
            roomNumber: member.room.roomNumber,
            floor: member.room.floor,
            capacity: member.room.capacity,
            monthlyRent: Number(member.room.monthlyRent),
          }
        : null,
      status: member.status,
      emergencyContact: member.emergencyContact,
      address: member.address,
      notes: member.notes,
      costEligibility: member.costEligibility as Record<string, boolean> | null,
      joinDate: member.joinDate.toISOString().split('T')[0],
      leaveDate: member.leaveDate ? member.leaveDate.toISOString().split('T')[0] : null,
      netBalance,
      totalMealsCount: mealsCount,
      totalExpensesPaid: RoundingService.roundMoney(totalExpensesPaid),
      activeLeaveRequests: member.leaveRequests,
    };
  }

  public static async inviteOrAddMember(
    messId: string,
    data: { name: string; email: string; phone?: string; role?: Role; roomNo?: string; roomId?: string; joinDate?: string; emergencyContact?: string; notes?: string }
  ) {
    const email = data.email.toLowerCase().trim();
    let role = data.role || Role.MEMBER;
    if ((role as any) === 'TREASURER') {
      role = Role.MANAGER;
    }
    const joinDate = data.joinDate ? new Date(data.joinDate) : new Date();

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: data.name.trim(),
          phone: data.phone?.trim() || null,
          passwordHash: '$2a$10$w8T.uK0E7xG0.g51cM0YEuZ3.jBwT4tJ/oGg1xR4fQ6zUo7m2rPfe', // default temporary hash
        },
      });
    }

    const existingMember = await prisma.messMember.findUnique({
      where: { messId_userId: { messId, userId: user.id } },
    });

    if (existingMember && existingMember.status === MemberStatus.ACTIVE) {
      throw new ConflictError('This user is already an active member of this mess');
    }

    let roomId = data.roomId || null;
    let roomNo = data.roomNo || null;

    if (roomId) {
      const room = await prisma.room.findFirst({ where: { id: roomId, messId } });
      if (room) {
        roomNo = room.roomNumber;
      }
    }

    let member;
    if (existingMember) {
      member = await prisma.messMember.update({
        where: { id: existingMember.id },
        data: {
          status: MemberStatus.ACTIVE,
          role,
          roomId,
          roomNo,
          joinDate,
          emergencyContact: data.emergencyContact,
          notes: data.notes,
        },
        include: { user: true },
      });
    } else {
      member = await prisma.messMember.create({
        data: {
          messId,
          userId: user.id,
          role,
          roomId,
          roomNo,
          joinDate,
          status: MemberStatus.ACTIVE,
          emergencyContact: data.emergencyContact,
          notes: data.notes,
        },
        include: { user: true },
      });
    }

    invalidateMemberCache(messId);
    invalidateDashboardCache(messId);

    emitToMess(messId, SOCKET_EVENTS.MEMBER_UPDATED, { memberId: member.id, action: 'ADD' });
    return member;
  }

  public static async updateMemberProfile(
    messId: string,
    memberId: string,
    data: {
      name?: string;
      phone?: string;
      avatarUrl?: string;
      emergencyContact?: string;
      address?: string;
      notes?: string;
    },
    actorMemberId?: string
  ) {
    const member = await prisma.messMember.findFirst({
      where: { id: memberId, messId },
      include: { user: true },
    });
    if (!member) throw new NotFoundError('Member not found');

    const updated = await prisma.$transaction(async (tx) => {
      if (data.name !== undefined || data.phone !== undefined || data.avatarUrl !== undefined) {
        await tx.user.update({
          where: { id: member.userId },
          data: {
            ...(data.name ? { name: data.name.trim() } : {}),
            ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
            ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
          },
        });
      }

      const mem = await tx.messMember.update({
        where: { id: memberId },
        data: {
          ...(data.emergencyContact !== undefined ? { emergencyContact: data.emergencyContact } : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
        },
        include: { user: true, room: true },
      });

      await tx.memberHistory.create({
        data: {
          messId,
          memberId,
          action: 'PROFILE_UPDATED',
          details: data as any,
          createdById: actorMemberId,
        },
      });

      return mem;
    });

    invalidateMemberCache(messId);
    emitToMess(messId, SOCKET_EVENTS.MEMBER_UPDATED, { memberId, action: 'PROFILE_UPDATED' });
    return updated;
  }

  public static async updateMember(
    messId: string,
    memberId: string,
    data: { role?: Role; roomNo?: string; status?: MemberStatus; roomId?: string },
    actorMemberId?: string
  ) {
    let role = data.role;
    if ((role as any) === 'TREASURER') {
      role = Role.MANAGER;
    }
    const current = await prisma.messMember.findFirst({ where: { id: memberId, messId } });
    if (!current) throw new NotFoundError('Member not found');

    const updated = await prisma.$transaction(async (tx) => {
      const mem = await tx.messMember.update({
        where: { id: memberId },
        data: {
          ...(role ? { role } : {}),
          ...(data.roomNo !== undefined ? { roomNo: data.roomNo } : {}),
          ...(data.roomId !== undefined ? { roomId: data.roomId } : {}),
          ...(data.status ? { status: data.status } : {}),
        },
        include: { user: true, room: true },
      });

      await tx.memberHistory.create({
        data: {
          messId,
          memberId,
          action: data.status ? 'STATUS_CHANGE' : 'ROLE_CHANGED',
          details: {
            previousStatus: current.status,
            newStatus: data.status || current.status,
            previousRole: current.role,
            newRole: data.role || current.role,
          },
          createdById: actorMemberId,
        },
      });

      return mem;
    });

    invalidateMemberCache(messId);
    invalidateDashboardCache(messId);
    emitToMess(messId, SOCKET_EVENTS.MEMBER_UPDATED, { memberId, action: 'MEMBER_UPDATED' });
    return updated;
  }

  public static async assignRoomWithValidation(
    messId: string,
    memberId: string,
    roomId: string | null,
    actorMemberId?: string
  ) {
    const member = await prisma.messMember.findFirst({
      where: { id: memberId, messId },
      include: { room: true },
    });
    if (!member) throw new NotFoundError('Member not found');

    if (roomId === null) {
      const updated = await prisma.$transaction(async (tx) => {
        const mem = await tx.messMember.update({
          where: { id: memberId },
          data: { roomId: null, roomNo: null },
        });

        await tx.memberHistory.create({
          data: {
            messId,
            memberId,
            action: 'ROOM_VACATED',
            details: {
              previousRoomId: member.roomId,
              previousRoomNo: member.roomNo,
            },
            createdById: actorMemberId,
          },
        });

        return mem;
      });
      invalidateMemberCache(messId);
      return updated;
    }

    const room = await prisma.room.findFirst({
      where: { id: roomId, messId },
      include: {
        members: {
          where: {
            status: { notIn: [MemberStatus.ARCHIVED, MemberStatus.INACTIVE, MemberStatus.SETTLED] },
            id: { not: memberId },
          },
        },
      },
    });

    if (!room) throw new NotFoundError('Room not found in this mess');

    if (room.members.length >= room.capacity) {
      throw new ValidationError(
        `Room ${room.roomNumber} is at full capacity (${room.capacity} members max). Current occupants: ${room.members.length}`
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const mem = await tx.messMember.update({
        where: { id: memberId },
        data: {
          roomId: room.id,
          roomNo: room.roomNumber,
        },
      });

      await tx.memberHistory.create({
        data: {
          messId,
          memberId,
          action: 'ROOM_ASSIGNED',
          details: {
            previousRoomId: member.roomId,
            previousRoomNo: member.roomNo,
            newRoomId: room.id,
            newRoomNo: room.roomNumber,
            capacity: room.capacity,
          },
          createdById: actorMemberId,
        },
      });

      return mem;
    });

    invalidateMemberCache(messId);
    return updated;
  }

  public static async updateCostEligibility(
    messId: string,
    memberId: string,
    eligibility: Record<string, boolean>,
    actorMemberId?: string
  ) {
    const member = await prisma.messMember.findFirst({ where: { id: memberId, messId } });
    if (!member) throw new NotFoundError('Member not found');

    const updated = await prisma.$transaction(async (tx) => {
      const mem = await tx.messMember.update({
        where: { id: memberId },
        data: { costEligibility: eligibility as any },
      });

      await tx.memberHistory.create({
        data: {
          messId,
          memberId,
          action: 'ELIGIBILITY_UPDATED',
          details: eligibility as any,
          createdById: actorMemberId,
        },
      });

      return mem;
    });

    invalidateMemberCache(messId);
    return updated;
  }

  public static async archiveMember(messId: string, memberId: string, actorMemberId?: string) {
    const leaveDate = new Date();

    const member = await prisma.messMember.findFirst({
      where: { id: memberId, messId },
      include: {
        room: true,
        ledgerEntries: { select: { amount: true, direction: true } },
      },
    });

    if (!member) throw new NotFoundError('Member not found');

    let credits = 0;
    let debits = 0;
    for (const e of member.ledgerEntries) {
      const amt = Number(e.amount);
      if (e.direction === 'CREDIT') credits += amt;
      else if (e.direction === 'DEBIT') debits += amt;
    }
    const finalBalanceSnapshot = RoundingService.roundMoney(credits - debits);

    const updated = await prisma.$transaction(async (tx) => {
      const mem = await tx.messMember.update({
        where: { id: memberId },
        data: {
          status: MemberStatus.ARCHIVED,
          roomId: null,
          roomNo: null,
          leaveDate,
        },
        include: { user: true },
      });

      await tx.memberHistory.create({
        data: {
          messId,
          memberId,
          action: 'ARCHIVED',
          details: {
            previousStatus: member.status,
            releasedRoomId: member.roomId,
            releasedRoomNo: member.roomNo,
            finalBalanceSnapshot,
            archivedAt: leaveDate.toISOString(),
          },
          createdById: actorMemberId,
        },
      });

      return mem;
    });

    invalidateMemberCache(messId);
    invalidateDashboardCache(messId);
    return updated;
  }

  public static async restoreMember(messId: string, memberId: string, actorMemberId?: string) {
    const member = await prisma.messMember.findFirst({ where: { id: memberId, messId } });
    if (!member) throw new NotFoundError('Member not found');

    const updated = await prisma.$transaction(async (tx) => {
      const mem = await tx.messMember.update({
        where: { id: memberId },
        data: {
          status: MemberStatus.ACTIVE,
          leaveDate: null,
        },
        include: { user: true },
      });

      await tx.memberHistory.create({
        data: {
          messId,
          memberId,
          action: 'RESTORED',
          details: {
            previousStatus: member.status,
            restoredAt: new Date().toISOString(),
          },
          createdById: actorMemberId,
        },
      });

      return mem;
    });

    invalidateMemberCache(messId);
    invalidateDashboardCache(messId);
    return updated;
  }

  public static async deactivateMember(messId: string, memberId: string, actorMemberId?: string) {
    const leaveDate = new Date();

    const member = await prisma.messMember.findFirst({ where: { id: memberId, messId } });
    if (!member) throw new NotFoundError('Member not found');

    const updated = await prisma.$transaction(async (tx) => {
      const mem = await tx.messMember.update({
        where: { id: memberId },
        data: {
          status: MemberStatus.INACTIVE,
          leaveDate,
        },
      });

      await tx.memberHistory.create({
        data: {
          messId,
          memberId,
          action: 'DEACTIVATED',
          details: {
            previousStatus: member.status,
            newStatus: MemberStatus.INACTIVE,
            deactivatedAt: leaveDate.toISOString(),
          },
          createdById: actorMemberId,
        },
      });

      return mem;
    });

    invalidateMemberCache(messId);
    invalidateDashboardCache(messId);
    return updated;
  }

  public static async getMemberHistory(messId: string, memberId: string) {
    const histories = await prisma.memberHistory.findMany({
      where: { messId, memberId },
      include: {
        createdBy: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return histories;
  }

  public static async getMemberFinancialSummary(messId: string, memberId: string) {
    const member = await prisma.messMember.findFirst({
      where: { id: memberId, messId },
      include: {
        user: { select: { name: true, email: true } },
        ledgerEntries: {
          orderBy: { effectiveDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!member) throw new NotFoundError('Member not found');

    const allEntries = await prisma.ledgerEntry.findMany({
      where: { messId, memberId },
    });

    let totalCredits = 0;
    let totalDebits = 0;
    for (const e of allEntries) {
      const amt = Number(e.amount);
      if (e.direction === 'CREDIT') totalCredits += amt;
      else if (e.direction === 'DEBIT') totalDebits += amt;
    }

    totalCredits = RoundingService.roundMoney(totalCredits);
    totalDebits = RoundingService.roundMoney(totalDebits);
    const netBalance = RoundingService.roundMoney(totalCredits - totalDebits);

    return {
      memberId: member.id,
      memberName: member.user.name,
      totalCredits,
      totalDebits,
      netBalance,
      balanceStatus: netBalance < 0 ? 'DEFICIT' : netBalance > 0 ? 'SURPLUS' : 'SETTLED',
      recentTransactions: member.ledgerEntries.map((e) => ({
        id: e.id,
        entryType: e.entryType,
        direction: e.direction,
        amount: Number(e.amount),
        balanceAfter: Number(e.balanceAfter),
        description: e.description,
        effectiveDate: e.effectiveDate.toISOString().split('T')[0],
      })),
    };
  }

  public static async getRooms(messId: string) {
    const rooms = await prisma.room.findMany({
      where: { messId },
      include: {
        members: {
          where: {
            status: { notIn: [MemberStatus.ARCHIVED, MemberStatus.INACTIVE, MemberStatus.SETTLED] },
          },
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { roomNumber: 'asc' },
    });

    return rooms.map((r) => ({
      id: r.id,
      messId: r.messId,
      roomNumber: r.roomNumber,
      floor: r.floor,
      capacity: r.capacity,
      currentOccupants: r.members.length,
      availableBeds: Math.max(0, r.capacity - r.members.length),
      monthlyRent: Number(r.monthlyRent),
      notes: r.notes,
      isActive: r.isActive,
      members: r.members.map((m) => ({
        id: m.id,
        name: m.user.name,
        email: m.user.email,
        phone: m.user.phone,
        role: m.role,
        status: m.status,
      })),
    }));
  }

  public static async createRoom(
    messId: string,
    data: { roomNumber: string; floor?: string; capacity?: number; monthlyRent?: number; notes?: string }
  ) {
    const room = await prisma.room.create({
      data: {
        messId,
        roomNumber: data.roomNumber,
        floor: data.floor,
        capacity: data.capacity || 2,
        monthlyRent: data.monthlyRent || 0.0,
        notes: data.notes,
        isActive: true,
      },
    });
    return room;
  }
}
