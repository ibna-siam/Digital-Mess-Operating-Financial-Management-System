import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BillService } from '../services/billService.js';
import { sendSuccess } from '../utils/response.js';
import { validateRequest } from '../middleware/validate.js';
import { requirePermission } from '../middleware/rbac.js';
import { BillStatus } from '@prisma/client';

export const billRouter = Router({ mergeParams: true });

const createBillSchema = z.object({
  name: z.string().min(1, 'Bill name is required'),
  category: z.string().min(1, 'Category is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  billingPeriod: z.string().min(7, 'Billing period is required (e.g. 2026-09)'),
  dueDate: z.string().min(10, 'Due date is required (YYYY-MM-DD)'),
  isRecurring: z.boolean().default(false),
  notes: z.string().optional(),
});

const payBillSchema = z.object({
  paidByMemberId: z.string().min(1, 'Payer member ID is required'),
  paymentMethod: z.string().default('CASH'),
  paidAt: z.string().optional(),
});

// List bills
billRouter.get('/', requirePermission('EXPENSES_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const status = req.query.status as BillStatus | undefined;
    const billingPeriod = req.query.billingPeriod as string | undefined;
    const category = req.query.category as string | undefined;

    const bills = await BillService.getBills(messId, { status, billingPeriod, category });
    sendSuccess(res, bills);
  } catch (err) {
    next(err);
  }
});

// Recurring templates
billRouter.get(
  '/templates',
  requirePermission('EXPENSES_VIEW'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const templates = await BillService.getRecurringTemplates(messId);
      sendSuccess(res, templates);
    } catch (err) {
      next(err);
    }
  }
);

// Create bill
billRouter.post(
  '/',
  requirePermission('EXPENSES_MANAGE'),
  validateRequest({ body: createBillSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const bill = await BillService.createBill(messId, req.body);
      sendSuccess(res, bill, 201, 'Bill created successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Mark bill as paid
billRouter.post(
  '/:id/pay',
  requirePermission('EXPENSES_MANAGE'),
  validateRequest({ body: payBillSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const { id } = req.params;
      const updated = await BillService.markPaid(messId, id, req.body);
      sendSuccess(res, updated, 200, 'Bill marked as paid');
    } catch (err) {
      next(err);
    }
  }
);
