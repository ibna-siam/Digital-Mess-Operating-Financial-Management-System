import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getUserMesses, createMess, getMessById, joinMess, regenerateCode } from '../controllers/messController.js';
import { MessService } from '../services/messService.js';
import { sendSuccess } from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { requirePermission, requireRole } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/validate.js';
import { memberRouter } from './memberRoutes.js';
import { invitationRouter } from './invitationRoutes.js';
import { leaveRequestRouter } from './leaveRequestRoutes.js';
import { mealRouter } from './mealRoutes.js';
import { bazarRouter } from './bazarRoutes.js';
import { expenseRouter } from './expenseRoutes.js';
import { billRouter } from './billRoutes.js';
import { financialRouter } from './financialRoutes.js';
import { periodRouter } from './periodRoutes.js';
import { reportRouter } from './reportRoutes.js';
import { utilityRouter } from './utilityRoutes.js';
import { roomRouter } from './roomRoutes.js';
import { meterRouter } from './meterRoutes.js';
import { recurringRouter } from './recurringRoutes.js';
import { announcementRouter } from './announcementRoutes.js';
import { documentRouter } from './documentRoutes.js';
import { auditRouter } from './auditRoutes.js';
import { periodLockMiddleware } from '../middleware/periodLockMiddleware.js';

export const messRouter = Router();

const createMessSchema = z.object({
  name: z.string().min(2, 'Mess name must be at least 2 characters'),
  currency: z.string().default('BDT'),
  currencySymbol: z.string().default('৳'),
  area: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
});

const joinMessSchema = z.object({
  joinCode: z.string().min(3, 'Join code must be at least 3 characters'),
});

const updateProfileSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
  area: z.string().optional(),
  city: z.string().optional(),
});

messRouter.use(authMiddleware);

// User messes list
messRouter.get('/', getUserMesses);

// Create mess (user becomes MANAGER)
messRouter.post('/', validateRequest({ body: createMessSchema }), createMess);

// Join existing mess with Join Code (user becomes MEMBER)
messRouter.post('/join', validateRequest({ body: joinMessSchema }), joinMess);

// Regenerate unique join code (MANAGER only)
messRouter.post('/:messId/regenerate-code', tenantMiddleware(), requireRole(['OWNER', 'MANAGER']), regenerateCode);

// Mess-scoped endpoints (enforced tenant isolation and RBAC capability checks)
messRouter.get('/:messId', tenantMiddleware(), requirePermission('MESS_VIEW'), getMessById);

// Update Mess Profile
messRouter.patch(
  '/:messId/profile',
  tenantMiddleware(),
  requirePermission('SETTINGS_MANAGE'),
  validateRequest({ body: updateProfileSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const updated = await MessService.updateMessProfile(messId, req.body);
      sendSuccess(res, updated, 200, 'Mess profile updated successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Update Mess Settings
messRouter.patch(
  '/:messId/settings',
  tenantMiddleware(),
  requirePermission('SETTINGS_MANAGE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const updated = await MessService.updateMessSettings(messId, req.body.settings || req.body);
      sendSuccess(res, updated, 200, 'Mess settings updated successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Sub-modules mounted with tenant isolation and mutation lock protection for closed periods
messRouter.use('/:messId/members', tenantMiddleware(), memberRouter);
messRouter.use('/:messId/invitations', tenantMiddleware(), invitationRouter);
messRouter.use('/:messId/leave-requests', tenantMiddleware(), leaveRequestRouter);
messRouter.use('/:messId/meals', tenantMiddleware(), periodLockMiddleware, mealRouter);
messRouter.use('/:messId/bazar', tenantMiddleware(), periodLockMiddleware, bazarRouter);
messRouter.use('/:messId/expenses', tenantMiddleware(), periodLockMiddleware, expenseRouter);
messRouter.use('/:messId/bills', tenantMiddleware(), periodLockMiddleware, billRouter);
messRouter.use('/:messId/utilities', tenantMiddleware(), periodLockMiddleware, utilityRouter);
messRouter.use('/:messId/rooms', tenantMiddleware(), roomRouter);
messRouter.use('/:messId/meters', tenantMiddleware(), meterRouter);
messRouter.use('/:messId/recurring-utilities', tenantMiddleware(), recurringRouter);
messRouter.use('/:messId/financial', tenantMiddleware(), periodLockMiddleware, financialRouter);
messRouter.use('/:messId/financial-periods', tenantMiddleware(), periodRouter);
messRouter.use('/:messId/reports', tenantMiddleware(), reportRouter);
messRouter.use('/:messId/announcements', tenantMiddleware(), announcementRouter);
messRouter.use('/:messId/documents', tenantMiddleware(), documentRouter);
messRouter.use('/:messId/audit-logs', tenantMiddleware(), auditRouter);
messRouter.use('/:messId', tenantMiddleware(), financialRouter);
