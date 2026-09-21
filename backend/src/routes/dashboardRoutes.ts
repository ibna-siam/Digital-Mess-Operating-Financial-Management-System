import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/rbac.js';
export const dashboardRouter = Router();

dashboardRouter.get(
  '/:messId',
  authMiddleware,
  tenantMiddleware(),
  requirePermission('MESS_VIEW'),
  getDashboardStats
);
