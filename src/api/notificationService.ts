import { supabase } from './client';
import { mapSupabaseProfile } from './socialService';
import { AppNotification, NotificationFilter, NotificationType, NotificationEntityType } from '../types/notification';

async function getAuthUserId(): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Format relative time string from ISO timestamp
 */
export function formatNotificationTime(isoString?: string): string {
  if (!isoString) return 'Just now';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
}

/**
 * Format human-readable notification description
 */
export function formatNotificationContent(
  type: NotificationType,
  snippet?: string | null,
  topicName?: string | null
): string {
  switch (type) {
    case 'follow':
      return 'started following you';
    case 'like':
      return 'liked your research post';
    case 'comment':
      return snippet ? `commented: "${snippet}"` : 'commented on your post';
    case 'reply':
      return snippet ? `replied to your comment: "${snippet}"` : 'replied to your comment';
    case 'repost':
      return 'reposted your research post';
    case 'paper_discussion':
      return 'new discussion activity on paper you interacted with';
    case 'collaboration_request':
      return 'sent you a research collaboration request';
    case 'researcher_post':
      return snippet ? `shared new research: "${snippet}"` : 'shared new research';
    case 'topic_activity':
      return topicName ? `new research activity in #${topicName}` : 'new activity in followed topic';
    case 'mention':
      return snippet ? `mentioned you: "${snippet}"` : 'mentioned you in a discussion';
    case 'trending':
      return 'Your research is trending';
    default:
      return 'shared an update';
  }
}

/**
 * Determine deep link target navigation route for a notification
 */
export function getNotificationDeepLink(notification: AppNotification): {
  pathname: string;
  params?: Record<string, string>;
} {
  if (notification.targetPostId || (notification.entityType === 'post' && notification.entityId)) {
    const postId = notification.targetPostId || notification.entityId || '';
    return {
      pathname: '/post/[id]',
      params: { id: postId },
    };
  }

  if (notification.targetPaperId || (notification.entityType === 'paper' && notification.entityId)) {
    const paperId = notification.targetPaperId || notification.entityId || '';
    return {
      pathname: '/paper/[id]',
      params: { id: paperId },
    };
  }

  if (notification.targetTopicName || (notification.entityType === 'topic' && (notification.targetTopicName || notification.entityId))) {
    const slug = (notification.targetTopicName || notification.entityId || 'general')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
    return {
      pathname: '/topic/[slug]',
      params: { slug },
    };
  }

  return {
    pathname: '/profile/[id]',
    params: { id: notification.actor.id },
  };
}

/**
 * Filter notifications by tab
 */
export function filterNotificationList(
  notifications: AppNotification[],
  filter: NotificationFilter
): AppNotification[] {
  if (filter === 'All') return notifications;
  if (filter === 'Mentions') {
    return notifications.filter((n) => n.type === 'comment' || n.type === 'reply' || n.type === 'mention');
  }
  if (filter === 'Follows') {
    return notifications.filter((n) => n.type === 'follow');
  }
  if (filter === 'Discussions') {
    return notifications.filter(
      (n) => n.type === 'comment' || n.type === 'reply' || n.type === 'paper_discussion'
    );
  }
  if (filter === 'Updates') {
    return notifications.filter(
      (n) =>
        n.type === 'researcher_post' ||
        n.type === 'topic_activity' ||
        n.type === 'trending' ||
        n.type === 'topic_update' ||
        n.type === 'publisher_update'
    );
  }
  return notifications;
}

/**
 * Fetch paginated real notifications for the authenticated user from Supabase
 */
export async function fetchNotifications(
  filter: NotificationFilter = 'All',
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: AppNotification[]; hasMore: boolean; error: string | null }> {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { data: [], hasMore: false, error: null };
    }

    let query = supabase
      .from('notifications')
      .select(
        `
        id,
        recipient_id,
        actor_id,
        notification_type,
        entity_type,
        entity_id,
        message_snippet,
        metadata,
        read_status,
        created_at,
        actor:profiles!actor_id (
          id,
          username,
          full_name,
          avatar_url,
          academic_title,
          institution,
          orcid_id,
          orcid_verified
        )
      `
      )
      .eq('recipient_id', userId);

    if (filter === 'Mentions') {
      query = query.in('notification_type', ['comment', 'reply', 'mention']);
    } else if (filter === 'Follows') {
      query = query.eq('notification_type', 'follow');
    } else if (filter === 'Discussions') {
      query = query.in('notification_type', ['comment', 'reply', 'paper_discussion']);
    } else if (filter === 'Updates') {
      query = query.in('notification_type', [
        'researcher_post',
        'topic_activity',
        'trending',
        'topic_update',
        'publisher_update',
      ]);
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error || !data || data.length === 0) {
      return { data: [], hasMore: false, error: error?.message || null };
    }

    const notifications: AppNotification[] = data.map((row: any) => {
      const actor = mapSupabaseProfile(row.actor);
      const metadata = row.metadata || {};
      const type = row.notification_type as NotificationType;
      const topicName = metadata.topic_name || (row.entity_type === 'topic' ? row.message_snippet : undefined);
      
      const content = formatNotificationContent(type, row.message_snippet, topicName);

      return {
        id: row.id,
        type,
        actor,
        content,
        entityType: row.entity_type as NotificationEntityType,
        entityId: row.entity_id,
        targetPostId: row.entity_type === 'post' ? row.entity_id : metadata.post_id,
        targetPaperId: row.entity_type === 'paper' ? row.entity_id : metadata.paper_id,
        targetTopicName: topicName,
        targetCommentId: metadata.comment_id,
        messageSnippet: row.message_snippet,
        metadata,
        createdAt: formatNotificationTime(row.created_at),
        isRead: Boolean(row.read_status),
      };
    });

    return {
      data: notifications,
      hasMore: data.length === pageSize,
      error: null,
    };
  } catch (err: any) {
    return { data: [], hasMore: false, error: err?.message || 'Failed to load notifications' };
  }
}

/**
 * Fetch total unread notification count
 */
export async function fetchUnreadCount(): Promise<{ count: number; error: string | null }> {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { count: 0, error: null };
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('read_status', false);

    if (error || count === null) {
      return { count: 0, error: error?.message || null };
    }

    return { count, error: null };
  } catch {
    return { count: 0, error: null };
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: true, error: null };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read_status: true })
      .eq('id', notificationId)
      .eq('recipient_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to mark as read' };
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  updatedCount: number;
  error: string | null;
}> {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: true, updatedCount: 0, error: null };
    }

    const { error, count } = await supabase
      .from('notifications')
      .update({ read_status: true })
      .eq('recipient_id', userId)
      .eq('read_status', false);

    if (error) {
      return { success: false, updatedCount: 0, error: error.message };
    }

    return { success: true, updatedCount: count || 0, error: null };
  } catch (err: any) {
    return { success: false, updatedCount: 0, error: err?.message || 'Failed to mark all as read' };
  }
}
