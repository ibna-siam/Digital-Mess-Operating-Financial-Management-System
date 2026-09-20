import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RoomService } from '../services/roomService.js';
import { sendSuccess } from '../utils/response.js';
import { validateRequest } from '../middleware/validate.js';
import { requirePermission } from '../middleware/rbac.js';

export const roomRouter = Router({ mergeParams: true });

const createRoomSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
  floor: z.string().optional(),
  capacity: z.number().min(1).default(2),
  monthlyRent: z.number().min(0).default(0),
  notes: z.string().optional(),
});

const updateRoomSchema = z.object({
  roomNumber: z.string().min(1).optional(),
  floor: z.string().optional(),
  capacity: z.number().min(1).optional(),
  monthlyRent: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

const assignMemberSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  roomId: z.string().nullable(),
});

// List rooms
roomRouter.get(
  '/',
  requirePermission('MESS_VIEW'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const rooms = await RoomService.listRooms(messId);
      sendSuccess(res, rooms);
    } catch (err) {
      next(err);
    }
  }
);

// Create room
roomRouter.post(
  '/',
  requirePermission('MESS_MANAGE'),
  validateRequest({ body: createRoomSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const room = await RoomService.createRoom(messId, req.body);
      sendSuccess(res, room, 201);
    } catch (err) {
      next(err);
    }
  }
);

// Update room
roomRouter.put(
  '/:id',
  requirePermission('MESS_MANAGE'),
  validateRequest({ body: updateRoomSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messId, id } = req.params;
      const room = await RoomService.updateRoom(messId, id, req.body);
      sendSuccess(res, room);
    } catch (err) {
      next(err);
    }
  }
);

// Assign member to room
roomRouter.post(
  '/assign',
  requirePermission('MEMBERS_MANAGE'),
  validateRequest({ body: assignMemberSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const { memberId, roomId } = req.body;
      await RoomService.assignMember(messId, roomId, memberId);
      sendSuccess(res, { success: true, memberId, roomId });
    } catch (err) {
      next(err);
    }
  }
);
