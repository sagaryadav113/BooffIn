// ============================================================================
// BOOFFIN ADMIN PORTAL — RBAC VALIDATOR & POLICY GUARD
// ============================================================================

import { AdminPermission, AdminRole, AdminStatus } from '../types/roles';
import { hasPermission } from './permissions';

export interface AuthorizationCheckResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Validates full admin context for an action.
 * Enforces active membership status + role + permission.
 */
export function checkAdminAuthorization(params: {
  userId: string | null;
  role: AdminRole | null;
  status: AdminStatus | null;
  requiredPermission?: AdminPermission;
  requireAal2?: boolean;
  currentAal?: 'aal1' | 'aal2' | null;
}): AuthorizationCheckResult {
  const { userId, role, status, requiredPermission, requireAal2, currentAal } = params;

  if (!userId) {
    return { authorized: false, reason: 'Unauthenticated' };
  }

  if (!role || !status) {
    return { authorized: false, reason: 'No admin membership found' };
  }

  if (status !== 'ACTIVE') {
    return { authorized: false, reason: `Admin membership is ${status}` };
  }

  if (requireAal2 && currentAal !== 'aal2') {
    return { authorized: false, reason: 'MFA (AAL2) verification required' };
  }

  if (requiredPermission && !hasPermission(role, requiredPermission)) {
    return { authorized: false, reason: `Missing permission: ${requiredPermission}` };
  }

  return { authorized: true };
}

/**
 * Evaluates whether an admin can self-approve an approval request.
 * Server rule chk_no_self_approval mirror in client.
 */
export function canApproveRequest(params: {
  actorUserId: string;
  actorRole: AdminRole;
  requestedBy: string;
}): boolean {
  const { actorUserId, actorRole, requestedBy } = params;

  // Rule: Requester can NEVER approve their own action (Two-Admin rule)
  if (actorUserId === requestedBy) {
    return false;
  }

  // Only SUPER_ADMIN can approve Stage 1 approval requests
  return actorRole === 'SUPER_ADMIN';
}
