import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import jwt from 'jsonwebtoken';

const { JsonWebTokenError, TokenExpiredError } = jwt;
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // 1. Handled AppError
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.fields);
    return;
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'root';
      if (!fields[key]) fields[key] = [];
      fields[key].push(issue.message);
    }
    sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', fields);
    return;
  }

  // 3. JWT Errors
  if (err instanceof TokenExpiredError) {
    sendError(res, 401, 'TOKEN_EXPIRED', 'Your authentication session has expired. Please log in again.');
    return;
  }
  if (err instanceof JsonWebTokenError) {
    sendError(res, 401, 'INVALID_TOKEN', 'Invalid authentication token.');
    return;
  }

  // 4. Unexpected / Server Errors
  logger.error('Unhandled server error:', {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? err.stack || err.message : String(err),
  });

  const message =
    env.NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : err instanceof Error
      ? err.message
      : 'Internal server error';

  sendError(res, 500, 'INTERNAL_SERVER_ERROR', message);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`);
}
