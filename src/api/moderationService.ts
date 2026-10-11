import { supabase } from './client';
import { ContentReport, CreateReportParams } from '../types';

/**
 * Block a target user. Prevents unwanted interactions.
 */
export async function blockUser(
  targetUserId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    if (!currentUserId) {
      return { success: false, error: 'Authentication required to block user.' };
    }

    if (currentUserId === targetUserId) {
      return { success: false, error: 'Cannot block yourself.' };
    }

    const { error } = await supabase.from('user_blocks').insert({
      blocker_id: currentUserId,
      blocked_id: targetUserId,
    });

    if (error) {
      if (error.code === '23505') {
        // Already blocked
        return { success: true, error: null };
      }
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to block user.' };
  }
}

/**
 * Unblock a target user.
 */
export async function unblockUser(
  targetUserId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    if (!currentUserId) {
      return { success: false, error: 'Authentication required to unblock user.' };
    }

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', targetUserId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to unblock user.' };
  }
}

/**
 * Get list of user IDs blocked by current user.
 */
export async function getBlockedUserIds(): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    if (!currentUserId) return [];

    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', currentUserId);

    if (error || !data) return [];
    return data.map((r: any) => r.blocked_id);
  } catch {
    return [];
  }
}

/**
 * Check if a specific target user is blocked by the current user.
 */
export async function isUserBlocked(targetUserId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', targetUserId)
      .maybeSingle();

    if (error || !data) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if either user has blocked the other (bidirectional block check).
 */
export async function isBidirectionalBlocked(targetUserId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_blocks')
      .select('id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${user.id})`)
      .limit(1);

    if (error || !data) return false;
    return data.length > 0;
  } catch {
    return false;
  }
}

/**
 * File a moderation report for a post, comment, or profile.
 */
export async function reportContent(
  params: CreateReportParams
): Promise<{ success: boolean; report?: ContentReport; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    if (!currentUserId) {
      return { success: false, error: 'Authentication required to submit a report.' };
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: currentUserId,
        reported_type: params.reportedType,
        reported_id: params.reportedId,
        reason: params.reason,
        details: params.details || null,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const created: ContentReport = {
      id: data.id,
      reporterId: data.reporter_id,
      reportedType: data.reported_type,
      reportedId: data.reported_id,
      reason: data.reason,
      details: data.details,
      status: data.status,
      createdAt: data.created_at,
    };

    return { success: true, report: created, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to submit report.' };
  }
}
