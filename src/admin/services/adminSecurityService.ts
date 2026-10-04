// ============================================================================
// BOOFFIN ADMIN PORTAL — SECURITY & TEAM MANAGEMENT SERVICE (STAGE 2)
// ============================================================================

import { supabase } from '../../api/client';
import { AdminMember, AdminRole } from '../types/roles';
import { adminAuditService } from './adminAuditService';

const ADMIN_MEMBER_SELECT_FIELDS = `
  id,
  user_id,
  role,
  status,
  invited_by,
  created_at,
  updated_at,
  activated_at,
  deactivated_at,
  last_seen_at
`;

export const adminSecurityService = {
  /**
   * Lists all admin members.
   * Permission required: admins.read
   */
  async listAdminMembers(): Promise<{ members: AdminMember[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('admin_members')
        .select(ADMIN_MEMBER_SELECT_FIELDS)
        .order('created_at', { ascending: true });

      if (error) return { members: [], error: new Error(error.message) };
      return { members: (data as unknown as AdminMember[]) || [], error: null };
    } catch (err: any) {
      return { members: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Invites / registers a new admin member.
   * Permission required: admins.invite (Super Admin)
   */
  async inviteAdminMember(params: {
    userId: string;
    role: AdminRole;
  }): Promise<{ member: AdminMember | null; error: Error | null }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { member: null, error: new Error('Unauthorized: Active admin session required.') };
      }

      const { data, error } = await supabase
        .from('admin_members')
        .insert({
          user_id: params.userId,
          role: params.role,
          status: 'ACTIVE',
          invited_by: user.id,
        })
        .select(ADMIN_MEMBER_SELECT_FIELDS)
        .single();

      if (error) return { member: null, error: new Error(error.message) };

      // Record audit log
      await adminAuditService.recordAuditLog({
        action: 'ADMIN_INVITED',
        targetType: 'ADMIN',
        targetId: data.id,
        reason: `Admin membership granted with role ${params.role}`,
        metadata: { target_user_id: params.userId, assigned_role: params.role },
      });

      return { member: data as unknown as AdminMember, error: null };
    } catch (err: any) {
      return { member: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Updates an admin member's role or status.
   * Permission required: admins.role_change / admins.deactivate (Super Admin)
   */
  async updateAdminMember(
    adminId: string,
    updates: { role?: AdminRole; status?: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' }
  ): Promise<{ error: Error | null }> {
    try {
      const { data: currentMember, error: fetchErr } = await supabase
        .from('admin_members')
        .select('id, user_id, role, status')
        .eq('id', adminId)
        .maybeSingle();

      if (fetchErr || !currentMember) {
        return { error: new Error(fetchErr?.message || 'Admin member not found.') };
      }

      const { error: updateError } = await supabase
        .from('admin_members')
        .update(updates)
        .eq('id', adminId);

      if (updateError) {
        return { error: new Error(updateError.message) };
      }

      // Record audit log
      await adminAuditService.recordAuditLog({
        action: updates.role ? 'ADMIN_ROLE_CHANGED' : 'ADMIN_ROLE_CHANGED',
        targetType: 'ADMIN',
        targetId: adminId,
        reason: `Admin updated: ${JSON.stringify(updates)}`,
        metadata: { previous: currentMember, updates },
      });

      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  },
};
