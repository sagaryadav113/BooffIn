export type AnalyticsTimeframe = '7d' | '14d' | '28d' | '60d' | '90d';

export interface DayDataPoint {
  date: string; // ISO or 'YYYY-MM-DD'
  label: string; // 'Sep 24'
  newFollowers: number;
  cumulativeFollowers: number;
  views: number;
  engagement: number; // likes + comments + reposts + saves
  postsCount: number;
  sharesCount: number;
  discussionsCount: number;
}

export interface UserAnalyticsSummary {
  timeframe: AnalyticsTimeframe;
  timeframeDays: number;
  startDate: string;
  endDate: string;
  
  // Real Core Metrics
  totalViews: number;
  totalPosts: number;
  totalShares: number;
  totalDiscussions: number;
  totalFollowers: number;
  newFollowers: number;
  totalEngagement: number; // likes + comments + shares + saves
  postClicks: number;
  
  // Growth / Rate
  engagementRate: number; // % of engagement per view
  
  // Detailed Daily Series for Graphical Forms
  dailySeries: DayDataPoint[];
  
  // Top Performing Posts in Timeframe
  topPosts: {
    id: string;
    content: string;
    createdAt: string;
    likesCount: number;
    commentsCount: number;
    repostsCount: number;
    savesCount: number;
    viewsCount: number;
    engagementCount: number;
  }[];
}
