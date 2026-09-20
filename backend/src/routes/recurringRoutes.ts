import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RecurringUtilityService } from '../services/recurringUtilityService.js';
import { sendSuccess } from '../utils/response.js';
import { validateRequest } from '../middleware/validate.js';
import { requirePermission } from '../middleware/rbac.js';

export const recurringRouter = Router({ mergeParams: true });

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  category: z.string().default('OTHER'),
  utilityType: z.string().default('FIXED'),
  defaultAmount: z.number().min(0.01, 'Default amount must be greater than zero'),
  frequency: z.string().default('MONTHLY'),
  dueDay: z.number().min(1).max(31).default(10),
  splitMethod: z.enum(['EQUAL', 'CUSTOM_RATIO', 'ROOM_BASED', 'MEMBER_SPECIFIC']).default('EQUAL'),
  autoGenerate: z.boolean().default(false),
  requiresReview: z.boolean().default(true),
  notes: z.string().optional(),
});

const generateBillsSchema = z.object({
  billingPeriod: z.string().regex(/^\d{4}-\d{2}$/, 'Billing period must be YYYY-MM'),
});

// List recurring templates
recurringRouter.get(
  '/',
  requirePermission('EXPENSES_VIEW'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const templates = await RecurringUtilityService.listTemplates(messId);
      sendSuccess(res, templates);
    } catch (err) {
      next(err);
    }
  }
);

// Create recurring template
recurringRouter.post(
  '/',
  requirePermission('EXPENSES_MANAGE'),
  validateRequest({ body: createTemplateSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const template = await RecurringUtilityService.createTemplate(messId, req.body as any);
      sendSuccess(res, template, 201);
    } catch (err) {
      next(err);
    }
  }
);

// Batch generate bills for period from templates
recurringRouter.post(
  '/generate',
  requirePermission('EXPENSES_MANAGE'),
  validateRequest({ body: generateBillsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const actorId = (req as any).user?.userId;
      const result = await RecurringUtilityService.generateBillsForPeriod(
        messId,
        req.body.billingPeriod,
        actorId
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
);
