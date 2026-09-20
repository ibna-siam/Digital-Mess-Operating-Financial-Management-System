import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MemberService } from '../services/memberService.js';
import { sendSuccess } from '../utils/response.js';
import { validateRequest } from '../middleware/validate.js';
import { requirePermission } from '../middleware/rbac.js';
import { Role, MemberStatus } from '@prisma/client';
import { ForbiddenError } from '../utils/errors.js';
import { RbacService } from '../services/rbacService.js';

export const memberRouter = Router({ mergeParams: true });

const inviteSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  role: z.enum(['MANAGER', 'MEMBER']).optional(),
  roomNo: z.string().optional(),
  roomId: z.string().optional(),
  joinDate: z.string().optional(),
  emergencyContact: z.string().optional(),
  notes: z.string().optional(),
});

const updateMemberSchema = z.object({
  role: z.enum(['MANAGER', 'MEMBER']).optional(),
  roomNo: z.string().optional(),
  roomId: z.string().optional(),
  status: z.nativeEnum(MemberStatus).optional(),
});

const updateProfileSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  emergencyContact: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

const assignRoomSchema = z.object({
  roomId: z.string().nullable(),
});

const eligibilitySchema = z.object({
  eligibility: z.record(z.boolean()),
});

const createRoomSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
  floor: z.string().optional(),
  capacity: z.number().min(1).default(2),
  monthlyRent: z.number().min(0).default(0),
  notes: z.string().optional(),
});

// List members with pagination, search, status, role, room, and balance filters
memberRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const status = req.query.status as MemberStatus | undefined;
    const role = req.query.role as Role | undefined;
    const roomId = req.query.roomId as string | undefined;
    const search = req.query.search as string | undefined;
    const balanceFilter = req.query.balanceFilter as 'ALL' | 'DEFICIT' | 'SURPLUS' | 'SETTLED' | undefined;

    // If query contains pagination params or filters, return full paginated response
    if (page !== undefined || limit !== undefined || role !== undefined || roomId !== undefined || balanceFilter !== undefined) {
      const result = await MemberService.getMembersPaginated(messId, {
        page,
        limit,
        status,
        role,
        roomId,
        search,
        balanceFilter,
      });
      sendSuccess(res, result);
    } else {
      // Backward-compatible array response
      const members = await MemberService.getMembers(messId, { status, search });
      sendSuccess(res, members);
    }
  } catch (err) {
    next(err);
  }
});

// List rooms
memberRouter.get('/rooms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const rooms = await MemberService.getRooms(messId);
    sendSuccess(res, rooms);
  } catch (err) {
    next(err);
  }
});

// Create room
memberRouter.post(
  '/rooms',
  requirePermission('MEMBERS_MANAGE'),
  validateRequest({ body: createRoomSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const room = await MemberService.createRoom(messId, req.body);
      sendSuccess(res, room, 201, 'Room created successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Add / Invite member (Direct)
memberRouter.post(
  '/invite',
  requirePermission('MEMBERS_MANAGE'),
  validateRequest({ body: inviteSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      if (req.body.role === 'MANAGER' && req.member?.role !== 'MANAGER' && req.member?.role !== 'OWNER') {
        throw new ForbiddenError('Only existing Managers can assign the Manager role');
      }
      const member = await MemberService.inviteOrAddMember(messId, req.body);
      sendSuccess(res, member, 201, 'Member added/invited successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Get single member details
memberRouter.get('/:memberId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const memberId = req.params.memberId;
    const member = await MemberService.getMemberById(messId, memberId);
    sendSuccess(res, member);
  } catch (err) {
    next(err);
  }
});

// Update member basic fields
memberRouter.patch(
  '/:memberId',
  requirePermission('MEMBERS_MANAGE'),
  validateRequest({ body: updateMemberSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const memberId = req.params.memberId;
      if (req.body.role === 'MANAGER' && req.member?.role !== 'MANAGER' && req.member?.role !== 'OWNER') {
        throw new ForbiddenError('Only existing Managers can assign the Manager role');
      }
      const actorId = req.member?.id;
      const updated = await MemberService.updateMember(messId, memberId, req.body, actorId);
      sendSuccess(res, updated, 200, 'Member updated successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Update member personal profile
memberRouter.patch(
  '/:memberId/profile',
  validateRequest({ body: updateProfileSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const memberId = req.params.memberId;
      const actorId = req.member?.id;

      // IDOR Protection: Only the member themselves or a manager/owner can update a profile
      const isSelf = actorId === memberId;
      const isManager = req.member?.permissions && RbacService.hasPermission(req.member.permissions, 'MEMBERS_MANAGE');

      if (!isSelf && !isManager) {
        throw new ForbiddenError('Permission denied: You can only update your own profile.');
      }

      const updated = await MemberService.updateMemberProfile(messId, memberId, req.body, actorId);
      sendSuccess(res, updated, 200, 'Profile updated successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Assign or vacate room with capacity validation
memberRouter.patch(
  '/:memberId/room',
  requirePermission('MEMBERS_MANAGE'),
  validateRequest({ body: assignRoomSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
    const memberId = req.params.memberId;
      const actorId = req.member?.id;
      const updated = await MemberService.assignRoomWithValidation(messId, memberId, req.body.roomId, actorId);
      sendSuccess(res, updated, 200, req.body.roomId ? 'Room assigned successfully' : 'Room vacated successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Update cost eligibility
memberRouter.patch(
  '/:memberId/eligibility',
  requirePermission('MEMBERS_MANAGE'),
  validateRequest({ body: eligibilitySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
    const memberId = req.params.memberId;
      const actorId = req.member?.id;
      const updated = await MemberService.updateCostEligibility(messId, memberId, req.body.eligibility, actorId);
      sendSuccess(res, updated, 200, 'Cost eligibility updated successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Archive member (CRITICAL NON-DESTRUCTIVE ARCHIVAL)
memberRouter.post(
  '/:memberId/archive',
  requirePermission('MEMBERS_MANAGE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
    const memberId = req.params.memberId;
      const actorId = req.member?.id;
      const archived = await MemberService.archiveMember(messId, memberId, actorId);
      sendSuccess(res, archived, 200, 'Member archived successfully. All ledger records and financial history preserved.');
    } catch (err) {
      next(err);
    }
  }
);

// Restore member
memberRouter.post(
  '/:memberId/restore',
  requirePermission('MEMBERS_MANAGE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
    const memberId = req.params.memberId;
      const actorId = req.member?.id;
      const restored = await MemberService.restoreMember(messId, memberId, actorId);
      sendSuccess(res, restored, 200, 'Member restored to active status');
    } catch (err) {
      next(err);
    }
  }
);

// Deactivate member (backward compatible alias)
memberRouter.post(
  '/:memberId/deactivate',
  requirePermission('MEMBERS_MANAGE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
    const memberId = req.params.memberId;
      const actorId = req.member?.id;
      const deactivated = await MemberService.deactivateMember(messId, memberId, actorId);
      sendSuccess(res, deactivated, 200, 'Member deactivated successfully. Historical records preserved.');
    } catch (err) {
      next(err);
    }
  }
);

// Member audit history timeline
memberRouter.get('/:memberId/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const memberId = req.params.memberId;
    const history = await MemberService.getMemberHistory(messId, memberId);
    sendSuccess(res, history);
  } catch (err) {
    next(err);
  }
});

// Member financial summary
memberRouter.get('/:memberId/financial-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const memberId = req.params.memberId;
    const summary = await MemberService.getMemberFinancialSummary(messId, memberId);
    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
});
