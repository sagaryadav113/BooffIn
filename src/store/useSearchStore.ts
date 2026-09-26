import { create } from 'zustand';
import { SearchCategory, SearchResults } from '../types';
import { searchBooffIn } from '../api/search/searchService';

interface SearchState {
  query: string;
  activeCategory: SearchCategory;
  results: SearchResults;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  recentSearches: string[];

  // Actions
  setQuery: (query: string) => void;
  setCategory: (category: SearchCategory) => void;
  search: (overrideQuery?: string, overrideCategory?: SearchCategory) => Promise<void>;
  loadMore: () => Promise<void>;
  clearSearch: () => void;
  addRecentSearch: (term: string) => void;
  removeRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
  updateResearcherFollowState: (researcherId: string, isFollowing: boolean) => void;
}

const emptyResults: SearchResults = {
  query: '',
  category: 'all',
  researchers: [],
  papers: [],
  topics: [],
  discussions: [],
  totalCounts: {
    all: 0,
    researchers: 0,
    papers: 0,
    topics: 0,
    discussions: 0,
  },
  hasMore: false,
  page: 1,
};

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  activeCategory: 'all',
  results: emptyResults,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  page: 1,
  hasMore: false,
  recentSearches: [],

  setQuery: (query: string) => {
    set({ query });
  },

  setCategory: (activeCategory: SearchCategory) => {
    set({ activeCategory });
    const currentQuery = get().query.trim();
    if (currentQuery) {
      get().search(currentQuery, activeCategory);
    }
  },

  search: async (overrideQuery?: string, overrideCategory?: SearchCategory) => {
    const q = (overrideQuery !== undefined ? overrideQuery : get().query).trim();
    const cat = overrideCategory || get().activeCategory;

    if (!q) {
      set({
        results: emptyResults,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        page: 1,
        hasMore: false,
      });
      return;
    }

    set({ isLoading: true, error: null, page: 1 });

    try {
      const results = await searchBooffIn({
        query: q,
        category: cat,
        limit: 15,
        offset: 0,
        page: 1,
      });

      set({
        results,
        isLoading: false,
        error: null,
        page: 1,
        hasMore: results.hasMore,
      });

      get().addRecentSearch(q);
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Failed to execute search. Please try again.',
      });
    }
  },

  loadMore: async () => {
    const state = get();
    if (state.isLoading || state.isLoadingMore || !state.hasMore) return;

    const nextPage = state.page + 1;
    const limit = 15;
    const offset = (nextPage - 1) * limit;
    const q = state.query.trim();
    const cat = state.activeCategory;

    if (!q) return;

    set({ isLoadingMore: true });

    try {
      const newResults = await searchBooffIn({
        query: q,
        category: cat,
        limit,
        offset,
        page: nextPage,
      });

      set((prev) => {
        // Deduplicate and append
        const researchers = [
          ...prev.results.researchers,
          ...newResults.researchers.filter(
            (nr) => !prev.results.researchers.some((r) => r.id === nr.id)
          ),
        ];
        const papers = [
          ...prev.results.papers,
          ...newResults.papers.filter(
            (np) => !prev.results.papers.some((p) => p.id === np.id)
          ),
        ];
        const topics = [
          ...prev.results.topics,
          ...newResults.topics.filter(
            (nt) => !prev.results.topics.some((t) => t.id === nt.id)
          ),
        ];
        const discussions = [
          ...prev.results.discussions,
          ...newResults.discussions.filter(
            (nd) => !prev.results.discussions.some((d) => d.id === nd.id)
          ),
        ];

        return {
          results: {
            ...newResults,
            researchers,
            papers,
            topics,
            discussions,
          },
          page: nextPage,
          hasMore: newResults.hasMore,
          isLoadingMore: false,
        };
      });
    } catch (err: any) {
      set({
        isLoadingMore: false,
        error: err.message || 'Failed to load more results.',
      });
    }
  },

  clearSearch: () => {
    set({
      query: '',
      results: emptyResults,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      page: 1,
      hasMore: false,
    });
  },

  addRecentSearch: (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    set((state) => {
      const filtered = state.recentSearches.filter(
        (s) => s.toLowerCase() !== clean.toLowerCase()
      );
      return {
        recentSearches: [clean, ...filtered].slice(0, 8),
      };
    });
  },

  removeRecentSearch: (term: string) => {
    set((state) => ({
      recentSearches: state.recentSearches.filter((s) => s !== term),
    }));
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
  },

  updateResearcherFollowState: (researcherId: string, isFollowing: boolean) => {
    set((state) => ({
      results: {
        ...state.results,
        researchers: state.results.researchers.map((r) =>
          r.id === researcherId
            ? {
                ...r,
                isFollowing,
                followersCount: isFollowing
                  ? r.followersCount + 1
                  : Math.max(0, r.followersCount - 1),
              }
            : r
        ),
      },
    }));
  },
}));
