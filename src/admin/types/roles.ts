// ============================================================================
// BOOFFIN ADMIN PORTAL — ROLES & PERMISSIONS TYPE DEFINITIONS
// ============================================================================

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';

export type AdminStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface AdminMember {
  id: string;
  user_id: string;
  role: AdminRole;
  status: AdminStatus;
  invited_by?: string | null;
  created_at: string;
  updated_at: string;
  activated_at?: string | null;
  deactivated_at?: string | null;
  last_seen_at?: string | null;
  email?: string;
  display_name?: string;
}

export type AdminPermission =
  // User Management
  | 'users.read'
  | 'users.view_sensitive'
  | 'users.suspend'
  | 'users.unsuspend'
  | 'users.delete.request'
  | 'users.delete.approve'
  // Posts & Content Moderation
  | 'posts.read'
  | 'posts.remove'
  | 'comments.read'
  | 'comments.remove'
  // Reports
  | 'reports.read'
  | 'reports.resolve'
  // Admin & Team Management
  | 'admins.read'
  | 'admins.invite'
  | 'admins.deactivate'
  | 'admins.role_change'
  // Audit Logs
  | 'audit_logs.read'
  // Security
  | 'security.read'
  | 'security.manage'
  // System Health & Monitoring
  | 'system_health.read'
  // Dual-Approval Workflow
  | 'approvals.read'
  | 'approvals.create'
  | 'approvals.approve'
  | 'approvals.reject';

export interface AdminSessionState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userId: string | null;
  email: string | null;
  role: AdminRole | null;
  status: AdminStatus | null;
  aal: 'aal1' | 'aal2' | null;
  nextAal?: 'aal1' | 'aal2' | null;
  hasEnrolledFactor?: boolean;
  isMfaRequired: boolean;
  isMfaVerified: boolean;
  permissions: AdminPermission[];
  isLoading: boolean;
  error: string | null;
}
