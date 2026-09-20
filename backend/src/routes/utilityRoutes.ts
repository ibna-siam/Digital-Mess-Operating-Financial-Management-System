import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UtilityService } from '../services/utilityService.js';
import { sendSuccess } from '../utils/response.js';
import { validateRequest } from '../middleware/validate.js';
import { requirePermission } from '../middleware/rbac.js';
import { BillStatus } from '@prisma/client';

export const utilityRouter = Router({ mergeParams: true });

const createUtilityBillSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
  billType: z.string().optional(),
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  billingPeriod: z.string().regex(/^\d{4}-\d{2}$/, 'Billing period must be YYYY-MM'),
  billingDate: z.string().optional(),
  dueDate: z.string().optional(),
  splitMethod: z.enum(['EQUAL', 'CUSTOM_RATIO', 'ROOM_BASED', 'MEMBER_SPECIFIC']).default('EQUAL'),
  meterIdentifier: z.string().optional(),
  previousReading: z.number().optional(),
  currentReading: z.number().optional(),
  consumedUnits: z.number().optional(),
  unitRate: z.number().optional(),
  fixedCharges: z.number().optional(),
  additionalCharges: z.number().optional(),
  maidName: z.string().optional(),
  baseSalary: z.number().optional(),
  bonusAmount: z.number().optional(),
  advanceDeduction: z.number().optional(),
  deductions: z.number().optional(),
  netPayable: z.number().optional(),
  provider: z.string().optional(),
  package: z.string().optional(),
  accountNumber: z.string().optional(),
  gasType: z.string().optional(),
  cylinderCount: z.number().optional(),
  paidByMemberId: z.string().optional(),
  paidAt: z.string().optional(),
  paymentMethod: z.string().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
  allocations: z
    .array(
      z.object({
        memberId: z.string(),
        amount: z.number().optional(),
        shareRatio: z.number().optional(),
        unitsConsumed: z.number().optional(),
        activeDays: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .optional(),
});

const calculateElectricitySchema = z.object({
  currentReading: z.number().min(0),
  previousReading: z.number().min(0),
  unitRate: z.number().min(0),
  fixedCharges: z.number().min(0).optional(),
  additionalCharges: z.number().min(0).optional(),
});

const calculateMaidSchema = z.object({
  baseSalary: z.number().min(0),
  bonus: z.number().min(0).optional(),
  advance: z.number().min(0).optional(),
  deductions: z.number().min(0).optional(),
});

const voidBillSchema = z.object({
  reason: z.string().min(1, 'Void reason is required'),
});

// List utility bills
utilityRouter.get(
  '/',
  requirePermission('EXPENSES_VIEW'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const periodKey = req.query.periodKey as string | undefined;
      const category = (req.query.category || req.query.utilityType) as string | undefined;
      const status = req.query.status as BillStatus | undefined;

      const bills = await UtilityService.listUtilityBills(messId, {
        periodKey,
        category,
        status,
      });
      sendSuccess(res, bills);
    } catch (err) {
      next(err);
    }
  }
);

// Utility dashboard metrics
utilityRouter.get(
  '/metrics',
  requirePermission('EXPENSES_VIEW'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const periodKey = (req.query.periodKey as string) || new Date().toISOString().slice(0, 7);
      const metrics = await UtilityService.getDashboardMetrics(messId, periodKey);
      sendSuccess(res, metrics);
    } catch (err) {
      next(err);
    }
  }
);

// Helper calculation: electricity
utilityRouter.post(
  '/calculate/electricity',
  validateRequest({ body: calculateElectricitySchema }),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentReading, previousReading, unitRate, fixedCharges, additionalCharges } = req.body;
      const result = UtilityService.calculateElectricityAmount(
        currentReading,
        previousReading,
        unitRate,
        fixedCharges,
        additionalCharges
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
);

// Helper calculation: maid salary
utilityRouter.post(
  '/calculate/maid',
  validateRequest({ body: calculateMaidSchema }),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { baseSalary, bonus, advance, deductions } = req.body;
      const result = UtilityService.calculateMaidSalary(baseSalary, bonus, advance, deductions);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
);

// Get single utility bill
utilityRouter.get(
  '/:id',
  requirePermission('EXPENSES_VIEW'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messId, id } = req.params;
      const bill = await UtilityService.getUtilityBillById(messId, id);
      sendSuccess(res, bill);
    } catch (err) {
      next(err);
    }
  }
);

// Create utility bill
utilityRouter.post(
  '/',
  requirePermission('EXPENSES_MANAGE'),
  validateRequest({ body: createUtilityBillSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.params.messId;
      const createdById = (req as any).user?.userId;
      const bill = await UtilityService.createUtilityBill({
        ...req.body,
        messId,
        createdById,
      });
      sendSuccess(res, bill, 201);
    } catch (err) {
      next(err);
    }
  }
);

// Approve utility bill
utilityRouter.post(
  '/:id/approve',
  requirePermission('EXPENSES_MANAGE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messId, id } = req.params;
      const approvedById = (req as any).user?.userId;
      const bill = await UtilityService.approveUtilityBill(messId, id, approvedById);
      sendSuccess(res, bill);
    } catch (err) {
      next(err);
    }
  }
);

// Post utility bill to financial ledger
utilityRouter.post(
  '/:id/post',
  requirePermission('EXPENSES_MANAGE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messId, id } = req.params;
      const postedById = (req as any).user?.userId;
      const result = await UtilityService.postUtilityBillToLedger(messId, id, postedById);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
);

// Void utility bill
utilityRouter.post(
  '/:id/void',
  requirePermission('EXPENSES_MANAGE'),
  validateRequest({ body: voidBillSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messId, id } = req.params;
      const voidedById = (req as any).user?.userId;
      const bill = await UtilityService.voidUtilityBill(messId, id, req.body.reason, voidedById);
      sendSuccess(res, bill);
    } catch (err) {
      next(err);
    }
  }
);
