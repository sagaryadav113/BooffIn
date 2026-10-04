// ============================================================================
// BOOFFIN ADMIN PORTAL — REPORT MANAGEMENT SERVICE (SCHEMA ALIGNED)
// ============================================================================

import { supabase } from '../../api/client';
import { AdminReport } from '../types/data';
import { adminAuditService } from './adminAuditService';

const REPORT_SELECT_FIELDS = `
  id,
  reporter_id,
  reported_user_id,
  post_id,
  comment_id,
  reason,
  details,
  status,
  resolved_by,
  resolved_at,
  created_at
`;

export const adminReportService = {
  /**
   * Fetches user reports with optional status filtering from public.content_reports.
   * Permission required: reports.read
   */
  async listReports(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ reports: AdminReport[]; count: number; error: Error | null }> {
    try {
      const limit = Math.min(options?.limit ?? 25, 100);
      const offset = options?.offset ?? 0;

      let query = supabase
        .from('content_reports')
        .select(REPORT_SELECT_FIELDS, { count: 'exact' });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { reports: [], count: 0, error: new Error(error.message) };
      }

      return {
        reports: (data as unknown as AdminReport[]) || [],
        count: count ?? (data?.length || 0),
        error: null,
      };
    } catch (err: any) {
      return { reports: [], count: 0, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Resolves or dismisses a report and records an immutable audit log.
   * Permission required: reports.resolve
   */
  async resolveReport(
    reportId: string,
    status: 'RESOLVED' | 'DISMISSED',
    reason?: string
  ): Promise<{ error: Error | null }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { error: new Error('Unauthorized: Active admin session required.') };
      }

      const { error: updateError } = await supabase
        .from('content_reports')
        .update({
          status,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (updateError) {
        return { error: new Error(updateError.message) };
      }

      // Record audit log
      await adminAuditService.recordAuditLog({
        action: status === 'RESOLVED' ? 'REPORT_RESOLVED' : 'REPORT_DISMISSED',
        targetType: 'REPORT',
        targetId: reportId,
        reason: reason || `Report status updated to ${status}`,
        metadata: { resolved_status: status },
      });

      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Returns count of pending reports for dashboard metrics.
   */
  async getPendingReportsCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('content_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');
      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  },
};
