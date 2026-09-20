import { Router, Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/auditService.js';
import { requirePermission } from '../middleware/rbac.js';
import { sendSuccess } from '../utils/response.js';

export const auditRouter = Router({ mergeParams: true });

// Require AUDIT_VIEW permission (OWNER or MANAGER)
auditRouter.use(requirePermission('AUDIT_VIEW'));

/**
 * GET /api/v1/messes/:messId/audit-logs
 * Retrieves paginated audit logs with search, category filtering, and summary statistics
 */
auditRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.params.messId;
    const { category, action, search, startDate, endDate, page, limit } = req.query;

    const result = await AuditService.getMessAuditLogs(messId, {
      category: category as string,
      action: action as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    sendSuccess(res, result, 200, 'Audit logs retrieved successfully');
  } catch (err) {
    next(err);
  }
});
