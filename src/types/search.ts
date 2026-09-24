import { UserProfile } from './user';
import { Paper } from './paper';
import { Topic } from './topic';
import { Post } from './post';

export type SearchCategory = 'all' | 'researchers' | 'papers' | 'topics' | 'discussions';

export interface SearchQueryParams {
  query: string;
  category?: SearchCategory;
  limit?: number;
  offset?: number;
  page?: number;
}

export interface SearchCategoryCounts {
  all: number;
  researchers: number;
  papers: number;
  topics: number;
  discussions: number;
}

export interface SearchResults {
  query: string;
  category: SearchCategory;
  researchers: UserProfile[];
  papers: Paper[];
  topics: Topic[];
  discussions: Post[];
  totalCounts: SearchCategoryCounts;
  hasMore: boolean;
  page: number;
}

export interface SearchProvider {
  search(params: SearchQueryParams): Promise<SearchResults>;
}
