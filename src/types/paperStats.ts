export type PaperStatsTimeframe = '1H' | '6H' | '24H' | '7D' | '30D' | 'All Time';

export interface PaperStatsDataPoint {
  timestamp: number;
  label: string;
  value: number; // e.g. 4.8
  deltaPercent: number; // e.g. 12 (+12%)
  views: number;
  discussions: number;
  votes: number;
  shares: number;
}

export interface PaperStatMetric {
  total: number;
  totalFormatted: string;
  delta: number;
  deltaFormatted: string;
  isPositive: boolean;
}

export interface PaperHypeBreakdown {
  impact: number;
  clarity: number;
  visuals: number;
}

export interface PaperStatsSummary {
  paperId: string;
  timeframe: PaperStatsTimeframe;
  timeframeLabel: string;
  currentHypeScore: number; // e.g. 4.8
  hypeMaxScore: number; // always 5
  hypeDeltaPercent: number; // e.g. +12%
  isHypePositive: boolean;
  views: PaperStatMetric;
  discussions: PaperStatMetric;
  hypeVotes: PaperStatMetric;
  shares: PaperStatMetric;
  breakdown: PaperHypeBreakdown;
  chartPoints: PaperStatsDataPoint[];
}
