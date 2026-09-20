import { Request, Response, NextFunction } from 'express';
import { AppPermission, AppRole } from '../types/rbac.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { RbacService } from '../services/rbacService.js';

export function requirePermission(permission: AppPermission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!req.member) {
      return next(new ForbiddenError('Mess workspace context required'));
    }

    const hasAccess = RbacService.hasPermission(req.member.permissions, permission);
    if (!hasAccess) {
      return next(new ForbiddenError(`Permission denied: requires '${permission}'`));
    }

    next();
  };
}

export function requireRole(allowedRoles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!req.member) {
      return next(new ForbiddenError('Mess workspace context required'));
    }

    const hasRole = RbacService.hasRole(req.member.role, allowedRoles);
    if (!hasRole) {
      return next(new ForbiddenError(`Access denied: role must be one of [${allowedRoles.join(', ')}]`));
    }

    next();
  };
}
