import { UserProfile } from './user';
import { Paper } from './paper';

export type PostType = 'discussion' | 'research_share' | 'question' | 'insight';

export interface Comment {
  id: string;
  postId: string;
  author: UserProfile;
  content: string;
  parentId?: string;
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
  replies?: Comment[];
}

export interface Post {
  id: string;
  author: UserProfile;
  postType: PostType;
  content: string;
  paper?: Paper; // Referenced external paper
  images?: string[];
  topics: string[];
  visibility: 'public' | 'followers';
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  savesCount: number;
  isLiked?: boolean;
  isReposted?: boolean;
  isSaved?: boolean;
  createdAt: string;
}
