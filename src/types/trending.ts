export interface TrendingTag {
  id: string;
  tag: string;
  rawName: string;
  isHashtag: boolean;
  category: string;
  postsCount24h: number;
  authorsCount24h: number;
  trendingScore: number;
  rank: number;
  growthRatePct?: number;
  timeWindow: string;
}

export interface TrendingResponse {
  trends: TrendingTag[];
  timeWindow: '24h';
  totalPostsAnalyzed: number;
  generatedAt: string;
}

export interface HashtagDetailData {
  tag: string;
  rawName: string;
  category: string;
  rank?: number;
  growthRatePct?: number;
  postsCount24h: number;
  authorsCount24h: number;
  posts: import('./post').Post[];
}
