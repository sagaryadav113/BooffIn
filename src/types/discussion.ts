import { UserProfile } from './user';

export type DiscussionType = 'discussion' | 'question' | 'insight' | 'methodology';

export interface DiscussionReply {
  id: string;
  discussionId: string;
  author: UserProfile;
  content: string;
  mentions?: string[];
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
}

export interface DiscussionContribution {
  id: string;
  paperId: string;
  author: UserProfile;
  type: DiscussionType;
  title?: string;
  content: string;
  mentions?: string[];
  likesCount: number;
  isLiked?: boolean;
  repliesCount: number;
  createdAt: string;
  replies?: DiscussionReply[];
}

export interface InterestedPerson {
  user: UserProfile;
  reason: string;
  matchedTopics: string[];
}
