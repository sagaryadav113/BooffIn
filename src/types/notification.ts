import { UserProfile } from './user';
import { Paper } from './paper';
import { Post } from './post';

export type NotificationType =
  | 'like'
  | 'comment'
  | 'repost'
  | 'follow'
  | 'mention'
  | 'trending'
  | 'topic_update'
  | 'publisher_update';

export interface AppNotification {
  id: string;
  type: NotificationType;
  actor: UserProfile;
  content: string;
  targetPost?: Post;
  targetPaper?: Paper;
  targetTopicName?: string;
  createdAt: string;
  isRead: boolean;
}
