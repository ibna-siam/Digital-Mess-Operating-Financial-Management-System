import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { SyncService } from '../services/syncService.js';
import { sendSuccess } from '../utils/response.js';

export const syncRouter = Router();

syncRouter.use(authMiddleware);

const syncActionsSchema = z.object({
  actions: z.array(
    z.object({
      idempotencyKey: z.string().min(1, 'idempotencyKey is required'),
      actionType: z.string().min(1, 'actionType is required'),
      messId: z.string().uuid().optional(),
      payload: z.record(z.any()).default({}),
      clientTimestamp: z.string().optional(),
    })
  ).min(1, 'At least one action is required to sync'),
});

// POST /api/v1/sync/actions — Process queued offline actions
syncRouter.post(
  '/actions',
  validateRequest({ body: syncActionsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { actions } = req.body;

      const results = await SyncService.processActions(userId, actions);

      sendSuccess(
        res,
        {
          total: actions.length,
          processed: results.length,
          results,
        },
        200,
        'Offline actions processed successfully'
      );
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/sync/status — Health check and server time for sync clock drift detection
syncRouter.get(
  '/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        {
          online: true,
          serverTime: new Date().toISOString(),
          userId: req.user!.id,
        },
        200,
        'Sync service is active'
      );
    } catch (err) {
      next(err);
    }
  }
);
