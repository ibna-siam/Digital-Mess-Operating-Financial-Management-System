import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../utils/response.js';
import { validateRequest } from '../middleware/validate.js';
import { requirePermission } from '../middleware/rbac.js';
import { BalanceService } from '../services/financial/balanceService.js';
import { MealRateService } from '../services/financial/mealRateService.js';
import { LedgerService } from '../services/financial/ledgerService.js';
import { AdvanceService } from '../services/financial/advanceService.js';
import { SettlementService } from '../services/financial/settlementService.js';
import { PaymentService } from '../services/financial/paymentService.js';
import { AdjustmentService } from '../services/financial/adjustmentService.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { RbacService } from '../services/rbacService.js';

export const financialRouter = Router({ mergeParams: true });

const recordAdvanceSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  paymentMethod: z.string().default('CASH'),
  reference: z.string().optional(),
  billingPeriod: z.string().min(7, 'Billing period required (e.g. 2026-09)'),
  date: z.string().optional(),
  notes: z.string().optional(),
});

const recordPaymentSchema = z.object({
  amount: z.number().min(0.01, 'Payment amount must be greater than zero'),
  paymentMethod: z.string().default('CASH'),
  reference: z.string().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

const createAdjustmentSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  direction: z.enum(['DEBIT', 'CREDIT']),
  reason: z.string().min(5, 'Reason must be at least 5 characters long'),
  billingPeriod: z.string().optional(),
});

// 1. High-level financial summary
financialRouter.get('/financial-summary', requirePermission('EXPENSES_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const period = (req.query.period as string) || new Date().toISOString().slice(0, 7);
    const summary = await BalanceService.calculateMessBalances(messId, period);
    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
});

// 2. Meal rate calculation
financialRouter.get('/meal-rate', requirePermission('MEALS_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const period = (req.query.period as string) || new Date().toISOString().slice(0, 7);
    const mealRate = await MealRateService.calculateMealRate(messId, period);
    sendSuccess(res, mealRate);
  } catch (err) {
    next(err);
  }
});

// 3. Member balances list
financialRouter.get('/balances', requirePermission('EXPENSES_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const period = (req.query.period as string) || new Date().toISOString().slice(0, 7);
    const summary = await BalanceService.calculateMessBalances(messId, period);
    sendSuccess(res, summary.memberBalances);
  } catch (err) {
    next(err);
  }
});

// 4. Member ledger entries (IDOR-protected: members view self; managers view all)
financialRouter.get('/ledger', requirePermission('EXPENSES_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const callerMemberId = req.member?.id;
    if (!callerMemberId) {
      return next(new UnauthorizedError('Active membership context required'));
    }

    const requestedMemberId = (req.query.memberId as string) || callerMemberId;
    if (requestedMemberId !== callerMemberId) {
      const canManage = req.member?.permissions && (
        RbacService.hasPermission(req.member.permissions, 'EXPENSES_MANAGE') ||
        RbacService.hasPermission(req.member.permissions, 'SETTINGS_MANAGE')
      );
      if (!canManage) {
        throw new ForbiddenError('Permission denied: You can only inspect your own financial ledger.');
      }
    }

    const period = req.query.period as string | undefined;
    const entries = await LedgerService.getMemberLedger(messId, requestedMemberId, period);
    sendSuccess(res, entries);
  } catch (err) {
    next(err);
  }
});

// 5. Specific member's ledger entries (Manager/Treasurer/Owner)
financialRouter.get('/members/:memberId/ledger', requirePermission('EXPENSES_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const callerMemberId = req.member?.id;
    if (!callerMemberId) {
      return next(new UnauthorizedError('Active membership context required'));
    }

    const targetMemberId = req.params.memberId;
    if (targetMemberId !== callerMemberId) {
      const canManage = req.member?.permissions && (
        RbacService.hasPermission(req.member.permissions, 'EXPENSES_MANAGE') ||
        RbacService.hasPermission(req.member.permissions, 'SETTINGS_MANAGE')
      );
      if (!canManage) {
        throw new ForbiddenError('Permission denied: You can only inspect your own financial ledger.');
      }
    }

    const period = req.query.period as string | undefined;
    const entries = await LedgerService.getMemberLedger(messId, targetMemberId, period);
    sendSuccess(res, entries);
  } catch (err) {
    next(err);
  }
});

// 6. Record advance / deposit
financialRouter.post(
  '/advances',
  requirePermission('EXPENSES_MANAGE'),
  validateRequest({ body: recordAdvanceSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const createdById = req.member?.id;
      const advance = await AdvanceService.recordAdvance({
        messId,
        ...req.body,
        createdById,
      });
      sendSuccess(res, advance, 201, 'Advance deposit recorded successfully');
    } catch (err) {
      next(err);
    }
  }
);

// 7. List advances
financialRouter.get('/advances', requirePermission('EXPENSES_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const period = req.query.period as string | undefined;
    const advances = await AdvanceService.getAdvances(messId, period);
    sendSuccess(res, advances);
  } catch (err) {
    next(err);
  }
});

// 8. Financial adjustments (Owner/Treasurer)
financialRouter.post(
  '/adjustments',
  requirePermission('EXPENSES_APPROVE'),
  validateRequest({ body: createAdjustmentSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const createdById = req.member?.id;
      if (!createdById) {
        return next(new UnauthorizedError('Active membership context required'));
      }
      const adjustment = await AdjustmentService.createAdjustment({
        messId,
        ...req.body,
        createdById,
      });
      sendSuccess(res, adjustment, 201, 'Financial adjustment applied successfully');
    } catch (err) {
      next(err);
    }
  }
);

// 9. Get settlement plan
financialRouter.get('/settlements', requirePermission('EXPENSES_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const period = (req.query.period as string) || new Date().toISOString().slice(0, 7);
    const plan = await SettlementService.getSettlementPlan(messId, period);
    sendSuccess(res, plan);
  } catch (err) {
    next(err);
  }
});

// 10. Generate / recalculate settlement plan
financialRouter.post('/settlements/generate', requirePermission('EXPENSES_MANAGE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const period = (req.body.billingPeriod as string) || new Date().toISOString().slice(0, 7);
    const plan = await SettlementService.generateSettlementPlan(messId, period, req.member?.id);
    sendSuccess(res, plan, 201, 'Settlement plan generated successfully');
  } catch (err) {
    next(err);
  }
});

// 11. Record settlement payment against item
financialRouter.post(
  '/settlements/items/:itemId/payments',
  requirePermission('EXPENSES_MANAGE'),
  validateRequest({ body: recordPaymentSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const { itemId } = req.params;
      const payerMemberId = req.member?.id;
      if (!payerMemberId) {
        return next(new UnauthorizedError('Active membership context required'));
      }
      const payment = await PaymentService.recordPayment({
        messId,
        settlementItemId: itemId,
        payerMemberId,
        ...req.body,
      });
      sendSuccess(res, payment, 201, 'Settlement payment recorded successfully');
    } catch (err) {
      next(err);
    }
  }
);

// 12. List settlement payments
financialRouter.get('/settlements/payments', requirePermission('EXPENSES_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const payments = await PaymentService.getPayments(messId);
    sendSuccess(res, payments);
  } catch (err) {
    next(err);
  }
});
