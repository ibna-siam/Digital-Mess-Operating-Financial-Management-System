import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { InvitationService } from '../services/invitationService.js';
import { sendSuccess } from '../utils/response.js';
import { validateRequest } from '../middleware/validate.js';
import { requirePermission } from '../middleware/rbac.js';
import { Role } from '@prisma/client';

export const invitationRouter = Router({ mergeParams: true });
export const publicInvitationRouter = Router();

const createInvitationSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  roomId: z.string().optional(),
  roomNo: z.string().optional(),
  joinDate: z.string().optional(),
  notes: z.string().optional(),
});

const acceptInvitationSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
});

// -------------------------------------------------------------
// Protected Mess-Scoped Invitation Endpoints
// -------------------------------------------------------------

// List invitations
invitationRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const invitations = await InvitationService.listInvitations(messId);
    sendSuccess(res, invitations);
  } catch (err) {
    next(err);
  }
});

// Create invitation
invitationRouter.post(
  '/',
  requirePermission('MEMBERS_MANAGE'),
  validateRequest({ body: createInvitationSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const invitedByUserId = req.user!.id;
      const invitation = await InvitationService.createInvitation(messId, invitedByUserId, req.body);
      sendSuccess(res, invitation, 201, 'Invitation created successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Revoke invitation
invitationRouter.delete(
  '/:invitationId',
  requirePermission('MEMBERS_MANAGE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const { invitationId } = req.params;
      const revoked = await InvitationService.revokeInvitation(messId, invitationId);
      sendSuccess(res, revoked, 200, 'Invitation revoked successfully');
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------------
// Public Onboarding Endpoints
// -------------------------------------------------------------

// Inspect invitation token
publicInvitationRouter.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const invitation = await InvitationService.getInvitationByToken(token);
    sendSuccess(res, invitation);
  } catch (err) {
    next(err);
  }
});

// Accept invitation
publicInvitationRouter.post(
  '/:token/accept',
  validateRequest({ body: acceptInvitationSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required to accept invitation' });
        return;
      }
      const result = await InvitationService.acceptInvitation(token, userId, req.body);
      sendSuccess(res, result, 200, 'Invitation accepted successfully. Welcome to the mess!');
    } catch (err) {
      next(err);
    }
  }
);
