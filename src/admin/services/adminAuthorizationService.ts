// ============================================================================
// BOOFFIN ADMIN PORTAL — AUTHORIZATION SERVICE
// ============================================================================

import { supabase } from '../../api/client';
import { AdminPermission, AdminRole, AdminStatus } from '../types/roles';
import { checkAdminAuthorization } from '../lib/rbac';
import { hasPermission } from '../lib/permissions';

export const adminAuthorizationService = {
  /**
   * Fetches active admin membership for a given user ID.
   */
  async fetchAdminMember(userId: string): Promise<{ role: AdminRole; status: AdminStatus } | null> {
    try {
      const { data, error } = await supabase
        .from('admin_members')
        .select('role, status')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;
      return {
        role: data.role as AdminRole,
        status: data.status as AdminStatus,
      };
    } catch {
      return null;
    }
  },

  /**
   * Performs an authoritative client-side preflight check.
   * Note: Database RLS / SECURITY DEFINER functions remain the ultimate authority.
   */
  async verifyPermission(permission: AdminPermission): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const membership = await this.fetchAdminMember(user.id);
    if (!membership || membership.status !== 'ACTIVE') return false;

    return hasPermission(membership.role, permission);
  },

  /**
   * Evaluates complete admin authorization.
   */
  checkAuthorization: checkAdminAuthorization,
};
