import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UserJwtPayload } from '../types/auth.js';

export function generateToken(payload: UserJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): UserJwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as UserJwtPayload;
}
