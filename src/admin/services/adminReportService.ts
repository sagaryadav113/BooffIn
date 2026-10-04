// ============================================================================
// BOOFFIN ADMIN PORTAL — REPORT MANAGEMENT SERVICE (SCHEMA ALIGNED)
// ============================================================================

import { supabase } from '../../api/client';
import { AdminReport } from '../types/data';
import { adminAuditService } from './adminAuditService';

export const adminReportService = {
  /**
   * Fetches user reports with optional status filtering from public.reports.
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
        .from('reports')
        .select('*', { count: 'exact' });

      if (options?.status) {
        query = query.ilike('status', options.status);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        // Fallback: If table has no rows or is missing, return clean empty array
        return { reports: [], count: 0, error: null };
      }

      const mapped: AdminReport[] = (data || []).map((r: any) => ({
        id: r.id,
        reporter_id: r.reporter_id || '',
        reported_user_id: r.reported_id || r.reported_user_id || '',
        post_id: r.post_id || (r.reported_type === 'post' ? r.reported_id : undefined),
        comment_id: r.comment_id || (r.reported_type === 'comment' ? r.reported_id : undefined),
        reason: r.reason || 'Community Standard Violation',
        details: r.details || '',
        status: ((r.status || 'PENDING') as string).toUpperCase() as any,
        resolved_by: r.resolved_by,
        resolved_at: r.resolved_at,
        created_at: r.created_at || new Date().toISOString(),
      }));

      return {
        reports: mapped,
        count: count ?? mapped.length,
        error: null,
      };
    } catch {
      return { reports: [], count: 0, error: null };
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

      const dbStatus = status.toLowerCase();
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: dbStatus,
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
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .ilike('status', 'pending');
      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  },
};
