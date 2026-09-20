import { Router } from 'express';
import { healthRouter } from './healthRoutes.js';
import { authRouter } from './authRoutes.js';
import { messRouter } from './messRoutes.js';
import { dashboardRouter } from './dashboardRoutes.js';
import { publicInvitationRouter } from './invitationRoutes.js';
import { notificationRouter } from './notificationRoutes.js';
import { syncRouter } from './syncRoutes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/messes', messRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/invitations', publicInvitationRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/sync', syncRouter);
