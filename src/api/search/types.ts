import { Paper, UserProfile } from '../../types';

export type SearchFilterCategory = 'all' | 'papers' | 'researchers' | 'topics';

export interface ResearcherSearchResult {
  id: string;
  fullName: string;
  handle: string;
  avatarUrl?: string;
  academicTitle?: string;
  institution?: string;
  bio?: string;
  orcidId?: string;
  orcidVerified: boolean;
  followersCount: number;
  followingCount: number;
  isRegisteredUser: boolean;
  hIndex?: number;
  citationCount?: number;
  worksCount?: number;
}

export interface TopicSearchResult {
  id: string;
  name: string;
  category?: string;
  paperCount?: number;
  followerCount?: number;
}

export interface UnifiedSearchResults {
  papers: Paper[];
  researchers: ResearcherSearchResult[];
  topics: TopicSearchResult[];
  detectedInputType?: 'doi' | 'arxiv' | 'orcid' | 'url' | 'user' | 'keyword';
  rawQuery: string;
}
