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
