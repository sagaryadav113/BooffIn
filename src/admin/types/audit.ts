// ============================================================================
// BOOFFIN ADMIN PORTAL — AUDIT LOGS TYPE DEFINITIONS
// ============================================================================

import { AdminRole } from './roles';

export type AdminAuditAction =
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT'
  | 'ADMIN_MFA_CHALLENGE'
  | 'ADMIN_MFA_VERIFIED'
  | 'ADMIN_INVITED'
  | 'ADMIN_DEACTIVATED'
  | 'ADMIN_ROLE_CHANGED'
  | 'USER_VIEWED'
  | 'USER_SUSPENDED'
  | 'USER_UNSUSPENDED'
  | 'REPORT_VIEWED'
  | 'REPORT_RESOLVED'
  | 'POST_REMOVED'
  | 'COMMENT_REMOVED'
  | 'DELETE_REQUESTED'
  | 'DELETE_APPROVED'
  | 'DELETE_REJECTED'
  | 'DELETE_EXECUTED'
  | 'SECURITY_CONFIG_UPDATED';

export type AdminTargetType =
  | 'USER'
  | 'POST'
  | 'COMMENT'
  | 'REPORT'
  | 'ADMIN'
  | 'APPROVAL'
  | 'SECURITY'
  | 'SYSTEM';

export interface AdminAuditLog {
  id: string;
  actor_user_id: string | null;
  actor_role: AdminRole;
  action: AdminAuditAction;
  target_type: AdminTargetType;
  target_id: string | null;
  reason: string | null;
  approval_id: string | null;
  success: boolean;
  error_code: string | null;
  metadata: Record<string, unknown>;
  ip_address?: string | null;
  created_at: string;
  // Hydrated actor information
  actor_email?: string;
  actor_name?: string;
}

export interface AdminAuditFilter {
  actorUserId?: string;
  action?: AdminAuditAction;
  targetType?: AdminTargetType;
  startDate?: string;
  endDate?: string;
  successOnly?: boolean;
  limit?: number;
  offset?: number;
}
