// ============================================================================
// BOOFFIN ADMIN PORTAL — CENTRALIZED PERMISSION MATRIX & ENGINE (STAGE 3A)
// ============================================================================

import { AdminPermission, AdminRole } from '../types/roles';

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  SUPER_ADMIN: [
    'users.read',
    'users.view_sensitive',
    'users.suspend',
    'users.unsuspend',
    'users.delete.request',
    'users.delete.approve',
    'posts.read',
    'posts.remove',
    'comments.read',
    'comments.remove',
    'reports.read',
    'reports.resolve',
    'admins.read',
    'admins.invite',
    'admins.deactivate',
    'admins.role_change',
    'audit_logs.read',
    'security.read',
    'security.manage',
    'system_health.read',
    'approvals.read',
    'approvals.create',
    'approvals.approve',
    'approvals.reject',
  ],

  ADMIN: [
    'users.read',
    'users.view_sensitive',
    'users.suspend',
    'users.unsuspend',
    'users.delete.request', // Can request, cannot approve alone
    'posts.read',
    'posts.remove',
    'comments.read',
    'comments.remove',
    'reports.read',
    'reports.resolve',
    'admins.read',
    'audit_logs.read',
    'security.read',
    'system_health.read',
    'approvals.read',
    'approvals.create',
  ],

  MODERATOR: [
    'users.read',
    'posts.read',
    'posts.remove',
    'comments.read',
    'comments.remove',
    'reports.read',
    'reports.resolve',
  ],
};

/**
 * High-risk administrative permissions requiring Authenticator Assurance Level 2 (AAL2).
 */
export const AAL2_REQUIRED_PERMISSIONS: AdminPermission[] = [
  'approvals.approve',
  'security.manage',
  'admins.role_change',
  'admins.deactivate',
  'users.delete.approve',
];

/**
 * Returns whether a given permission requires AAL2 MFA token elevation.
 */
export function isAal2RequiredForPermission(permission: AdminPermission): boolean {
  return AAL2_REQUIRED_PERMISSIONS.includes(permission);
}

/**
 * Evaluates whether a role possesses a specific permission.
 */
export function hasPermission(role: AdminRole | null | undefined, permission: AdminPermission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Evaluates whether an admin with granted permissions and current AAL can execute an action.
 */
export function evaluatePermission(
  grantedPermissions: AdminPermission[],
  permission: AdminPermission,
  currentAal: 'aal1' | 'aal2' | null = 'aal1'
): boolean {
  if (!grantedPermissions.includes(permission)) {
    return false;
  }
  if (isAal2RequiredForPermission(permission) && currentAal !== 'aal2') {
    return false;
  }
  return true;
}

/**
 * Returns list of all granted permissions for a given role.
 */
export function getPermissionsForRole(role: AdminRole | null | undefined): AdminPermission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Evaluates if a role has higher or equal rank compared to a target role.
 */
export function isRoleSuperiorOrEqual(actorRole: AdminRole, targetRole: AdminRole): boolean {
  const hierarchy: Record<AdminRole, number> = {
    SUPER_ADMIN: 3,
    ADMIN: 2,
    MODERATOR: 1,
  };
  return hierarchy[actorRole] >= hierarchy[targetRole];
}
