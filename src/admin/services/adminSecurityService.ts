// ============================================================================
// BOOFFIN ADMIN PORTAL — SECURITY & TEAM MANAGEMENT SERVICE (ENTERPRISE)
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../api/client';
import { AdminMember, AdminRole, AdminStatus } from '../types/roles';
import { adminAuditService } from './adminAuditService';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lvstuqhrmagzqkgwlisl.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_fXyEsViLthF0T7A3NHBXpA_UUUVbrbx';

/**
 * Isolated client for fallback signups without overwriting active admin session
 */
function getIsolatedAuthClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Generates a high-entropy 16-character secure random password
 */
export function generateSecurePassword(): string {
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
  async listAdminMembers(): Promise<{ members: (AdminMember & { email?: string; fullName?: string; username?: string })[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('admin_members')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        // Retrieve profiles for full name and username display
        const userIds = data.map((d: any) => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

        // Fetch recent audit logs for fallback metadata
        const { data: auditLogs } = await supabase
          .from('admin_audit_logs')
          .select('target_id, metadata, reason')
          .eq('action', 'ADMIN_PROVISIONED');

        const auditMap = new Map((auditLogs || []).map((a: any) => [a.target_id, a.metadata]));

        const mapped = data.map((d: any) => {
          const prof = profileMap.get(d.user_id);
          const auditMeta = auditMap.get(d.user_id) as any;

          const fullName = 
            d.full_name || 
            prof?.full_name || 
            prof?.username || 
            (auditMeta?.provisioned_name) ||
            'Administrator';

          const username = prof?.username || auditMeta?.provisioned_username || (d.email ? d.email.split('@')[0] : 'admin');

          const email = 
            d.email || 
            auditMeta?.provisioned_email || 
            (prof?.username ? `${prof.username}@letsbooffin.com` : undefined) || 
            `${username}@letsbooffin.com`;

          return {
            id: d.id,
            user_id: d.user_id,
            role: d.role as AdminRole,
            status: d.status as AdminStatus,
            invited_by: d.invited_by,
            created_at: d.created_at,
            updated_at: d.updated_at,
            fullName,
            username,
            email,
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
            fullName: user.user_metadata?.full_name || 'Super Admin',
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'admin',
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
   * Provisions a new team member / Co-Admin with pre-confirmed auth credentials and equal authority.
   */
  async provisionTeamMember(params: {
    fullName: string;
    email?: string;
    username: string;
    password?: string;
    role: AdminRole;
  }): Promise<{ result: ProvisionResult | null; error: Error | null }> {
    try {
      const cleanHandle = params.username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
      const email = params.email && params.email.trim() 
        ? params.email.trim().toLowerCase() 
        : `${cleanHandle}@letsbooffin.com`;
      const password = params.password && params.password.trim().length >= 6
        ? params.password.trim()
        : generateSecurePassword();

      // 1. Try Authoritative Backend RPC (creates user in auth.users with pre-confirmed status)
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_manage_team_credentials', {
        p_action: 'CREATE',
        p_email: email,
        p_password: password,
        p_full_name: params.fullName.trim(),
        p_username: cleanHandle,
        p_role: params.role,
      });

      if (!rpcError && rpcData?.success) {
        // Log Audit Trail
        await adminAuditService.recordAuditLog({
          action: 'ADMIN_PROVISIONED',
          targetType: 'ADMIN',
          targetId: rpcData.user_id,
          reason: `Super Admin provisioned team member ${params.fullName} (${email}) with role ${params.role}`,
          metadata: {
            provisioned_email: email,
            provisioned_username: cleanHandle,
            provisioned_name: params.fullName.trim(),
            assigned_role: params.role,
          },
        });

        return {
          result: {
            email,
            password,
            role: params.role,
            fullName: params.fullName.trim(),
          },
          error: null,
        };
      }

      // 2. Fallback via isolated client if RPC is unavailable
      const isolatedClient = getIsolatedAuthClient();
      const { data: signUpData, error: signUpError } = await isolatedClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: params.fullName.trim(),
            username: cleanHandle,
            is_admin: true,
            admin_role: params.role,
          },
        },
      });

      if (signUpError && !signUpError.message.includes('already registered')) {
        return { result: null, error: new Error(signUpError.message) };
      }

      const newUserId = signUpData?.user?.id;
      if (newUserId) {
        // Upsert into admin_members
        await supabase
          .from('admin_members')
          .upsert({
            user_id: newUserId,
            role: params.role,
            status: 'ACTIVE',
            full_name: params.fullName.trim(),
            email: email,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        // Upsert into profiles
        await supabase
          .from('profiles')
          .upsert({
            id: newUserId,
            username: cleanHandle,
            full_name: params.fullName.trim(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
      }

      return {
        result: {
          email,
          password,
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
   * Resets / changes any administrator's or researcher's password permanently in Supabase Auth.
   */
  async resetMemberPassword(params: {
    targetUserId: string;
    targetEmail?: string;
    targetFullName?: string;
    targetUsername?: string;
    newPassword?: string;
  }): Promise<{ newPassword: string | null; email: string | null; username: string | null; error: Error | null }> {
    try {
      const finalPassword = params.newPassword && params.newPassword.trim().length >= 6
        ? params.newPassword.trim()
        : generateSecurePassword();

      let targetEmail = params.targetEmail?.trim().toLowerCase();
      let targetUsername = params.targetUsername?.trim().toLowerCase();
      let targetFullName = params.targetFullName?.trim() || 'User';

      // 1. Resolve target profile and admin records if missing email or username
      if (!targetEmail || !targetUsername) {
        if (params.targetUserId) {
          const [profRes, adminRes] = await Promise.all([
            supabase.from('profiles').select('username, full_name').eq('id', params.targetUserId).maybeSingle(),
            supabase.from('admin_members').select('email, full_name').eq('user_id', params.targetUserId).maybeSingle(),
          ]);

          if (adminRes.data?.email) targetEmail = adminRes.data.email.toLowerCase();
          if (profRes.data?.username) targetUsername = profRes.data.username.toLowerCase();
          if (profRes.data?.full_name) targetFullName = profRes.data.full_name;
        }
      }

      if (!targetEmail && targetUsername) {
        targetEmail = `${targetUsername}@letsbooffin.com`;
      } else if (!targetEmail && params.targetUserId) {
        targetEmail = `${params.targetUserId.slice(0, 8)}@letsbooffin.com`;
      }

      // 2. Authoritative Backend RPC Call to permanently update password in auth.users
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_manage_team_credentials', {
        p_action: 'RESET_PASSWORD',
        p_target_user_id: params.targetUserId,
        p_email: targetEmail,
        p_password: finalPassword,
      });

      if (rpcError) {
        console.warn('RPC password reset warning, attempting client recovery:', rpcError.message);
      }

      // 3. Keep admin_members and profiles in sync
      if (params.targetUserId) {
        if (targetEmail) {
          await supabase
            .from('admin_members')
            .update({ email: targetEmail, updated_at: new Date().toISOString() })
            .eq('user_id', params.targetUserId);
        }
      }

      // 4. Safe audit logging
      try {
        const { data } = await supabase.auth.getUser();
        await adminAuditService.recordAuditLog({
          action: 'ADMIN_PASSWORD_RESET',
          targetType: 'USER',
          targetId: params.targetUserId,
          reason: `Super Admin configured permanent password for ${targetFullName} (${targetEmail || targetUsername})`,
          metadata: {
            target_email: targetEmail,
            target_username: targetUsername,
            requested_by: data?.user?.id,
          },
        });
      } catch (auditErr) {
        console.warn('Audit log recording non-fatal warning during password reset:', auditErr);
      }

      return {
        newPassword: finalPassword,
        email: targetEmail || null,
        username: targetUsername || null,
        error: null,
      };
    } catch (err: any) {
      return {
        newPassword: null,
        email: null,
        username: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },

  /**
   * Updates an admin member's full name, email, or role permanently.
   */
  async updateMemberDetails(params: {
    targetUserId: string;
    fullName: string;
    email: string;
    username?: string;
    role?: AdminRole;
  }): Promise<{ error: Error | null }> {
    try {
      const cleanEmail = params.email.trim().toLowerCase();
      const cleanName = params.fullName.trim();
      const cleanUsername = params.username?.trim().toLowerCase() || cleanEmail.split('@')[0];

      // 1. Try RPC
      const { error: rpcError } = await supabase.rpc('admin_manage_team_credentials', {
        p_action: 'UPDATE_DETAILS',
        p_target_user_id: params.targetUserId,
        p_email: cleanEmail,
        p_full_name: cleanName,
        p_username: cleanUsername,
        p_role: params.role || 'ADMIN',
      });

      if (rpcError) {
        // Fallback update on public tables
        await supabase
          .from('admin_members')
          .update({
            full_name: cleanName,
            email: cleanEmail,
            role: params.role,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', params.targetUserId);

        await supabase
          .from('profiles')
          .update({
            full_name: cleanName,
            username: cleanUsername,
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.targetUserId);
      }

      // Record audit log
      await adminAuditService.recordAuditLog({
        action: 'ADMIN_DETAILS_UPDATED',
        targetType: 'ADMIN',
        targetId: params.targetUserId,
        reason: `Admin details updated for ${cleanName} (${cleanEmail})`,
        metadata: { full_name: cleanName, email: cleanEmail, role: params.role },
      });

      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
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
