import { Response } from 'express';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/api.js';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, message?: string): Response {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  statusCode = 500,
  code = 'INTERNAL_SERVER_ERROR',
  message = 'An unexpected error occurred',
  fields?: Record<string, string[]>
): Response {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
    },
  };
  return res.status(statusCode).json(payload);
}
