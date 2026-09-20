import { AppRole, AppPermission, ROLE_PERMISSIONS } from '../types/rbac.js';

export class RbacService {
  public static getPermissionsForRole(role: AppRole): AppPermission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  public static hasPermission(userPermissions: AppPermission[], requiredPermission: AppPermission): boolean {
    return userPermissions.includes(requiredPermission);
  }

  public static hasRole(userRole: AppRole, allowedRoles: AppRole[]): boolean {
    if (allowedRoles.includes('MANAGER') && userRole === 'OWNER') {
      return true;
    }
    return allowedRoles.includes(userRole);
  }
}
