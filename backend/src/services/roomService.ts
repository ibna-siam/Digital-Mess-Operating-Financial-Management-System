import { prisma, isDatabaseOnline } from '../config/database.js';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors.js';

export interface CreateRoomInput {
  roomNumber: string;
  floor?: string;
  capacity?: number;
  monthlyRent: number;
  notes?: string;
}

export interface UpdateRoomInput {
  roomNumber?: string;
  floor?: string;
  capacity?: number;
  monthlyRent?: number;
  isActive?: boolean;
  notes?: string;
}

export interface RoomDTO {
  id: string;
  messId: string;
  roomNumber: string;
  floor: string | null;
  capacity: number;
  monthlyRent: number;
  isActive: boolean;
  occupantCount: number;
  notes: string | null;
  occupants: Array<{
    memberId: string;
    name: string;
    role: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// In-memory fallback for testing / offline environments
const memoryRooms: Map<string, RoomDTO[]> = new Map();

function initMemoryRooms(messId: string): RoomDTO[] {
  if (!memoryRooms.has(messId)) {
    memoryRooms.set(messId, [
      {
        id: 'rm-101',
        messId,
        roomNumber: 'A-101',
        floor: '1st',
        capacity: 2,
        monthlyRent: 8000,
        isActive: true,
        occupantCount: 1,
        notes: 'Master Bedroom with Attached Balcony',
        occupants: [{ memberId: 'mem-1', name: 'Siam Ahmed', role: 'OWNER' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rm-102',
        messId,
        roomNumber: 'A-102',
        floor: '1st',
        capacity: 2,
        monthlyRent: 6000,
        isActive: true,
        occupantCount: 1,
        notes: 'Standard Double Room',
        occupants: [{ memberId: 'mem-2', name: 'Rahim Khan', role: 'MANAGER' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rm-103',
        messId,
        roomNumber: 'A-103',
        floor: '1st',
        capacity: 2,
        monthlyRent: 6000,
        isActive: true,
        occupantCount: 1,
        notes: 'East-facing Room',
        occupants: [{ memberId: 'mem-3', name: 'Tanvir Hossain', role: 'MEMBER' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }
  return memoryRooms.get(messId)!;
}

export class RoomService {
  /**
   * List all rooms for a mess including member occupancy
   */
  public static async listRooms(messId: string): Promise<RoomDTO[]> {
    try {
      if (!(await isDatabaseOnline())) {
        throw new Error('Database offline');
      }

      const rooms = await prisma.room.findMany({
        where: { messId },
        include: {
          members: {
            include: {
              user: { select: { name: true } },
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
        monthlyRent: Number(r.monthlyRent),
        isActive: r.isActive,
        occupantCount: r.members.length,
        notes: r.notes,
        occupants: r.members.map((m) => ({
          memberId: m.id,
          name: m.user.name,
          role: m.role,
        })),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    } catch {
      return initMemoryRooms(messId);
    }
  }

  /**
   * Create a new room in the mess
   */
  public static async createRoom(messId: string, input: CreateRoomInput): Promise<RoomDTO> {
    if (!input.roomNumber || input.roomNumber.trim().length === 0) {
      throw new BadRequestError('Room number is required');
    }
    if (input.monthlyRent < 0) {
      throw new BadRequestError('Monthly rent cannot be negative');
    }

    try {
      if (!(await isDatabaseOnline())) {
        throw new Error('Database offline');
      }

      const existing = await prisma.room.findUnique({
        where: {
          messId_roomNumber: { messId, roomNumber: input.roomNumber.trim() },
        },
      });
      if (existing) {
        throw new ConflictError(`Room ${input.roomNumber} already exists in this mess`);
      }

      const created = await prisma.room.create({
        data: {
          messId,
          roomNumber: input.roomNumber.trim(),
          floor: input.floor || null,
          capacity: input.capacity || 2,
          monthlyRent: new Prisma.Decimal(input.monthlyRent || 0),
          notes: input.notes || null,
        },
        include: {
          members: { include: { user: true } },
        },
      });

      return {
        id: created.id,
        messId: created.messId,
        roomNumber: created.roomNumber,
        floor: created.floor,
        capacity: created.capacity,
        monthlyRent: Number(created.monthlyRent),
        isActive: created.isActive,
        occupantCount: created.members.length,
        notes: created.notes,
        occupants: created.members.map((m) => ({
          memberId: m.id,
          name: m.user.name,
          role: m.role,
        })),
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (err: unknown) {
      if (err instanceof ConflictError || err instanceof BadRequestError) throw err;

      const list = initMemoryRooms(messId);
      if (list.some((r) => r.roomNumber === input.roomNumber.trim())) {
        throw new ConflictError(`Room ${input.roomNumber} already exists in this mess`);
      }

      const newRoom: RoomDTO = {
        id: `rm-${Date.now()}`,
        messId,
        roomNumber: input.roomNumber.trim(),
        floor: input.floor || null,
        capacity: input.capacity || 2,
        monthlyRent: input.monthlyRent || 0,
        isActive: true,
        occupantCount: 0,
        notes: input.notes || null,
        occupants: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.push(newRoom);
      return newRoom;
    }
  }

  /**
   * Update room configuration
   */
  public static async updateRoom(messId: string, roomId: string, input: UpdateRoomInput): Promise<RoomDTO> {
    try {
      if (!(await isDatabaseOnline())) {
        throw new Error('Database offline');
      }

      const room = await prisma.room.findFirst({
        where: { id: roomId, messId },
      });
      if (!room) throw new NotFoundError('Room not found');

      const data: Prisma.RoomUpdateInput = {};
      if (input.roomNumber !== undefined) data.roomNumber = input.roomNumber.trim();
      if (input.floor !== undefined) data.floor = input.floor;
      if (input.capacity !== undefined) data.capacity = input.capacity;
      if (input.monthlyRent !== undefined) data.monthlyRent = new Prisma.Decimal(input.monthlyRent);
      if (input.isActive !== undefined) data.isActive = input.isActive;
      if (input.notes !== undefined) data.notes = input.notes;

      const updated = await prisma.room.update({
        where: { id: roomId },
        data,
        include: {
          members: { include: { user: true } },
        },
      });

      return {
        id: updated.id,
        messId: updated.messId,
        roomNumber: updated.roomNumber,
        floor: updated.floor,
        capacity: updated.capacity,
        monthlyRent: Number(updated.monthlyRent),
        isActive: updated.isActive,
        occupantCount: updated.members.length,
        notes: updated.notes,
        occupants: updated.members.map((m) => ({
          memberId: m.id,
          name: m.user.name,
          role: m.role,
        })),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (err: unknown) {
      if (err instanceof NotFoundError) throw err;

      const list = initMemoryRooms(messId);
      const target = list.find((r) => r.id === roomId);
      if (!target) throw new NotFoundError('Room not found');

      if (input.roomNumber !== undefined) target.roomNumber = input.roomNumber;
      if (input.floor !== undefined) target.floor = input.floor;
      if (input.capacity !== undefined) target.capacity = input.capacity;
      if (input.monthlyRent !== undefined) target.monthlyRent = input.monthlyRent;
      if (input.isActive !== undefined) target.isActive = input.isActive;
      if (input.notes !== undefined) target.notes = input.notes;
      target.updatedAt = new Date().toISOString();

      return target;
    }
  }

  /**
   * Assign a member to a room (enforces room capacity)
   */
  public static async assignMember(messId: string, roomId: string, memberId: string): Promise<void> {
    try {
      if (!(await isDatabaseOnline())) {
        throw new Error('Database offline');
      }

      const room = await prisma.room.findFirst({
        where: { id: roomId, messId },
        include: { members: true },
      });
      if (!room) throw new NotFoundError('Room not found');

      if (room.members.length >= room.capacity) {
        throw new BadRequestError(`Room ${room.roomNumber} is at maximum capacity (${room.capacity} members)`);
      }

      await prisma.messMember.update({
        where: { id: memberId },
        data: {
          roomId: room.id,
          roomNo: room.roomNumber,
        },
      });
    } catch (err: unknown) {
      if (err instanceof NotFoundError || err instanceof BadRequestError) throw err;

      const list = initMemoryRooms(messId);
      const target = list.find((r) => r.id === roomId);
      if (!target) throw new NotFoundError('Room not found');
      if (target.occupants.length >= target.capacity) {
        throw new BadRequestError(`Room ${target.roomNumber} is at maximum capacity`);
      }
      target.occupants.push({ memberId, name: 'Assigned Member', role: 'MEMBER' });
      target.occupantCount = target.occupants.length;
    }
  }

  /**
   * Calculates room-based rent configuration for all active members in the mess
   */
  public static async getRoomRentBreakdown(messId: string): Promise<{
    totalExpectedRent: number;
    roomBreakdown: Array<{
      roomId: string;
      roomNumber: string;
      roomRent: number;
      occupants: number;
      perMemberRent: number;
      memberIds: string[];
    }>;
  }> {
    const rooms = await this.listRooms(messId);
    let totalExpectedRent = 0;

    const roomBreakdown = rooms.map((r) => {
      const occupantsCount = Math.max(1, r.occupants.length);
      const perMember = Math.round((r.monthlyRent / occupantsCount) * 100) / 100;
      totalExpectedRent += r.monthlyRent;
      return {
        roomId: r.id,
        roomNumber: r.roomNumber,
        roomRent: r.monthlyRent,
        occupants: r.occupants.length,
        perMemberRent: perMember,
        memberIds: r.occupants.map((o) => o.memberId),
      };
    });

    return {
      totalExpectedRent,
      roomBreakdown,
    };
  }
}
