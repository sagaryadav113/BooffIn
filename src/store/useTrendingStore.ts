import { create } from 'zustand';
import { TrendingTag } from '../types/trending';
import {
  fetchTrendingTags,
  getTrendingTagsSync,
  initTrendingCache,
} from '../api/trendingService';

interface TrendingState {
  trendingTags: TrendingTag[];
  isLoading: boolean;
  isRefreshing: boolean;
  totalPostsAnalyzed: number;
  lastFetched: number;
  error: string | null;

  // Actions
  fetchTrending: (forceRefresh?: boolean) => Promise<void>;
  refreshTrending: () => Promise<void>;
}

export const useTrendingStore = create<TrendingState>((set, get) => ({
  trendingTags: getTrendingTagsSync(),
  isLoading: false,
  isRefreshing: false,
  totalPostsAnalyzed: 0,
  lastFetched: 0,
  error: null,

  fetchTrending: async (forceRefresh = false) => {
    // If we have cached tags and not forcing, prevent redundant loading spinner
    if (!forceRefresh && get().trendingTags.length > 0 && Date.now() - get().lastFetched < 180000) {
      return;
    }

    set({ isLoading: get().trendingTags.length === 0 });

    try {
      const response = await fetchTrendingTags(forceRefresh);
      set({
        trendingTags: response.trends,
        totalPostsAnalyzed: response.totalPostsAnalyzed,
        lastFetched: Date.now(),
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.message || 'Failed to calculate trending tags',
      });
    }
  },

  refreshTrending: async () => {
    set({ isRefreshing: true });
    try {
      const response = await fetchTrendingTags(true);
      set({
        trendingTags: response.trends,
        totalPostsAnalyzed: response.totalPostsAnalyzed,
        lastFetched: Date.now(),
        isRefreshing: false,
        error: null,
      });
    } catch (err: any) {
      set({
        isRefreshing: false,
        error: err?.message || 'Failed to refresh trends',
      });
    }
  },
}));

// Initialize persistent cache in background
initTrendingCache().then((cached) => {
  if (cached && cached.length > 0) {
    useTrendingStore.setState({ trendingTags: cached });
  }
});
