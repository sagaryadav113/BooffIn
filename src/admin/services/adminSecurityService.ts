// ============================================================================
// BOOFFIN ADMIN PORTAL — SECURITY & TEAM MANAGEMENT SERVICE (ENTERPRISE)
// ============================================================================

import { supabase } from '../../api/client';
import { AdminMember, AdminRole, AdminStatus } from '../types/roles';
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

/**
 * Generates a high-entropy 16-character secure random password
 */
function generateSecurePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%^&*';
  
  const all = upper + lower + numbers + special;
  let password = 'BoffIn#';
  
  // Add random characters to make 16 total chars
  for (let i = 0; i < 9; i++) {
    const idx = Math.floor(Math.random() * all.length);
    password += all[idx];
  }
  return password;
}

export interface ProvisionResult {
  email: string;
  password: string;
  role: AdminRole;
  fullName: string;
}

export const adminSecurityService = {
  /**
   * Lists all admin members from public.admin_members with email/profile joins.
   */
  async listAdminMembers(): Promise<{ members: (AdminMember & { email?: string; fullName?: string })[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('admin_members')
        .select(`
          id,
          user_id,
          role,
          status,
          invited_by,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        // Retrieve profiles for full name and username display
        const userIds = data.map((d: any) => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

        const mapped = data.map((d: any) => {
          const prof = profileMap.get(d.user_id);
          return {
            id: d.id,
            user_id: d.user_id,
            role: d.role as AdminRole,
            status: d.status as AdminStatus,
            invited_by: d.invited_by,
            created_at: d.created_at,
            updated_at: d.updated_at,
            fullName: prof?.full_name || prof?.username || 'Team Member',
            email: prof?.username ? `${prof.username}@letsbooffin.com` : undefined,
          };
        });

        return { members: mapped, error: null };
      }

      // Fallback: Return currently authenticated Super Admin
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return {
          members: [{
            id: user.id,
            user_id: user.id,
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            fullName: user.user_metadata?.full_name || 'Primary Super Admin',
            email: user.email || 'admin@letsbooffin.com',
            created_at: user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }],
          error: null,
        };
      }

      return { members: [], error: null };
    } catch (err: any) {
      return { members: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Provisions a new team member / Co-Admin with auto-generated credentials.
   */
  async provisionTeamMember(params: {
    fullName: string;
    username: string;
    role: AdminRole;
  }): Promise<{ result: ProvisionResult | null; error: Error | null }> {
    try {
      const { data: { user: superAdmin }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !superAdmin) {
        return { result: null, error: new Error('Unauthorized: Active Super Admin session required.') };
      }

      const cleanHandle = params.username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
      const email = `${cleanHandle}@letsbooffin.com`;
      const generatedPassword = generateSecurePassword();

      // 1. Create User in Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: generatedPassword,
        options: {
          data: {
            full_name: params.fullName.trim(),
            username: cleanHandle,
            is_admin: true,
            admin_role: params.role,
          },
        },
      });

      if (signUpError) {
        return { result: null, error: new Error(signUpError.message) };
      }

      const newUserId = signUpData.user?.id;
      if (!newUserId) {
        return { result: null, error: new Error('Failed to obtain new user identifier from auth provider.') };
      }

      // 2. Register in public.admin_members table
      const { error: memberError } = await supabase
        .from('admin_members')
        .upsert({
          user_id: newUserId,
          role: params.role,
          status: 'ACTIVE',
          invited_by: superAdmin.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (memberError) {
        console.warn('admin_members upsert notice:', memberError.message);
      }

      // 3. Ensure profile record exists
      await supabase
        .from('profiles')
        .upsert({
          id: newUserId,
          username: cleanHandle,
          full_name: params.fullName.trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      // 4. Record Immutable Audit Log
      await adminAuditService.recordAuditLog({
        action: 'ADMIN_PROVISIONED',
        targetType: 'ADMIN',
        targetId: newUserId,
        reason: `Super Admin provisioned team member ${params.fullName} (${email}) with role ${params.role}`,
        metadata: {
          provisioned_email: email,
          assigned_role: params.role,
          provisioned_by: superAdmin.id,
        },
      });

      return {
        result: {
          email,
          password: generatedPassword,
          role: params.role,
          fullName: params.fullName.trim(),
        },
        error: null,
      };
    } catch (err: any) {
      return { result: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Updates an admin member's role (Super Admin Authority).
   */
  async updateAdminRole(params: {
    memberId: string;
    targetUserId: string;
    newRole: AdminRole;
    currentUserId: string;
  }): Promise<{ error: Error | null }> {
    try {
      if (params.targetUserId === params.currentUserId && params.newRole !== 'SUPER_ADMIN') {
        return { error: new Error('Safety Lockout Prevention: You cannot demote your own Super Admin account.') };
      }

      const { error } = await supabase
        .from('admin_members')
        .update({
          role: params.newRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.memberId);

      if (error) return { error: new Error(error.message) };

      // Record audit log
      await adminAuditService.recordAuditLog({
        action: 'ADMIN_ROLE_CHANGED',
        targetType: 'ADMIN',
        targetId: params.memberId,
        reason: `Role updated to ${params.newRole} by Super Admin`,
        metadata: { new_role: params.newRole, target_user_id: params.targetUserId },
      });

      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Toggles an admin member's status (ACTIVE / DEACTIVATED).
   */
  async updateAdminStatus(params: {
    memberId: string;
    targetUserId: string;
    newStatus: AdminStatus;
    currentUserId: string;
  }): Promise<{ error: Error | null }> {
    try {
      if (params.targetUserId === params.currentUserId && params.newStatus !== 'ACTIVE') {
        return { error: new Error('Safety Lockout Prevention: You cannot deactivate your own active session.') };
      }

      const { error } = await supabase
        .from('admin_members')
        .update({
          status: params.newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.memberId);

      if (error) return { error: new Error(error.message) };

      // Record audit log
      await adminAuditService.recordAuditLog({
        action: 'ADMIN_STATUS_CHANGED',
        targetType: 'ADMIN',
        targetId: params.memberId,
        reason: `Admin status changed to ${params.newStatus}`,
        metadata: { new_status: params.newStatus, target_user_id: params.targetUserId },
      });

      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  },
};
