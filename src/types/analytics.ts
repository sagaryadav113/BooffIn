export type AnalyticsTimeframe = '7d' | '14d' | '28d' | '60d' | '90d';

export interface DayDataPoint {
  date: string; // ISO or 'YYYY-MM-DD'
  label: string; // 'Sep 24'
  newFollowers: number;
  cumulativeFollowers: number;
  views: number; // Backwards compatible alias for impressions
  impressions: number;
  reach: number;
  engagement: number; // likes + comments + reposts + saves
  postsCount: number;
  sharesCount: number;
  discussionsCount: number;
}

export interface DisciplineBreakdown {
  name: string;
  percentage: number;
  count: number;
}

export interface InstitutionBreakdown {
  name: string;
  count: number;
  percentage: number;
}

export interface UserAnalyticsSummary {
  timeframe: AnalyticsTimeframe;
  timeframeDays: number;
  startDate: string;
  endDate: string;
  
  // Impressions & Reach (Instagram-Style)
  totalImpressions: number;
  totalViews: number; // Alias for totalImpressions for backwards compatibility
  uniqueReach: number; // Distinct individual researchers reached
  engagedScholars: number; // Distinct researchers who actively engaged
  
  // Network vs Discovery Split
  followerReachPercent: number; // % of reach from followers
  nonFollowerReachPercent: number; // % of reach from non-followers (discovery)
  
  // Real Core Counts
  totalPosts: number;
  totalShares: number;
  totalDiscussions: number;
  totalLikes: number;
  totalSaves: number;
  totalFollowers: number;
  newFollowers: number;
  totalEngagement: number; // likes + comments + shares + saves
  postClicks: number; // Deep reads & paper DOI clicks
  
  // Growth / Rate
  engagementRate: number; // % of engagement per reach
  
  // Audience Demographics (Scientific & Academic)
  topDisciplines: DisciplineBreakdown[];
  topInstitutions: InstitutionBreakdown[];
  
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
    viewsCount: number; // Impressions count
    impressionsCount: number;
    engagementCount: number;
  }[];
}

