import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/token.js';
import { UnauthorizedError } from '../utils/errors.js';
import { prisma, isDatabaseOnline } from '../config/database.js';

interface CachedUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  timestamp: number;
}

const userCache = new Map<string, CachedUser>();
const USER_CACHE_TTL_MS = 60_000; // 60 seconds

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or malformed');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    // 1. Check user cache first for blazing fast verification
    const cachedUser = userCache.get(payload.userId);
    if (cachedUser && (Date.now() - cachedUser.timestamp < USER_CACHE_TTL_MS)) {
      if (!cachedUser.isActive) {
        throw new UnauthorizedError('User account not found or deactivated');
      }
      req.user = {
        id: cachedUser.id,
        email: cachedUser.email,
        name: cachedUser.name,
        phone: cachedUser.phone || undefined,
        avatarUrl: cachedUser.avatarUrl || undefined,
        messId: payload.messId,
      };
      next();
      return;
    }

    const dbOnline = await isDatabaseOnline();
    if (!dbOnline && process.env.NODE_ENV !== 'production') {
      req.user = {
        id: payload.userId,
        email: payload.email,
        name: payload.email.split('@')[0],
        messId: payload.messId,
      };
      next();
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError('User account not found or deactivated');
      }

      // Store in memory cache
      userCache.set(user.id, {
        ...user,
        timestamp: Date.now(),
      });

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || undefined,
        avatarUrl: user.avatarUrl || undefined,
        messId: payload.messId,
      };
    } catch (dbErr: unknown) {
      // If database is disconnected or querying fails, pass token payload in development/test
      if (process.env.NODE_ENV !== 'production') {
        req.user = {
          id: payload.userId,
          email: payload.email,
          name: payload.email.split('@')[0],
          messId: payload.messId,
        };
      } else {
        throw dbErr;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}
