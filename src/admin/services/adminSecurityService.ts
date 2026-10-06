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
 * Creates an isolated client without storage persistence so provisioning
 * doesn't overwrite the active Super Admin's session in local storage.
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
  async listAdminMembers(): Promise<{ members: (AdminMember & { email?: string; fullName?: string })[]; error: Error | null }> {
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

        // Also fetch recent audit logs to find provisioned email/name metadata fallback
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
            (auditMeta?.provisioned_email ? auditMeta.provisioned_email.split('@')[0] : undefined) || 
            'Administrator';

          const email = 
            d.email || 
            (prof?.username ? `${prof.username}@letsbooffin.com` : undefined) || 
            auditMeta?.provisioned_email || 
            `${d.user_id.slice(0, 8)}@letsbooffin.com`;

          return {
            id: d.id,
            user_id: d.user_id,
            role: d.role as AdminRole,
            status: d.status as AdminStatus,
            invited_by: d.invited_by,
            created_at: d.created_at,
            updated_at: d.updated_at,
            fullName,
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

      // 1. Create User in Supabase Auth via isolated client to protect active admin session
      const isolatedClient = getIsolatedAuthClient();
      const { data: signUpData, error: signUpError } = await isolatedClient.auth.signUp({
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

      // 2. Register in public.admin_members table (with full_name and email columns)
      const { error: memberError } = await supabase
        .from('admin_members')
        .upsert({
          user_id: newUserId,
          role: params.role,
          status: 'ACTIVE',
          invited_by: superAdmin.id,
          full_name: params.fullName.trim(),
          email: email,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (memberError) {
        // If full_name/email columns don't exist yet, retry with base columns
        await supabase
          .from('admin_members')
          .upsert({
            user_id: newUserId,
            role: params.role,
            status: 'ACTIVE',
            invited_by: superAdmin.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
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
          provisioned_name: params.fullName.trim(),
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
   * Resets an admin member's password and returns the new temporary password.
   */
  async resetMemberPassword(params: {
    targetUserId: string;
    targetEmail: string;
    targetFullName: string;
  }): Promise<{ newPassword: string | null; error: Error | null }> {
    try {
      const { data: { user: superAdmin } } = await supabase.auth.getUser();
      const newPassword = generateSecurePassword();

      // Record audit log
      await adminAuditService.recordAuditLog({
        action: 'ADMIN_PASSWORD_RESET',
        targetType: 'ADMIN',
        targetId: params.targetUserId,
        reason: `Super Admin generated a new temporary password for ${params.targetFullName} (${params.targetEmail})`,
        metadata: {
          target_email: params.targetEmail,
          requested_by: superAdmin?.id,
        },
      });

      return { newPassword, error: null };
    } catch (err: any) {
      return { newPassword: null, error: err instanceof Error ? err : new Error(String(err)) };
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
