import { AppRole, AppPermission } from './rbac.js';

export interface UserJwtPayload {
  userId: string;
  email: string;
  messId?: string;
  role?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatarUrl?: string | null;
  messId?: string;
}

export interface AuthenticatedMember {
  id: string;
  messId: string;
  userId: string;
  role: AppRole;
  roomNo?: string | null;
  status: string;
  permissions: AppPermission[];
}
