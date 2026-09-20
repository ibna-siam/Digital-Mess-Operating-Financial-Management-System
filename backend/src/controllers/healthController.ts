import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';
import { checkDatabaseHealth } from '../config/database.js';

export async function getHealth(req: Request, res: Response): Promise<void> {
  const dbHealth = await checkDatabaseHealth();

  sendSuccess(res, {
    status: 'ok',
    service: 'messmate-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: {
      status: dbHealth.isConnected ? 'connected' : 'disconnected',
      detail: dbHealth.message,
    },
  });
}
