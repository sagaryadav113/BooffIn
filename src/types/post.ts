import { UserProfile } from './user';
import { Paper } from './paper';

export type PostType = 'discussion' | 'research_share' | 'question' | 'insight' | 'article';

export interface ArticleReference {
  id: string;
  paperId?: string;
  title: string;
  authors: string[];
  publicationYear?: number;
  journal?: string;
  doi?: string;
  url?: string;
  openAccessPdfUrl?: string;
  apaFullCitation: string;
  apaInTextCitation: string;
}

export interface ArticleImage {
  id: string;
  uri: string;
  caption?: string;
  figureNumber?: number;
}

export interface ArticleSection {
  id: string;
  heading: string;
  content: string;
  images?: ArticleImage[];
}

export interface ArticleData {
  title: string;
  subheading?: string;
  authors: string[];
  abstract: string;
  sections: ArticleSection[];
  references: ArticleReference[];
  doi?: string;
  readingTimeMinutes?: number;
  isDraft?: boolean;
}

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

export interface PollOption {
  id: string;
  text: string;
  votesCount: number;
}

export interface Poll {
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId?: string;
  expiresAt?: string;
}

export interface Post {
  id: string;
  author: UserProfile;
  postType: PostType;
  content: string;
  paper?: Paper; // Referenced external paper
  images?: string[];
  poll?: Poll;
  article?: ArticleData; // Rich Long-Form Research Article
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
  rawCreatedAt?: string;
  repostedBy?: UserProfile;
  repostedAt?: string;
}

