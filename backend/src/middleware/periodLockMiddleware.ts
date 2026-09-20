import { Request, Response, NextFunction } from 'express';
import { PeriodService } from '../services/period/periodService.js';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Middleware that guards operational write operations against CLOSED financial periods
 */
export async function periodLockMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Only check mutating HTTP methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const messId = req.params.messId || (req as any).messId;
    if (!messId) {
      return next();
    }

    // Determine target date or periodKey from request body or params
    let periodKey: string | null = null;

    if (req.body?.billingPeriod && typeof req.body.billingPeriod === 'string') {
      periodKey = req.body.billingPeriod;
    } else if (req.body?.periodKey && typeof req.body.periodKey === 'string') {
      periodKey = req.body.periodKey;
    } else if (req.query?.periodKey && typeof req.query.periodKey === 'string') {
      periodKey = req.query.periodKey;
    } else {
      const dateStr = req.body?.date || req.body?.depositDate || req.body?.dueDate || req.body?.effectiveDate;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const year = d.getUTCFullYear();
          const month = d.getUTCMonth() + 1;
          periodKey = PeriodService.getPeriodKey(year, month);
        }
      }
    }

    // If a specific period was determined, check its status
    if (periodKey) {
      const period = await PeriodService.getPeriodByKey(messId, periodKey);
      if (period && period.status === 'CLOSED') {
        throw new ForbiddenError(
          `Financial period ${periodKey} is CLOSED and immutable. Historical operations cannot be modified unless authorized administrators formally reopen the period.`
        );
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}
