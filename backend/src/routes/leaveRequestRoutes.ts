import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LeaveRequestService } from '../services/leaveRequestService.js';
import { sendSuccess } from '../utils/response.js';
import { validateRequest } from '../middleware/validate.js';
import { requirePermission } from '../middleware/rbac.js';
import { LeaveRequestStatus } from '@prisma/client';

export const leaveRequestRouter = Router({ mergeParams: true });

const createLeaveRequestSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  type: z.enum(['TEMPORARY', 'PERMANENT_EXIT']).default('TEMPORARY'),
  reason: z.string().optional(),
});

const rejectRequestSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

// List leave requests
leaveRequestRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const status = req.query.status as LeaveRequestStatus | undefined;
    const memberId = req.query.memberId as string | undefined;
    const requests = await LeaveRequestService.getLeaveRequests(messId, { status, memberId });
    sendSuccess(res, requests);
  } catch (err) {
    next(err);
  }
});

// Exit clearance audit for a member
leaveRequestRouter.get(
  '/clearance/:memberId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messId, memberId } = req.params;
      const clearance = await LeaveRequestService.getExitClearanceAudit(messId, memberId);
      sendSuccess(res, clearance);
    } catch (err) {
      next(err);
    }
  }
);

// Submit leave / exit request
leaveRequestRouter.post(
  '/',
  validateRequest({ body: createLeaveRequestSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      // Member can submit for themselves, or manager can submit for member
      const memberId = (req.body.memberId || req.member?.id) as string;
      if (!memberId) {
        res.status(400).json({ success: false, error: 'Member ID is required' });
        return;
      }
      const leaveRequest = await LeaveRequestService.createLeaveRequest(messId, memberId, req.body);
      sendSuccess(res, leaveRequest, 201, 'Leave request submitted successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Approve leave / exit request
leaveRequestRouter.post(
  '/:requestId/approve',
  requirePermission('MEMBERS_MANAGE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const { requestId } = req.params;
      const approverMemberId = req.member?.id || 'admin';
      const approved = await LeaveRequestService.approveLeaveRequest(messId, requestId, approverMemberId);
      sendSuccess(res, approved, 200, 'Leave request approved successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Reject leave / exit request
leaveRequestRouter.post(
  '/:requestId/reject',
  requirePermission('MEMBERS_MANAGE'),
  validateRequest({ body: rejectRequestSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const { requestId } = req.params;
      const approverMemberId = req.member?.id || 'admin';
      const rejected = await LeaveRequestService.rejectLeaveRequest(
        messId,
        requestId,
        approverMemberId,
        req.body.reason
      );
      sendSuccess(res, rejected, 200, 'Leave request rejected');
    } catch (err) {
      next(err);
    }
  }
);
