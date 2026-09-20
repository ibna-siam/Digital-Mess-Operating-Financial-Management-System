import { Request, Response, NextFunction } from 'express';
import { MessService } from '../services/messService.js';
import { sendSuccess } from '../utils/response.js';
import { UnauthorizedError } from '../utils/errors.js';

export async function getUserMesses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const messes = await MessService.getUserMesses(req.user.id);
    sendSuccess(res, messes);
  } catch (error) {
    next(error);
  }
}

export async function createMess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const mess = await MessService.createMess(req.user.id, req.body);
    sendSuccess(res, mess, 201, 'Mess created successfully');
  } catch (error) {
    next(error);
  }
}

export async function getMessById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const messId = req.params.messId;
    const mess = await MessService.getMessById(messId);
    sendSuccess(res, mess);
  } catch (error) {
    next(error);
  }
}

export async function getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const messId = req.params.messId;
    const members = await MessService.getMembers(messId);
    sendSuccess(res, members);
  } catch (error) {
    next(error);
  }
}

export async function joinMess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { joinCode } = req.body;
    const result = await MessService.joinMessByCode(req.user.id, joinCode);
    sendSuccess(res, result, 200, 'Successfully joined mess');
  } catch (error) {
    next(error);
  }
}

export async function regenerateCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const messId = req.params.messId;
    const result = await MessService.regenerateJoinCode(messId, req.user.id);
    sendSuccess(res, result, 200, 'Join code regenerated successfully');
  } catch (error) {
    next(error);
  }
}

