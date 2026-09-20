import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requirePermission } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/validate.js';
import { AnnouncementService } from '../services/announcementService.js';
import { sendSuccess } from '../utils/response.js';

export const announcementRouter = Router({ mergeParams: true });

const createAnnouncementSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150),
  message: z.string().min(2, 'Message must be at least 2 characters'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  audience: z.enum(['ALL_MEMBERS', 'ADMINS', 'TREASURERS']).default('ALL_MEMBERS'),
  expiresAt: z.string().datetime().optional().nullable(),
});

// GET /api/v1/messes/:messId/announcements — List announcements for member's role
announcementRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const role = req.member!.role;

      const announcements = await AnnouncementService.getAnnouncements(messId, role);
      sendSuccess(res, announcements, 200, 'Announcements retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/messes/:messId/announcements — Create announcement (requires SETTINGS_MANAGE or admin/manager)
announcementRouter.post(
  '/',
  requirePermission('SETTINGS_MANAGE'),
  validateRequest({ body: createAnnouncementSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const memberId = req.member!.id;

      const created = await AnnouncementService.createAnnouncement(messId, memberId, req.body);
      sendSuccess(res, created, 201, 'Announcement created and distributed');
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/messes/:messId/announcements/:id — Delete announcement
announcementRouter.delete(
  '/:id',
  requirePermission('SETTINGS_MANAGE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const announcementId = req.params.id;

      await AnnouncementService.deleteAnnouncement(announcementId, messId);
      sendSuccess(res, null, 200, 'Announcement deleted successfully');
    } catch (err) {
      next(err);
    }
  }
);
