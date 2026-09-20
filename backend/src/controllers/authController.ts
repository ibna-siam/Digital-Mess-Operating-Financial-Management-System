import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { AuditService } from '../services/auditService.js';
import { sendSuccess } from '../utils/response.js';
import { UnauthorizedError } from '../utils/errors.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name, phone, onboarding } = req.body;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
    const result = await AuthService.register({ email, password, name, phone, onboarding });

    if (result.activeMess?.id) {
      await AuditService.log({
        messId: result.activeMess.id,
        userId: result.user.id,
        action: 'MEMBER_JOINED',
        entity: 'MessMember',
        entityId: result.user.id,
        details: JSON.stringify({
          mode: onboarding?.mode || 'REGISTRATION',
          messName: result.activeMess.name,
          role: result.activeMess.myRole,
        }),
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      });
    }

    sendSuccess(res, result, 201, 'User registered successfully');
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
    const result = await AuthService.login({ email, password });

    if (result.activeMess?.id) {
      await AuditService.log({
        messId: result.activeMess.id,
        userId: result.user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: result.user.id,
        details: JSON.stringify({ email: result.user.email, loginAt: new Date().toISOString() }),
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      });
    }

    sendSuccess(res, result, 200, 'Login successful');
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;
    const messId = (req as any).messId || user?.messId;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';

    if (user && messId) {
      await AuditService.log({
        messId,
        userId: user.id,
        action: 'LOGOUT',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({ logoutAt: new Date().toISOString() }),
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      });
    }
  } catch (err) {
    // Non-blocking logout audit
  }
  sendSuccess(res, { message: 'Logged out successfully' });
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const user = await AuthService.getMe(req.user.id);
    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
}
