// ============================================================================
// BOOFFIN ADMIN PORTAL — MODERATION SERVICE (STAGE 2 REAL DATA WIRING)
// ============================================================================

import { supabase } from '../../api/client';
import { adminAuditService } from './adminAuditService';

export const adminModerationService = {
  /**
   * Fetches recent posts for moderation review.
   * Permission required: posts.read
   */
  async listFlaggedPosts(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ posts: any[]; count: number; error: Error | null }> {
    try {
      const limit = Math.min(options?.limit ?? 25, 100);
      const offset = options?.offset ?? 0;

      const { data, error, count } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          created_at,
          profiles:user_id (
            username,
            display_name
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { posts: [], count: 0, error: new Error(error.message) };
      }

      return {
        posts: data || [],
        count: count ?? (data?.length || 0),
        error: null,
      };
    } catch (err: any) {
      return { posts: [], count: 0, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Removes a violating post and records an immutable audit log.
   * Permission required: posts.remove
   */
  async removePost(postId: string, reason?: string): Promise<{ error: Error | null }> {
    try {
      // 1. Verify target post exists
      const { data: targetPost, error: fetchErr } = await supabase
        .from('posts')
        .select('id, user_id')
        .eq('id', postId)
        .maybeSingle();

      if (fetchErr) {
        return { error: new Error(fetchErr.message) };
      }
      if (!targetPost) {
        return { error: new Error('Post not found or already removed.') };
      }

      // 2. Perform deletion
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (deleteError) {
        return { error: new Error(deleteError.message) };
      }

      // 3. Record immutable audit log
      await adminAuditService.recordAuditLog({
        action: 'POST_REMOVED',
        targetType: 'POST',
        targetId: postId,
        reason: reason || 'Violation of academic platform community standards',
        metadata: { author_user_id: targetPost.user_id },
      });

      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Total count of posts for dashboard metrics.
   */
  async getTotalPostsCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });
      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  },
};
