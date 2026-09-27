import { create } from 'zustand';
import { SearchFilterCategory, UnifiedSearchResults } from '../api/search/types';
import { executeUnifiedSearch } from '../api/search/unifiedSearchEngine';
import { usePaperStore } from './usePaperStore';

interface ExploreSearchState {
  searchQuery: string;
  activeCategory: SearchFilterCategory;
  isSearching: boolean;
  results: UnifiedSearchResults | null;
  recentSearches: string[];
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: SearchFilterCategory) => void;
  executeSearch: (queryOverride?: string) => Promise<void>;
  clearSearch: () => void;
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

const DEFAULT_RECENT_SEARCHES = [
  'Molecular docking',
  'CRISPR-Cas9',
  'AlphaFold 3',
  'Transformers attention',
  '0000-0002-1825-0097',
];

export const useExploreSearchStore = create<ExploreSearchState>((set, get) => ({
  searchQuery: '',
  activeCategory: 'all',
  isSearching: false,
  results: null,
  recentSearches: DEFAULT_RECENT_SEARCHES,

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
    set({ recentSearches: [trimmed, ...filtered].slice(0, 8) });
  },

  removeRecentSearch: (query: string) => {
    set({
      recentSearches: get().recentSearches.filter((item) => item !== query),
    });
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
  },
}));
