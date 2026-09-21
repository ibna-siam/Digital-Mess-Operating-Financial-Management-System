import { Router, Request, Response, NextFunction } from 'express';
import { BillsUtilitiesService } from '../services/billsUtilitiesService.js';
import { sendSuccess } from '../utils/response.js';
import { requirePermission } from '../middleware/rbac.js';

export const billsUtilitiesRouter = Router({ mergeParams: true });

/**
 * GET /api/v1/messes/:messId/bills-utilities/overview
 * Unified high-performance summary of bills, utilities, KPIs, and payment history.
 */
billsUtilitiesRouter.get(
  '/overview',
  requirePermission('EXPENSES_VIEW'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const periodKey =
        (req.query.periodKey as string) ||
        new Date().toISOString().slice(0, 7);

      const data = await BillsUtilitiesService.getOverview(messId, periodKey);
      sendSuccess(res, data, 200, 'Bills & Utilities overview fetched successfully');
    } catch (err) {
      next(err);
    }
  }
);
