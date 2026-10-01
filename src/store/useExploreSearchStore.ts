import { create } from 'zustand';
import { SearchFilterCategory, UnifiedSearchResults } from '../api/search/types';
import {
  executeUnifiedSearch,
  loadMoreScholars,
  loadMorePapers,
} from '../api/search/unifiedSearchEngine';
import { usePaperStore } from './usePaperStore';
import { appStorage } from '../api/client';

const RECENT_SEARCHES_STORAGE_KEY = '@booffin_recent_searches';

interface ExploreSearchState {
  searchQuery: string;
  activeCategory: SearchFilterCategory;
  isSearching: boolean;
  results: UnifiedSearchResults | null;
  recentSearches: string[];
  researchersPage: number;
  hasMoreResearchers: boolean;
  isLoadingMoreResearchers: boolean;
  papersPage: number;
  hasMorePapers: boolean;
  isLoadingMorePapers: boolean;
  loadRecentSearches: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: SearchFilterCategory) => void;
  executeSearch: (queryOverride?: string) => Promise<void>;
  loadMoreResearchers: () => Promise<void>;
  loadMorePapers: () => Promise<void>;
  clearSearch: () => void;
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useExploreSearchStore = create<ExploreSearchState>((set, get) => ({
  searchQuery: '',
  activeCategory: 'all',
  isSearching: false,
  results: null,
  recentSearches: [],
  researchersPage: 1,
  hasMoreResearchers: false,
  isLoadingMoreResearchers: false,
  papersPage: 1,
  hasMorePapers: false,
  isLoadingMorePapers: false,

  loadRecentSearches: async () => {
    try {
      const raw = await appStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          set({ recentSearches: parsed });
        }
      }
    } catch {}
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    if (!query.trim()) {
      set({
        results: null,
        isSearching: false,
        researchersPage: 1,
        hasMoreResearchers: false,
        isLoadingMoreResearchers: false,
        papersPage: 1,
        hasMorePapers: false,
        isLoadingMorePapers: false,
      });
    }
  },

  setActiveCategory: (category: SearchFilterCategory) => {
    set({ activeCategory: category });
    const currentQuery = get().searchQuery.trim();
    if (currentQuery) {
      get().executeSearch();
    }
  },

  executeSearch: async (queryOverride?: string) => {
    const targetQuery = (queryOverride !== undefined ? queryOverride : get().searchQuery).trim();
    if (!targetQuery) {
      set({
        results: null,
        isSearching: false,
        researchersPage: 1,
        hasMoreResearchers: false,
        isLoadingMoreResearchers: false,
        papersPage: 1,
        hasMorePapers: false,
        isLoadingMorePapers: false,
      });
      return;
    }

    set({
      isSearching: true,
      researchersPage: 1,
      hasMoreResearchers: false,
      papersPage: 1,
      hasMorePapers: false,
    });
    get().addRecentSearch(targetQuery);

    try {
      const results = await executeUnifiedSearch(targetQuery, get().activeCategory);
      set({
        results,
        isSearching: false,
        researchersPage: 1,
        hasMoreResearchers: (results.researchers?.length || 0) >= 6,
        isLoadingMoreResearchers: false,
        papersPage: 1,
        hasMorePapers: (results.papers?.length || 0) >= 3,
        isLoadingMorePapers: false,
      });

      // Automatically hydrate found papers into in-memory paperStore
      if (results.papers && results.papers.length > 0) {
        const paperStore = usePaperStore.getState();
        results.papers.forEach((p) => {
          paperStore.addPaper(p);
        });
      }
    } catch (err) {
      console.warn('[ExploreSearchStore] Error during search:', err);
      set({ isSearching: false, isLoadingMoreResearchers: false, isLoadingMorePapers: false });
    }
  },

  loadMoreResearchers: async () => {
    const state = get();
    if (state.isLoadingMoreResearchers || !state.hasMoreResearchers || !state.searchQuery.trim()) {
      return;
    }
    const nextPage = state.researchersPage + 1;
    set({ isLoadingMoreResearchers: true });
    try {
      const more = await loadMoreScholars(state.searchQuery.trim(), nextPage, 10);
      if (!more || more.length === 0) {
        set({ hasMoreResearchers: false, isLoadingMoreResearchers: false });
        return;
      }
      const currentResults = state.results;
      if (currentResults) {
        const existingIds = new Set(currentResults.researchers.map((r) => r.id));
        const newItems = more.filter((r) => !existingIds.has(r.id));
        set({
          results: {
            ...currentResults,
            researchers: [...currentResults.researchers, ...newItems],
          },
          researchersPage: nextPage,
          hasMoreResearchers: more.length >= 6,
          isLoadingMoreResearchers: false,
        });
      } else {
        set({ isLoadingMoreResearchers: false });
      }
    } catch (err) {
      console.warn('[ExploreSearchStore] Error loading more researchers:', err);
      set({ isLoadingMoreResearchers: false });
    }
  },

  loadMorePapers: async () => {
    const state = get();
    if (state.isLoadingMorePapers || !state.hasMorePapers || !state.searchQuery.trim()) {
      return;
    }
    const nextPage = state.papersPage + 1;
    set({ isLoadingMorePapers: true });
    try {
      const more = await loadMorePapers(state.searchQuery.trim(), nextPage, 10);
      if (!more || more.length === 0) {
        set({ hasMorePapers: false, isLoadingMorePapers: false });
        return;
      }
      const currentResults = state.results;
      if (currentResults) {
        const existingIds = new Set(currentResults.papers.map((p) => p.id));
        const existingDois = new Set(
          currentResults.papers.map((p) => p.doi?.toLowerCase().trim()).filter(Boolean)
        );
        const newItems = more.filter((p) => {
          if (existingIds.has(p.id)) return false;
          if (p.doi && existingDois.has(p.doi.toLowerCase().trim())) return false;
          return true;
        });

        // Hydrate to paperStore
        const paperStore = usePaperStore.getState();
        newItems.forEach((p) => paperStore.addPaper(p));

        set({
          results: {
            ...currentResults,
            papers: [...currentResults.papers, ...newItems],
          },
          papersPage: nextPage,
          hasMorePapers: more.length >= 4,
          isLoadingMorePapers: false,
        });
      } else {
        set({ isLoadingMorePapers: false });
      }
    } catch (err) {
      console.warn('[ExploreSearchStore] Error loading more papers:', err);
      set({ isLoadingMorePapers: false });
    }
  },

  clearSearch: () => {
    set({
      searchQuery: '',
      results: null,
      isSearching: false,
      researchersPage: 1,
      hasMoreResearchers: false,
      isLoadingMoreResearchers: false,
    });
  },

  addRecentSearch: (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const current = get().recentSearches;
    const filtered = current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, 8);
    set({ recentSearches: updated });
    appStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  removeRecentSearch: (query: string) => {
    const updated = get().recentSearches.filter((item) => item !== query);
    set({ recentSearches: updated });
    appStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
    appStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY).catch(() => {});
  },
}));

// Initialize recent searches from local storage on module load
useExploreSearchStore.getState().loadRecentSearches();

