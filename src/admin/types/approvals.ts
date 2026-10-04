// ============================================================================
// BOOFFIN ADMIN PORTAL — DUAL-ADMIN APPROVAL TYPE DEFINITIONS
// ============================================================================

export type ApprovalActionType =
  | 'ACCOUNT_DELETION'
  | 'PERMANENT_BAN'
  | 'DATA_EXPORT'
  | 'ROLE_ELEVATION'
  | 'BULK_CONTENT_REMOVAL';

export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface AdminApprovalRequest {
  id: string;
  action_type: ApprovalActionType;
  target_type: string;
  target_id: string;
  requested_by: string;
  reason: string;
  status: ApprovalStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  executed_at?: string | null;
  created_at: string;
  expires_at: string;
  // Hydrated requester and approver metadata
  requester_email?: string;
  requester_name?: string;
  approver_email?: string;
  approver_name?: string;
}
