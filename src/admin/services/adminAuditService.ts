// ============================================================================
// BOOFFIN ADMIN PORTAL — AUDIT LOG SERVICE (STAGE 2 REAL DATA WIRING)
// ============================================================================

import { supabase } from '../../api/client';
import { AdminAuditFilter, AdminAuditLog } from '../types/audit';

const AUDIT_SELECT_FIELDS = `
  id,
  actor_user_id,
  actor_role,
  action,
  target_type,
  target_id,
  reason,
  approval_id,
  success,
  error_code,
  metadata,
  ip_address,
  created_at
`;

export const adminAuditService = {
  /**
   * Fetches immutable audit logs with optional filters.
   * Permission required: audit_logs.read
   */
  async listAuditLogs(filter?: AdminAuditFilter): Promise<{ logs: AdminAuditLog[]; count: number; error: Error | null }> {
    try {
      const limit = Math.min(filter?.limit ?? 50, 200);
      const offset = filter?.offset ?? 0;

      let query = supabase
        .from('admin_audit_logs')
        .select(AUDIT_SELECT_FIELDS, { count: 'exact' });

      if (filter?.action) {
        query = query.eq('action', filter.action);
      }
      if (filter?.targetType) {
        query = query.eq('target_type', filter.targetType);
      }
      if (filter?.actorUserId) {
        query = query.eq('actor_user_id', filter.actorUserId);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { logs: [], count: 0, error: new Error(error.message) };
      }

      return {
        logs: (data as unknown as AdminAuditLog[]) || [],
        count: count ?? (data?.length || 0),
        error: null,
      };
    } catch (err: any) {
      return { logs: [], count: 0, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Records an audit log entry via the SECURITY DEFINER function record_admin_audit_log.
   * Actor identity and role are derived server-side from auth.uid().
   */
  async recordAuditLog(params: {
    action: string;
    targetType: string;
    targetId?: string;
    reason?: string;
    approvalId?: string;
    success?: boolean;
    errorCode?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ logId: string | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('record_admin_audit_log', {
        p_action: params.action,
        p_target_type: params.targetType,
        p_target_id: params.targetId ?? null,
        p_reason: params.reason ?? null,
        p_approval_id: params.approvalId ?? null,
        p_success: params.success ?? true,
        p_error_code: params.errorCode ?? null,
        p_metadata: params.metadata ?? {},
      });

      if (error) return { logId: null, error: new Error(error.message) };
      return { logId: data as string, error: null };
    } catch (err: any) {
      return { logId: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Count of recorded audit logs for dashboard metrics.
   */
  async getAuditLogsCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('admin_audit_logs')
        .select('*', { count: 'exact', head: true });
      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  },
};
