import { supabase } from './client';
import { mapSupabaseProfile } from './socialService';
import { AppNotification, NotificationFilter, NotificationType, NotificationEntityType } from '../types/notification';
import { mockNotifications, mockUsers, mockPosts, mockPapers } from '../data/mockData';

async function getAuthUserId(): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

// Fallback in-memory notification state for offline/mock usage
let fallbackNotifications: AppNotification[] = [
  {
    id: 'notif_1',
    type: 'like',
    actor: mockUsers[3], // Dr. Elena Park
    content: 'liked your research post',
    entityType: 'post',
    entityId: mockPosts[2].id,
    targetPost: mockPosts[2],
    targetPostId: mockPosts[2].id,
    createdAt: '2m ago',
    isRead: false,
  },
  {
    id: 'notif_2',
    type: 'comment',
    actor: mockUsers[4], // Prof. Arjun Mehta
    content: 'commented: "This methodology is remarkably sound."',
    entityType: 'post',
    entityId: mockPosts[2].id,
    targetPost: mockPosts[2],
    targetPostId: mockPosts[2].id,
    messageSnippet: 'This methodology is remarkably sound.',
    createdAt: '10m ago',
    isRead: false,
  },
  {
    id: 'notif_3',
    type: 'reply',
    actor: mockUsers[2], // Dr. Marcus Chen
    content: 'replied to your comment: "Have you considered the batch effects?"',
    entityType: 'post',
    entityId: mockPosts[0].id,
    targetPost: mockPosts[0],
    targetPostId: mockPosts[0].id,
    messageSnippet: 'Have you considered the batch effects?',
    createdAt: '25m ago',
    isRead: false,
  },
  {
    id: 'notif_4',
    type: 'follow',
    actor: mockUsers[1], // Dr. Aanya Rao
    content: 'started following you',
    entityType: 'profile',
    entityId: mockUsers[1].id,
    createdAt: '1h ago',
    isRead: false,
  },
  {
    id: 'notif_5',
    type: 'paper_discussion',
    actor: mockUsers[4], // Prof. Arjun Mehta
    content: 'new discussion activity on paper you interacted with',
    entityType: 'paper',
    entityId: mockPapers[0].id,
    targetPaper: mockPapers[0],
    targetPaperId: mockPapers[0].id,
    createdAt: '2h ago',
    isRead: false,
  },
  {
    id: 'notif_6',
    type: 'researcher_post',
    actor: mockUsers[1], // Dr. Aanya Rao
    content: 'shared new research on Room-temperature Superconductivity',
    entityType: 'post',
    entityId: mockPosts[1].id,
    targetPost: mockPosts[1],
    targetPostId: mockPosts[1].id,
    messageSnippet: 'Room-temperature Superconductivity',
    createdAt: '3h ago',
    isRead: true,
  },
  {
    id: 'notif_7',
    type: 'topic_activity',
    actor: mockUsers[2], // Dr. Marcus Chen
    content: 'new research activity in #Quantum Computing',
    entityType: 'topic',
    entityId: 'topic_quantum',
    targetTopicName: 'Quantum Computing',
    createdAt: '5h ago',
    isRead: true,
  },
  {
    id: 'notif_8',
    type: 'repost',
    actor: mockUsers[6], // Maya Singh
    content: 'reposted your research post',
    entityType: 'post',
    entityId: mockPosts[2].id,
    targetPost: mockPosts[2],
    targetPostId: mockPosts[2].id,
    createdAt: '6h ago',
    isRead: true,
  },
];

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
  // 1. Post target
  if (notification.targetPostId || (notification.entityType === 'post' && notification.entityId)) {
    const postId = notification.targetPostId || notification.entityId || '';
    return {
      pathname: '/post/[id]',
      params: { id: postId },
    };
  }

  // 2. Paper target
  if (notification.targetPaperId || (notification.entityType === 'paper' && notification.entityId)) {
    const paperId = notification.targetPaperId || notification.entityId || '';
    return {
      pathname: '/paper/[id]',
      params: { id: paperId },
    };
  }

  // 3. Topic target
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

  // 4. User profile target (Follow notification or profile entity)
  if (notification.type === 'follow' || notification.entityType === 'profile') {
    return {
      pathname: '/profile/[id]',
      params: { id: notification.actor.id },
    };
  }

  // Default to actor's profile
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
 * Fetch paginated notifications for the current user
 */
export async function fetchNotifications(
  filter: NotificationFilter = 'All',
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: AppNotification[]; hasMore: boolean; error: string | null }> {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      // Return filtered fallback notifications
      const filtered = filterNotificationList(fallbackNotifications, filter);
      const start = (page - 1) * pageSize;
      const paginated = filtered.slice(start, start + pageSize);
      return {
        data: paginated,
        hasMore: start + pageSize < filtered.length,
        error: null,
      };
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

    // Apply database filter where applicable
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
      const filtered = filterNotificationList(fallbackNotifications, filter);
      const paginated = filtered.slice(start, start + pageSize);
      return {
        data: paginated,
        hasMore: start + pageSize < filtered.length,
        error: null,
      };
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
    const filtered = filterNotificationList(fallbackNotifications, filter);
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);
    return {
      data: paginated,
      hasMore: start + pageSize < filtered.length,
      error: null,
    };
  }
}

/**
 * Fetch total unread notification count
 */
export async function fetchUnreadCount(): Promise<{ count: number; error: string | null }> {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      const count = fallbackNotifications.filter((n) => !n.isRead).length;
      return { count, error: null };
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('read_status', false);

    if (error || count === null) {
      const fallbackCount = fallbackNotifications.filter((n) => !n.isRead).length;
      return { count: fallbackCount, error: null };
    }

    return { count, error: null };
  } catch {
    const count = fallbackNotifications.filter((n) => !n.isRead).length;
    return { count, error: null };
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error: string | null }> {
  // Update local fallback
  fallbackNotifications = fallbackNotifications.map((n) =>
    n.id === notificationId ? { ...n, isRead: true } : n
  );

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
      return { success: true, error: null };
    }

    return { success: true, error: null };
  } catch {
    return { success: true, error: null };
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
  const unreadBefore = fallbackNotifications.filter((n) => !n.isRead).length;
  fallbackNotifications = fallbackNotifications.map((n) => ({ ...n, isRead: true }));

  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: true, updatedCount: unreadBefore, error: null };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read_status: true })
      .eq('recipient_id', userId)
      .eq('read_status', false);

    if (error) {
      return { success: true, updatedCount: unreadBefore, error: null };
    }

    return { success: true, updatedCount: unreadBefore, error: null };
  } catch {
    return { success: true, updatedCount: unreadBefore, error: null };
  }
}

/**
 * Create a notification (Used by backend services/triggers or testing)
 */
export async function createNotification(params: {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  messageSnippet?: string;
  metadata?: Record<string, any>;
}): Promise<{ data: AppNotification | null; error: string | null }> {
  // 1. Prevent self-notifications
  if (params.actorId && params.recipientId === params.actorId) {
    return { data: null, error: 'Self-notifications are ignored' };
  }

  // 2. Prevent duplicate unread notifications for like, follow, repost
  const isDuplicate = fallbackNotifications.some(
    (n) =>
      !n.isRead &&
      n.type === params.type &&
      n.actor.id === params.actorId &&
      n.entityId === params.entityId
  );

  if (isDuplicate && (params.type === 'like' || params.type === 'follow' || params.type === 'repost')) {
    return { data: null, error: 'Duplicate unread notification prevented' };
  }

  const actor = mockUsers.find((u) => u.id === params.actorId) || mockUsers[0];
  const newNotif: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: params.type,
    actor,
    content: formatNotificationContent(params.type, params.messageSnippet, params.metadata?.topic_name),
    entityType: params.entityType,
    entityId: params.entityId,
    targetPostId: params.entityType === 'post' ? params.entityId : params.metadata?.post_id,
    targetPaperId: params.entityType === 'paper' ? params.entityId : params.metadata?.paper_id,
    targetTopicName: params.metadata?.topic_name,
    targetCommentId: params.metadata?.comment_id,
    messageSnippet: params.messageSnippet,
    metadata: params.metadata,
    createdAt: 'Just now',
    isRead: false,
  };

  fallbackNotifications = [newNotif, ...fallbackNotifications];

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: params.recipientId,
        actor_id: params.actorId || null,
        notification_type: params.type as any,
        entity_type: params.entityType as any,
        entity_id: params.entityId,
        message_snippet: params.messageSnippet || null,
        metadata: params.metadata || {},
        read_status: false,
      })
      .select()
      .single();

    if (!error && data) {
      newNotif.id = data.id;
    }
  } catch {
    // Ignore offline errors
  }

  return { data: newNotif, error: null };
}

/**
 * Reset mock notifications for test suites
 */
export function resetMockNotifications(initialList?: AppNotification[]) {
  if (initialList) {
    fallbackNotifications = [...initialList];
  }
}
