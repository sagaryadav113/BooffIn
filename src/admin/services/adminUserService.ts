// ============================================================================
// BOOFFIN ADMIN PORTAL — USER MANAGEMENT SERVICE (STAGE 2 REAL DATA WIRING)
// ============================================================================

import { supabase } from '../../api/client';
import { AdminUserProfile } from '../types/data';

const USER_SELECT_FIELDS = `
  id,
  username,
  display_name,
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
        .select(USER_SELECT_FIELDS, { count: 'exact' });

      if (options?.search && options.search.trim()) {
        const sanitizedSearch = options.search.trim().replace(/[%_]/g, '');
        query = query.or(`username.ilike.%${sanitizedSearch}%,display_name.ilike.%${sanitizedSearch}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { users: [], count: 0, error: new Error(error.message) };
      }

      return {
        users: (data as unknown as AdminUserProfile[]) || [],
        count: count ?? (data?.length || 0),
        error: null,
      };
    } catch (err: any) {
      return { users: [], count: 0, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Fetches full profile details for a user with targeted field selection.
   * Permission required: users.read
   */
  async getUserDetails(userId: string): Promise<{ user: AdminUserProfile | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(USER_SELECT_FIELDS)
        .eq('id', userId)
        .single();

      if (error) return { user: null, error: new Error(error.message) };
      return { user: data as unknown as AdminUserProfile, error: null };
    } catch (err: any) {
      return { user: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Total count of registered profiles for dashboard metrics.
   */
  async getUserCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  },
};
