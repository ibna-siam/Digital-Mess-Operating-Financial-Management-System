import { AuthenticatedUser, AuthenticatedMember } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      member?: AuthenticatedMember;
      messId?: string;
    }
  }
}

export {};
