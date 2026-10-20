import { supabase } from './client';
import { mapSupabaseProfile } from './socialService';
import { AppNotification, NotificationFilter, NotificationType, NotificationEntityType } from '../types/notification';

async function getAuthUserId(fallbackUserId?: string): Promise<string | null> {
  if (fallbackUserId && fallbackUserId !== 'unknown') return fallbackUserId;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user?.id) return user.id;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;
    return null;
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
      return snippet || 'started following you';
    case 'follow_request':
      return 'requested to follow you';
    case 'follow_accept':
      return 'accepted your follow request';
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
    case 'workspace_invitation':
      return 'invited you to join a workspace';
    case 'workspace_message':
      return snippet ? `sent a workspace message: "${snippet}"` : 'sent you a message in workspace';
    case 'workspace_event':
      return snippet ? `scheduled an event: "${snippet}"` : 'scheduled a new workspace event';
    case 'workspace_block':
      return 'workspace access updated';
    case 'subscription_active':
      return 'workspace subscription is now active';
    default:
      return snippet || 'shared an update';
  }
}

/**
 * Determine deep link target navigation route for a notification
 */
export function getNotificationDeepLink(notification: AppNotification): {
  pathname: string;
  params?: Record<string, string>;
} {
  const targetCommentId = notification.targetCommentId || notification.metadata?.comment_id;

  if (
    notification.type === 'workspace_invitation' ||
    notification.type === 'workspace_message' ||
    notification.type === 'workspace_event' ||
    notification.entityType === 'workspace'
  ) {
    const workspaceId = notification.entityId || notification.metadata?.workspace_id;
    if (workspaceId) {
      return {
        pathname: '/workspace/[id]',
        params: { id: workspaceId },
      };
    }
    return {
      pathname: '/workspace',
    };
  }

  if (notification.targetPostId || (notification.entityType === 'post' && notification.entityId)) {
    const postId = notification.targetPostId || notification.entityId || '';
    const params: Record<string, string> = { id: postId };
    if (targetCommentId) {
      params.commentId = targetCommentId;
    }
    return {
      pathname: '/post/[id]',
      params,
    };
  }

  if (notification.targetPaperId || (notification.entityType === 'paper' && notification.entityId)) {
    const paperId = notification.targetPaperId || notification.entityId || '';
    return {
      pathname: '/paper/[id]',
      params: { id: paperId },
    };
  }

  if (notification.type === 'collaboration_request') {
    return {
      pathname: '/profile/[id]',
      params: {
        id: notification.actor.id,
        action: 'collaboration',
        requestId: notification.entityId || notification.metadata?.request_id || '',
      },
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
 * Deduplicate notification rows from database triggers or multiple concurrent events.
 * Identifies duplicate notifications representing the exact same underlying user action
 * (e.g. same actor, same type, same target/entity, and created within a similar timeframe).
 */
export function deduplicateNotificationList(
  notifications: AppNotification[]
): { uniqueNotifications: AppNotification[]; duplicateIds: string[] } {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return { uniqueNotifications: [], duplicateIds: [] };
  }

  const seenIds = new Set<string>();
  const seenEventKeys = new Map<string, AppNotification>();
  const duplicateIds: string[] = [];

  for (const notif of notifications) {
    if (!notif || !notif.id) continue;

    // 1. Direct ID deduplication
    if (seenIds.has(notif.id)) {
      duplicateIds.push(notif.id);
      continue;
    }
    seenIds.add(notif.id);

    // 2. Semantic event signature deduplication
    const actorId = notif.actor?.id || 'unknown_actor';
    const type = notif.type;
    const targetEntity =
      type === 'follow'
        ? 'follow_event'
        : notif.targetPostId || notif.targetPaperId || notif.entityId || notif.targetTopicName || '';

    const rawTime = notif.metadata?.raw_created_at;
    const timeBucket = rawTime
      ? Math.floor(new Date(rawTime).getTime() / 10000)
      : notif.createdAt || '';

    const primaryKey = `${actorId}::${type}::${targetEntity}::${timeBucket}`;
    const coarseKey = `${actorId}::${type}::${targetEntity}`;

    const existing =
      seenEventKeys.get(primaryKey) ||
      (type === 'follow' || type === 'like' ? seenEventKeys.get(coarseKey) : undefined);

    if (existing) {
      // Pick the richer notification (prefer populated target IDs, metadata, or explicit snippets)
      const currentScore =
        (notif.targetPostId ? 3 : 0) +
        (notif.targetPaperId ? 3 : 0) +
        (notif.entityId ? 1 : 0) +
        (notif.messageSnippet ? 2 : 0) +
        (notif.metadata && Object.keys(notif.metadata).length > 1 ? 2 : 0);

      const existingScore =
        (existing.targetPostId ? 3 : 0) +
        (existing.targetPaperId ? 3 : 0) +
        (existing.entityId ? 1 : 0) +
        (existing.messageSnippet ? 2 : 0) +
        (existing.metadata && Object.keys(existing.metadata).length > 1 ? 2 : 0);

      if (currentScore > existingScore) {
        duplicateIds.push(existing.id);
        seenEventKeys.set(primaryKey, notif);
        if (type === 'follow' || type === 'like') seenEventKeys.set(coarseKey, notif);
      } else {
        duplicateIds.push(notif.id);
      }
    } else {
      seenEventKeys.set(primaryKey, notif);
      if (type === 'follow' || type === 'like') seenEventKeys.set(coarseKey, notif);
    }
  }

  // Preserve original ordering while filtering out duplicates
  const keptIds = new Set(Array.from(seenEventKeys.values()).map((n) => n.id));
  const uniqueNotifications = notifications.filter((n) => keptIds.has(n.id));

  return { uniqueNotifications, duplicateIds };
}

/**
 * Filter notifications by tab
 */
export function filterNotificationList(
  notifications: AppNotification[],
  filter: NotificationFilter
): AppNotification[] {
  if (!Array.isArray(notifications)) return [];
  // Ensure the list is strictly deduplicated first
  const { uniqueNotifications } = deduplicateNotificationList(notifications);
  const list = uniqueNotifications;

  if (filter === 'All') return list;
  if (filter === 'Mentions') {
    return list.filter((n) => n.type === 'comment' || n.type === 'reply' || n.type === 'mention');
  }
  if (filter === 'Follows') {
    return list.filter(
      (n) => n.type === 'follow' || n.type === 'follow_request' || n.type === 'follow_accept'
    );
  }
  if (filter === 'Discussions') {
    return list.filter(
      (n) =>
        n.type === 'comment' ||
        n.type === 'reply' ||
        n.type === 'like' ||
        n.type === 'repost' ||
        n.type === 'paper_discussion' ||
        n.type === 'collaboration_request' ||
        n.type === 'workspace_message' ||
        n.type === 'workspace_invitation'
    );
  }
  if (filter === 'Updates') {
    return list.filter(
      (n) =>
        n.type === 'researcher_post' ||
        n.type === 'topic_activity' ||
        n.type === 'trending' ||
        n.type === 'topic_update' ||
        n.type === 'publisher_update' ||
        n.type === 'workspace_event' ||
        n.type === 'workspace_block' ||
        n.type === 'subscription_active'
    );
  }
  return list;
}

/**
 * Maps a raw Supabase notification query row into an AppNotification model
 */
export function mapNotificationRow(row: any): AppNotification {
  const actor = mapSupabaseProfile(row.actor);
  const metadata = row.metadata || {};
  // Dual-column compatibility: support both modern and legacy schemas
  const rawType = row.type || row.notification_type || 'follow';
  const type = rawType as NotificationType;
  const snippet = row.message_snippet || row.content || null;
  const topicName = metadata.topic_name || (row.entity_type === 'topic' ? snippet : undefined);
  
  const content = row.content || formatNotificationContent(type, snippet, topicName);

  const entityType = (row.entity_type || (row.post_id ? 'post' : row.paper_id ? 'paper' : 'profile')) as NotificationEntityType;
  const entityId = row.entity_id || row.post_id || row.paper_id || null;

  return {
    id: row.id,
    type,
    actor,
    content,
    entityType,
    entityId,
    targetPostId: row.post_id || (row.entity_type === 'post' ? row.entity_id : metadata.post_id),
    targetPaperId: row.paper_id || (row.entity_type === 'paper' ? row.entity_id : metadata.paper_id),
    targetTopicName: topicName,
    targetCommentId: row.comment_id || metadata.comment_id,
    messageSnippet: snippet,
    metadata: {
      ...metadata,
      post_id: row.post_id || metadata.post_id,
      paper_id: row.paper_id || metadata.paper_id,
      comment_id: row.comment_id || metadata.comment_id,
      raw_created_at: row.created_at,
    },
    createdAt: formatNotificationTime(row.created_at),
    isRead: Boolean(row.read_status),
  };
}

/**
 * Fetch a single notification by ID (used for real-time incremental insertions)
 */
export async function fetchNotificationById(notificationId: string): Promise<AppNotification | null> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(
        `
        *,
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
      .eq('id', notificationId)
      .maybeSingle();

    if (error || !data) return null;
    return mapNotificationRow(data);
  } catch {
    return null;
  }
}

/**
 * Fetch paginated real notifications for the authenticated user from Supabase
 */
export async function fetchNotifications(
  filter: NotificationFilter = 'All',
  page: number = 1,
  pageSize: number = 25,
  currentUserId?: string
): Promise<{ data: AppNotification[]; hasMore: boolean; error: string | null }> {
  try {
    const userId = await getAuthUserId(currentUserId);
    if (!userId) {
      return { data: [], hasMore: false, error: null };
    }

    let query = supabase
      .from('notifications')
      .select(
        `
        *,
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
      query = query.in('type', ['comment', 'reply', 'mention']);
    } else if (filter === 'Follows') {
      query = query.in('type', ['follow', 'follow_request', 'follow_accept']);
    } else if (filter === 'Discussions') {
      query = query.in('type', [
        'comment',
        'reply',
        'like',
        'repost',
        'paper_discussion',
        'collaboration_request',
        'workspace_message',
        'workspace_invitation',
      ]);
    } else if (filter === 'Updates') {
      query = query.in('type', [
        'researcher_post',
        'topic_activity',
        'trending',
        'topic_update',
        'publisher_update',
        'workspace_event',
        'workspace_block',
        'subscription_active',
      ]);
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(start, end);

    const mappedNotifications: AppNotification[] = Array.isArray(data) ? data.map(mapNotificationRow) : [];

    // 3. On page 1, ensure pending follow requests from private profile requests are included
    if (page === 1 && (filter === 'All' || filter === 'Follows') && userId) {
      try {
        const { data: pendingReqs } = await supabase
          .from('follow_requests')
          .select(`
            id,
            requester_id,
            target_id,
            status,
            created_at,
            requester:profiles!requester_id (
              id,
              username,
              full_name,
              avatar_url,
              academic_title,
              institution,
              orcid_id,
              orcid_verified
            )
          `)
          .eq('target_id', userId)
          .eq('status', 'pending')
          .limit(20);

        if (Array.isArray(pendingReqs)) {
          for (const req of pendingReqs) {
            const alreadyPresent = mappedNotifications.some(
              (n) => n.actor.id === req.requester_id && n.type === 'follow_request' && !n.isRead
            );
            if (!alreadyPresent && req.requester) {
              const actor = mapSupabaseProfile(req.requester);
              mappedNotifications.unshift({
                id: `follow_req_${req.id}`,
                type: 'follow_request',
                actor,
                content: 'requested to follow you',
                entityType: 'profile',
                entityId: req.requester_id,
                messageSnippet: 'requested to follow you',
                metadata: {
                  request_type: 'follow_request',
                  requester_id: req.requester_id,
                  target_id: req.target_id,
                  follow_request_id: req.id,
                },
                createdAt: formatNotificationTime(req.created_at),
                isRead: false,
              });
            }
          }
        }
      } catch (e) {
        console.warn('[notificationService] Failed to load pending follow requests:', e);
      }
    }

    if (mappedNotifications.length === 0) {
      return { data: [], hasMore: false, error: error?.message || null };
    }

    // 4. Robust deduplication of trigger-duplicated rows
    const { uniqueNotifications, duplicateIds } = deduplicateNotificationList(mappedNotifications);

    // 5. Background purge of redundant duplicate notification rows for the authenticated user
    if (duplicateIds.length > 0 && userId) {
      (async () => {
        try {
          const { error: delError } = await supabase
            .from('notifications')
            .delete()
            .in('id', duplicateIds)
            .eq('recipient_id', userId);
          if (!delError) {
            console.log(`[notificationService] Purged ${duplicateIds.length} duplicate notification records from database.`);
          }
        } catch {
          // ignore background cleanup failures
        }
      })();
    }

    return {
      data: uniqueNotifications,
      hasMore: Boolean(data && data.length === pageSize),
      error: null,
    };
  } catch (err: any) {
    return { data: [], hasMore: false, error: err?.message || 'Failed to load notifications' };
  }
}

/**
 * Fetch total unread notification count
 */
export async function fetchUnreadCount(currentUserId?: string): Promise<{ count: number; error: string | null }> {
  try {
    const userId = await getAuthUserId(currentUserId);
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
  notificationId: string,
  currentUserId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const userId = await getAuthUserId(currentUserId);
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
export async function markAllNotificationsAsRead(
  currentUserId?: string
): Promise<{
  success: boolean;
  updatedCount: number;
  error: string | null;
}> {
  try {
    const userId = await getAuthUserId(currentUserId);
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

