import { UserProfile } from './user';
import { Paper } from './paper';
import { Post } from './post';

export type NotificationType =
  | 'follow'
  | 'like'
  | 'comment'
  | 'reply'
  | 'repost'
  | 'paper_discussion'
  | 'collaboration_request'
  | 'researcher_post'
  | 'topic_activity'
  | 'mention'
  | 'trending'
  | 'paper_share'
  | 'topic_update'
  | 'publisher_update'
  | 'system';

export type NotificationEntityType = 'post' | 'comment' | 'paper' | 'profile' | 'topic';

export interface AppNotification {
  id: string;
  type: NotificationType;
  actor: UserProfile;
  content: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  targetPost?: Post;
  targetPostId?: string;
  targetPaper?: Paper;
  targetPaperId?: string;
  targetTopicName?: string;
  targetTopicId?: string;
  targetCommentId?: string;
  messageSnippet?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  isRead: boolean;
}

export type NotificationFilter = 'All' | 'Mentions' | 'Follows' | 'Discussions' | 'Updates';
