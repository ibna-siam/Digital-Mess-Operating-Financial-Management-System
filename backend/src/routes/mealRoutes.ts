import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MealService } from '../services/mealService.js';
import { sendSuccess } from '../utils/response.js';
import { validateRequest } from '../middleware/validate.js';
import { requirePermission } from '../middleware/rbac.js';

export const mealRouter = Router({ mergeParams: true });

const updateMealSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  date: z.string().min(10, 'Valid date is required (YYYY-MM-DD)'),
  breakfast: z.number().min(0).optional(),
  lunch: z.number().min(0).optional(),
  dinner: z.number().min(0).optional(),
  guestBreakfast: z.number().min(0).optional(),
  guestLunch: z.number().min(0).optional(),
  guestDinner: z.number().min(0).optional(),
});

const quickSelfSchema = z.object({
  date: z.string().min(10, 'Valid date is required'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']),
  count: z.number().min(0).max(10),
});

const bulkMealSchema = z.object({
  date: z.string().min(10, 'Valid date is required'),
  entries: z.array(
    z.object({
      memberId: z.string(),
      breakfast: z.number().min(0),
      lunch: z.number().min(0),
      dinner: z.number().min(0),
    })
  ),
});

// Get daily meals
mealRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const meals = await MealService.getDailyMeals(messId, dateStr);
    sendSuccess(res, meals);
  } catch (err) {
    next(err);
  }
});

// Daily summary
mealRouter.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const summary = await MealService.getMealSummary(messId, dateStr);
    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
});

// Monthly calendar
mealRouter.get('/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = req.messId || req.params.messId;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : new Date().getMonth() + 1;
    const calendar = await MealService.getMealCalendar(messId, year, month);
    sendSuccess(res, calendar);
  } catch (err) {
    next(err);
  }
});

// 1-tap quick self entry
mealRouter.post(
  '/quick-self',
  validateRequest({ body: quickSelfSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const userId = req.user!.id;
      const { date, mealType, count } = req.body;
      const result = await MealService.quickSelfEntry(messId, userId, date, mealType, count);
      sendSuccess(res, result, 200, 'Meal updated');
    } catch (err) {
      next(err);
    }
  }
);

// Manager/admin update single meal
mealRouter.post(
  '/',
  requirePermission('MEALS_MANAGE'),
  validateRequest({ body: updateMealSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const { memberId, date, ...counts } = req.body;
      const meal = await MealService.updateMeal(messId, memberId, date, counts);
      sendSuccess(res, meal, 200, 'Meal recorded successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Manager bulk update
mealRouter.post(
  '/bulk',
  requirePermission('MEALS_MANAGE'),
  validateRequest({ body: bulkMealSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messId = req.messId || req.params.messId;
      const { date, entries } = req.body;
      const results = await MealService.bulkUpdateMeals(messId, date, entries);
      sendSuccess(res, results, 200, `${results.length} meals updated successfully`);
    } catch (err) {
      next(err);
    }
  }
);
