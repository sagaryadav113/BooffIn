// ============================================================================
// BOOFFIN ADMIN PORTAL — AUTHENTICATION SERVICE
// ============================================================================

import { supabase } from '../../api/client';
import { AdminRole, AdminStatus, AdminSessionState } from '../types/roles';
import { getPermissionsForRole } from '../lib/permissions';

export const adminAuthService = {
  /**
   * Signs in an administrator using Supabase Auth with email or username support.
   */
  async signInWithPassword(identifier: string, password: string): Promise<{ error: Error | null }> {
    try {
      let cleanIdentifier = identifier.trim().toLowerCase();
      let emailToAuth = cleanIdentifier;

      // If user typed username instead of email, resolve it
      if (!cleanIdentifier.includes('@')) {
        const cleanHandle = cleanIdentifier.replace(/^@/, '');
        
        // 1. Check admin_members by email pattern or profile
        const { data: adminMember } = await supabase
          .from('admin_members')
          .select('email, user_id')
          .or(`email.ilike.${cleanHandle}@%,full_name.ilike.%${cleanHandle}%`)
          .maybeSingle();

        // 2. Check profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('username', cleanHandle)
          .maybeSingle();

        if (adminMember?.email) {
          emailToAuth = adminMember.email;
        } else if (profile?.id) {
          const { data: adminById } = await supabase
            .from('admin_members')
            .select('email')
            .eq('user_id', profile.id)
            .maybeSingle();
          if (adminById?.email) {
            emailToAuth = adminById.email;
          } else {
            emailToAuth = `${cleanHandle}@letsbooffin.com`;
          }
        } else {
          emailToAuth = `${cleanHandle}@letsbooffin.com`;
        }
      }

      let { error } = await supabase.auth.signInWithPassword({ email: emailToAuth, password });

      // Fallback try with default domain if first attempt fails and was handle
      if (error && !cleanIdentifier.includes('@') && emailToAuth !== `${cleanIdentifier.replace(/^@/, '')}@letsbooffin.com`) {
        const retry = await supabase.auth.signInWithPassword({
          email: `${cleanIdentifier.replace(/^@/, '')}@letsbooffin.com`,
          password,
        });
        if (!retry.error) {
          error = null;
        }
      }

      return { error };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Signs out the administrator.
   */
  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[adminAuthService] signOut error:', err);
    }
  },

  /**
   * Evaluates current Supabase session, retrieves admin membership, and constructs AdminSessionState.
   */
  async getAdminSession(): Promise<AdminSessionState> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        return {
          isAuthenticated: false,
          isAdmin: false,
          userId: null,
          email: null,
          role: null,
          status: null,
          aal: null,
          isMfaRequired: false,
          isMfaVerified: false,
          permissions: [],
          isLoading: false,
          error: null,
        };
      }

      const userId = session.user.id;
      const email = session.user.email ?? null;

      // Query admin_members table
      const { data: adminMember, error: adminError } = await supabase
        .from('admin_members')
        .select('role, status')
        .eq('user_id', userId)
        .maybeSingle();

      if (adminError || !adminMember) {
        return {
          isAuthenticated: true,
          isAdmin: false,
          userId,
          email,
          role: null,
          status: null,
          aal: null,
          nextAal: null,
          hasEnrolledFactor: false,
          isMfaRequired: false,
          isMfaVerified: false,
          permissions: [],
          isLoading: false,
          error: 'Access Denied: Not an active administrator.',
        };
      }

      const role = adminMember.role as AdminRole;
      const status = adminMember.status as AdminStatus;

      if (status !== 'ACTIVE') {
        return {
          isAuthenticated: true,
          isAdmin: false,
          userId,
          email,
          role,
          status,
          aal: null,
          nextAal: null,
          hasEnrolledFactor: false,
          isMfaRequired: false,
          isMfaVerified: false,
          permissions: [],
          isLoading: false,
          error: `Access Denied: Admin status is ${status}`,
        };
      }

      // Check Supabase MFA Authenticator Assurance Level (AAL)
      let currentAal: 'aal1' | 'aal2' = 'aal1';
      let nextAal: 'aal1' | 'aal2' = 'aal1';
      let hasEnrolledFactor = false;
      let isMfaRequired = true;
      let isMfaVerified = false;

      try {
        const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (mfaData) {
          currentAal = (mfaData.currentLevel as 'aal1' | 'aal2') ?? 'aal1';
          nextAal = (mfaData.nextLevel as 'aal1' | 'aal2') ?? 'aal1';
          hasEnrolledFactor = nextAal === 'aal2';
          isMfaVerified = currentAal === 'aal2';
        }
      } catch {
        // Fallback if MFA endpoints encounter network/unsupported state
        isMfaVerified = false;
      }

      return {
        isAuthenticated: true,
        isAdmin: true,
        userId,
        email,
        role,
        status,
        aal: currentAal,
        nextAal,
        hasEnrolledFactor,
        isMfaRequired,
        isMfaVerified,
        permissions: getPermissionsForRole(role),
        isLoading: false,
        error: null,
      };
    } catch (err: any) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        userId: null,
        email: null,
        role: null,
        status: null,
        aal: null,
        nextAal: null,
        hasEnrolledFactor: false,
        isMfaRequired: false,
        isMfaVerified: false,
        permissions: [],
        isLoading: false,
        error: err?.message || 'Authentication error',
      };
    }
  },
};
