import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MeterService } from '../services/meterService.js';
import { sendSuccess } from '../utils/response.js';
import { validateRequest } from '../middleware/validate.js';
import { requirePermission } from '../middleware/rbac.js';

export const meterRouter = Router({ mergeParams: true });

const recordMeterSchema = z.object({
  meterType: z.string().default('ELECTRICITY'),
  meterName: z.string().min(1, 'Meter name is required'),
  meterIdentifier: z.string().optional(),
  roomNumber: z.string().optional(),
  billingPeriod: z.string().regex(/^\d{4}-\d{2}$/, 'Billing period must be YYYY-MM'),
  readingDate: z.string().min(10, 'Reading date is required'),
  currentValue: z.number().min(0, 'Current value cannot be negative'),
  previousValue: z.number().min(0, 'Previous value cannot be negative'),
  isRollover: z.boolean().optional(),
  notes: z.string().optional(),
});

// List meter readings
meterRouter.get(
  '/',
  requirePermission('EXPENSES_VIEW'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const billingPeriod = req.query.billingPeriod as string | undefined;
      const meterType = req.query.meterType as string | undefined;
      const readings = await MeterService.listReadings(messId, { billingPeriod, meterType });
      sendSuccess(res, readings);
    } catch (err) {
      next(err);
    }
  }
);

// Get latest reading for autofilling previous reading
meterRouter.get(
  '/latest',
  requirePermission('EXPENSES_VIEW'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const meterType = (req.query.meterType as string) || 'ELECTRICITY';
      const meterIdentifier = req.query.meterIdentifier as string | undefined;
      const latest = await MeterService.getLatestReading(messId, meterType, meterIdentifier);
      sendSuccess(res, latest);
    } catch (err) {
      next(err);
    }
  }
);

// Record meter reading
meterRouter.post(
  '/',
  requirePermission('EXPENSES_MANAGE'),
  validateRequest({ body: recordMeterSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const recordedById = (req as any).user?.userId;
      const reading = await MeterService.recordReading(messId, {
        ...req.body,
        recordedById,
      });
      sendSuccess(res, reading, 201);
    } catch (err) {
      next(err);
    }
  }
);
