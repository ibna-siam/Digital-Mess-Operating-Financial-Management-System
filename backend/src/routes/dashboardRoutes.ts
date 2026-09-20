import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/rbac.js';
import { apiCacheMiddleware } from '../middleware/cacheMiddleware.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/:messId',
  authMiddleware,
  tenantMiddleware(),
  requirePermission('MESS_VIEW'),
  apiCacheMiddleware(20_000),
  getDashboardStats
);
