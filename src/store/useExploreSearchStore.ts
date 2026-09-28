import { create } from 'zustand';
import { SearchFilterCategory, UnifiedSearchResults } from '../api/search/types';
import { executeUnifiedSearch } from '../api/search/unifiedSearchEngine';
import { usePaperStore } from './usePaperStore';
import { appStorage } from '../api/client';

const RECENT_SEARCHES_STORAGE_KEY = '@booffin_recent_searches';

interface ExploreSearchState {
  searchQuery: string;
  activeCategory: SearchFilterCategory;
  isSearching: boolean;
  results: UnifiedSearchResults | null;
  recentSearches: string[];
  loadRecentSearches: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: SearchFilterCategory) => void;
  executeSearch: (queryOverride?: string) => Promise<void>;
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
      set({ results: null, isSearching: false });
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
      set({ results: null, isSearching: false });
      return;
    }

    set({ isSearching: true });
    get().addRecentSearch(targetQuery);

    try {
      const results = await executeUnifiedSearch(targetQuery, get().activeCategory);
      set({ results, isSearching: false });

      // Automatically hydrate found papers into in-memory paperStore
      if (results.papers && results.papers.length > 0) {
        const paperStore = usePaperStore.getState();
        results.papers.forEach((p) => {
          paperStore.addPaper(p);
        });
      }
    } catch (err) {
      console.warn('[ExploreSearchStore] Error during search:', err);
      set({ isSearching: false });
    }
  },

  clearSearch: () => {
    set({ searchQuery: '', results: null, isSearching: false });
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

