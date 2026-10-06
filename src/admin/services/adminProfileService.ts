// ============================================================================
// BOOFFIN ADMIN PORTAL — SUPER ADMIN PROFILE SERVICE
// Realtime synchronized profile & credentials management
// ============================================================================

import { supabase } from '../../api/client';
import { adminAuditService } from './adminAuditService';

export interface SuperAdminProfileData {
  id: string;
  email: string;
  fullName: string;
  username: string;
  phone: string;
  role: string;
  status: string;
  department: string;
  avatarUrl?: string;
  createdAt?: string;
  lastSignInAt?: string;
  isMfaActive: boolean;
  aal: string;
}

export const adminProfileService = {
  /**
   * Fetches full authenticated profile of the active Super Admin.
   */
  async getProfile(): Promise<{ profile: SuperAdminProfileData | null; error: Error | null }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { profile: null, error: new Error('No authenticated admin session.') };
      }

      // 1. Fetch admin_members record
      const { data: member } = await supabase
        .from('admin_members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // 2. Fetch public.profiles record
      const { data: publicProfile } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      // 3. Check MFA AAL level
      let currentAal = 'aal1';
      let isMfaActive = false;
      try {
        const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (mfaData) {
          currentAal = mfaData.currentLevel || 'aal1';
          isMfaActive = currentAal === 'aal2';
        }
      } catch {
        // Fallback
      }

      const rawFullName = member?.full_name || publicProfile?.full_name || user.user_metadata?.full_name || '';
      const email = user.email || '';
      const fallbackName = email.split('@')[0] || 'Super Admin';
      const fullName = rawFullName.trim() ? rawFullName : fallbackName;

      const profile: SuperAdminProfileData = {
        id: user.id,
        email,
        fullName,
        username: publicProfile?.username || user.user_metadata?.username || email.split('@')[0] || 'admin',
        phone: member?.phone || user.phone || user.user_metadata?.phone || '',
        role: member?.role || 'SUPER_ADMIN',
        status: member?.status || 'ACTIVE',
        department: member?.department || 'Operations & Trust',
        avatarUrl: member?.avatar_url || publicProfile?.avatar_url || '',
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
        isMfaActive,
        aal: currentAal,
      };

      return { profile, error: null };
    } catch (err: any) {
      return { profile: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Updates Super Admin credentials in both auth, admin_members, and profiles tables.
   */
  async updateProfile(updates: {
    fullName: string;
    username?: string;
    phone?: string;
    department?: string;
  }): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: new Error('Unauthorized.') };
      }

      const trimmedName = updates.fullName.trim();
      const trimmedPhone = updates.phone?.trim() || '';
      const trimmedUsername = updates.username?.trim() || '';
      const trimmedDept = updates.department?.trim() || 'Operations & Trust';

      // 1. Update Auth User Metadata
      await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          phone: trimmedPhone,
          username: trimmedUsername,
        },
      });

      // 2. Update admin_members
      await supabase
        .from('admin_members')
        .update({
          full_name: trimmedName,
          phone: trimmedPhone,
          department: trimmedDept,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      // 3. Update public.profiles if existing
      if (trimmedName || trimmedUsername) {
        await supabase
          .from('profiles')
          .update({
            full_name: trimmedName,
            username: trimmedUsername || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }

      // 4. Audit Log
      await adminAuditService.logAction({
        action: 'UPDATE_ADMIN_PROFILE',
        targetType: 'ADMIN_MEMBER',
        targetId: user.id,
        reason: 'Super Admin updated personal profile & contact credentials.',
        metadata: {
          fullName: trimmedName,
          phone: trimmedPhone,
          department: trimmedDept,
        },
      });

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },
};
