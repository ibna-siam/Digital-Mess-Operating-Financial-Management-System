import { Router, Request, Response, NextFunction } from 'express';
import { PeriodService } from '../services/period/periodService.js';
import { ValidationService } from '../services/period/validationService.js';
import { ClosingService } from '../services/period/closingService.js';
import { SnapshotService } from '../services/period/snapshotService.js';
import { requireRole } from '../middleware/rbac.js';
import { BadRequestError } from '../utils/errors.js';

export const periodRouter = Router({ mergeParams: true });


/**
 * GET /api/v1/messes/:messId/financial-periods
 * List all financial periods
 */
periodRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const periods = await PeriodService.listPeriods(messId);
    res.json({ success: true, data: periods });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/financial-periods/current
 * Get or automatically create the current active financial period
 */
periodRouter.get('/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const userId = req.user?.id;
    const current = await PeriodService.getOrCreateCurrentPeriod(messId, new Date(), userId);
    res.json({ success: true, data: current });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/messes/:messId/financial-periods
 * Create/Open a new financial period (Admin/Treasurer only)
 */
periodRouter.post('/', requireRole(['OWNER', 'MANAGER', 'TREASURER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const userId = req.user?.id;
    const { year, month } = req.body;

    if (!year || !month) {
      throw new BadRequestError('Year and month are required to open a financial period.');
    }

    const period = await PeriodService.createPeriod(messId, Number(year), Number(month), userId);
    res.status(201).json({ success: true, data: period });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/financial-periods/:periodKey
 * Get period details and snapshot (if available)
 */
periodRouter.get('/:periodKey', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const { periodKey } = req.params;
    const period = await PeriodService.getPeriodByKey(messId, periodKey);
    if (!period) {
      res.status(404).json({ success: false, error: { message: `Period ${periodKey} not found.` } });
      return;
    }

    const snapshot = await SnapshotService.getSnapshot(period.id);
    res.json({ success: true, data: { period, snapshot } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messes/:messId/financial-periods/:periodKey/validation
 * Month-End review checklist and validation engine
 */
periodRouter.get('/:periodKey/validation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const { periodKey } = req.params;
    const validation = await ValidationService.validateFinancialPeriod(messId, periodKey);
    res.json({ success: true, data: validation });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/messes/:messId/financial-periods/:periodKey/review
 * Move period to UNDER_REVIEW
 */
periodRouter.post(
  '/:periodKey/review',
  requireRole(['OWNER', 'MANAGER', 'TREASURER']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const { periodKey } = req.params;
      const updated = await ClosingService.startReview(messId, periodKey, req.user?.id, req.user?.name);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/messes/:messId/financial-periods/:periodKey/finalize
 * Finalize month (run validation checks, generate snapshot, set FINALIZED)
 */
periodRouter.post(
  '/:periodKey/finalize',
  requireRole(['OWNER', 'MANAGER', 'TREASURER']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const { periodKey } = req.params;
      const result = await ClosingService.finalizePeriod(messId, periodKey, req.user?.id, req.user?.name);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/messes/:messId/financial-periods/:periodKey/close
 * Close month (verify finalized, set CLOSED, carry forward balances)
 */
periodRouter.post(
  '/:periodKey/close',
  requireRole(['OWNER', 'MANAGER', 'TREASURER']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const { periodKey } = req.params;
      const result = await ClosingService.closePeriod(messId, periodKey, req.user?.id, req.user?.name);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/messes/:messId/financial-periods/:periodKey/reopen
 * Reopen closed month with mandatory audit reason
 */
periodRouter.post(
  '/:periodKey/reopen',
  requireRole(['OWNER', 'MANAGER', 'TREASURER']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const { periodKey } = req.params;
      const { reason } = req.body;
      const actorId = req.user?.id || 'system';

      const result = await ClosingService.reopenPeriod(messId, periodKey, actorId, reason, req.user?.name);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/messes/:messId/financial-periods/:periodKey/events
 * Audit trail events for period
 */
periodRouter.get('/:periodKey/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const { periodKey } = req.params;
    const period = await PeriodService.getPeriodByKey(messId, periodKey);
    if (!period) {
      res.status(404).json({ success: false, error: { message: 'Period not found' } });
      return;
    }

    const events = await ClosingService.listEvents(period.id);
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
});
