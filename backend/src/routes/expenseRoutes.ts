import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ExpenseService } from '../services/expenseService.js';
import { sendSuccess } from '../utils/response.js';
import { validateRequest } from '../middleware/validate.js';
import { requirePermission } from '../middleware/rbac.js';
import { ExpenseType, ExpenseStatus } from '@prisma/client';
import { UnauthorizedError } from '../utils/errors.js';

export const expenseRouter = Router({ mergeParams: true });

const createExpenseSchema = z.object({
  payerMemberId: z.string().min(1, 'Payer member ID is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  type: z.nativeEnum(ExpenseType).default(ExpenseType.VARIABLE),
  category: z
    .string()
    .min(1, 'Category is required')
    .refine(
      (cat) => !ExpenseService.isDisallowedCategory(cat),
      (cat) => ({
        message: ExpenseService.getDisallowedCategoryMessage(cat),
      })
    ),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(10, 'Valid date is required (YYYY-MM-DD)'),
  billingPeriod: z.string().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});

// List expenses
expenseRouter.get('/', requirePermission('EXPENSES_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const type = req.query.type as ExpenseType | undefined;
    const status = req.query.status as ExpenseStatus | undefined;
    const category = req.query.category as string | undefined;
    const billingPeriod = req.query.billingPeriod as string | undefined;

    const expenses = await ExpenseService.getExpenses(messId, { type, status, category, billingPeriod });
    sendSuccess(res, expenses);
  } catch (err) {
    next(err);
  }
});

// Create expense
expenseRouter.post(
  '/',
  requirePermission('EXPENSES_MANAGE'),
  validateRequest({ body: createExpenseSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const submitterRole = req.member?.role || 'MEMBER';
      const expense = await ExpenseService.createExpense(messId, req.body, submitterRole);
      sendSuccess(res, expense, 201, 'Expense recorded successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Get single expense
expenseRouter.get('/:id', requirePermission('EXPENSES_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const { id } = req.params;
    const expense = await ExpenseService.getExpenseById(messId, id);
    sendSuccess(res, expense);
  } catch (err) {
    next(err);
  }
});

// Approve expense
expenseRouter.post(
  '/:id/approve',
  requirePermission('EXPENSES_APPROVE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const { id } = req.params;
      const approverId = req.member?.id;
      if (!approverId) {
        return next(new UnauthorizedError('Active membership context required'));
      }
      const approved = await ExpenseService.approveExpense(messId, id, approverId);
      sendSuccess(res, approved, 200, 'Expense approved');
    } catch (err) {
      next(err);
    }
  }
);

// Reject expense
expenseRouter.post(
  '/:id/reject',
  requirePermission('EXPENSES_APPROVE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const { id } = req.params;
      const approverId = req.member?.id;
      if (!approverId) {
        return next(new UnauthorizedError('Active membership context required'));
      }
      const rejected = await ExpenseService.rejectExpense(messId, id, approverId);
      sendSuccess(res, rejected, 200, 'Expense rejected');
    } catch (err) {
      next(err);
    }
  }
);
