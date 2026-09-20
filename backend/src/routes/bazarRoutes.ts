import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BazarService } from '../services/bazarService.js';
import { sendSuccess } from '../utils/response.js';
import { validateRequest } from '../middleware/validate.js';
import { requirePermission } from '../middleware/rbac.js';

export const bazarRouter = Router({ mergeParams: true });

const createBazarSchema = z.object({
  buyerMemberId: z.string().min(1, 'Buyer member ID is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  date: z.string().min(10, 'Valid date is required (YYYY-MM-DD)'),
  description: z.string().optional(),
  category: z.string().default('Food'),
  paymentMethod: z.string().default('CASH'),
  notes: z.string().optional(),
  receiptUrl: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1, 'Item name is required'),
        quantity: z.number().optional(),
        unit: z.string().optional(),
        unitPrice: z.number().optional(),
        totalAmount: z.number().min(0, 'Item total must be non-negative'),
      })
    )
    .optional(),
});

// List bazar entries
bazarRouter.get('/', requirePermission('BAZAR_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const category = req.query.category as string | undefined;
    const buyerId = req.query.buyerId as string | undefined;
    const search = req.query.search as string | undefined;
    const entries = await BazarService.getBazarEntries(messId, { category, buyerId, search });
    sendSuccess(res, entries);
  } catch (err) {
    next(err);
  }
});

// Create bazar entry
bazarRouter.post(
  '/',
  requirePermission('BAZAR_MANAGE'),
  validateRequest({ body: createBazarSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const entry = await BazarService.createBazar(messId, req.body);
      sendSuccess(res, entry, 201, 'Bazar purchase recorded successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Get single entry details
bazarRouter.get('/:id', requirePermission('BAZAR_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const { id } = req.params;
    const entry = await BazarService.getBazarById(messId, id);
    sendSuccess(res, entry);
  } catch (err) {
    next(err);
  }
});
