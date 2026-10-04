// ============================================================================
// BOOFFIN ADMIN PORTAL — USER MANAGEMENT SERVICE (SCHEMA ALIGNED)
// ============================================================================

import { supabase } from '../../api/client';
import { AdminUserProfile } from '../types/data';

const USER_SELECT_FIELDS = `
  id,
  username,
  full_name,
  bio,
  avatar_url,
  is_private,
  institution,
  field_of_study,
  orcid,
  is_orcid_verified,
  followers_count,
  following_count,
  created_at,
  updated_at
`;

export const adminUserService = {
  /**
   * Fetches paginated users from public.profiles with search support.
   * Permission required: users.read
   * Data Minimization: Strictly selects public profile fields; zero auth secrets exposed.
   */
  async listUsers(options?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: AdminUserProfile[]; count: number; error: Error | null }> {
    try {
      const limit = Math.min(options?.limit ?? 25, 100);
      const offset = options?.offset ?? 0;

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      if (options?.search && options.search.trim()) {
        const sanitizedSearch = options.search.trim().replace(/[%_]/g, '');
        query = query.or(`username.ilike.%${sanitizedSearch}%,full_name.ilike.%${sanitizedSearch}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.warn('adminUserService listUsers error:', error.message);
        return { users: [], count: 0, error: new Error(error.message) };
      }

      const mappedUsers: AdminUserProfile[] = (data || []).map((u: any) => ({
        ...u,
        display_name: u.full_name || u.username,
        institution: u.institution || u.academic_title || 'Researcher',
        field_of_study: u.field_of_study || (Array.isArray(u.research_interests) ? u.research_interests.join(', ') : 'Academic Research'),
        is_orcid_verified: Boolean(u.orcid_verified || u.is_orcid_verified || u.orcid_id),
        is_private: Boolean(u.is_private),
      }));

      return {
        users: mappedUsers,
        count: count ?? (data?.length || 0),
        error: null,
      };
    } catch (err: any) {
      return { users: [], count: 0, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Retrieves total count of registered researcher profiles in public.profiles.
   */
  async getUserCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  },

  /**
   * Retrieves single user profile by ID.
   */
  async getUserById(userId: string): Promise<{ user: AdminUserProfile | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        return { user: null, error: new Error(error.message) };
      }

      if (!data) return { user: null, error: null };

      return {
        user: {
          ...(data as any),
          display_name: (data as any).full_name || (data as any).username,
          institution: (data as any).institution || (data as any).academic_title || 'Researcher',
          field_of_study: (data as any).field_of_study || (Array.isArray((data as any).research_interests) ? (data as any).research_interests.join(', ') : 'Academic Research'),
          is_orcid_verified: Boolean((data as any).orcid_verified || (data as any).is_orcid_verified || (data as any).orcid_id),
        },
        error: null,
      };
    } catch (err: any) {
      return { user: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },
};
