import { create } from 'zustand';
import { Paper } from '../types';
import { toggleBookmark as apiToggleBookmark, mapSupabasePaper } from '../api/socialService';
import { useAuthStore } from './useAuthStore';
import { supabase } from '../api/client';

interface PaperState {
  papers: Paper[];
  savedPaperIds: Set<string>;
  isLoading: boolean;
  fetchPapers: () => Promise<void>;
  fetchPaperById: (id: string) => Promise<Paper | null>;
  toggleSavePaper: (paperId: string, currentUserId?: string) => Promise<void>;
  toggleLikePaper: (paperId: string) => void;
  getPaperById: (id: string) => Paper | undefined;
  getPaperByDoi: (doi: string) => Paper | undefined;
  addPaper: (paper: Paper) => void;
  searchPapers: (query: string) => Paper[];
}

export const usePaperStore = create<PaperState>((set, get) => ({
  papers: [],
  savedPaperIds: new Set<string>(),
  isLoading: false,

  fetchPapers: async () => {
    set({ isLoading: true });
    try {
      const currentUserId = useAuthStore.getState().user?.id;
      const { data, error } = await supabase
        .from('papers')
        .select(`
          *,
          authors:paper_authors(author_name, author_order, affiliation),
          paper_topics(topic:topics(name)),
          bookmarks!left(user_id)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('Failed to fetch papers from Supabase:', error.message);
        set({ isLoading: false });
        return;
      }

      if (data) {
        const mappedPapers: Paper[] = data.map((row: any) => mapSupabasePaper(row, currentUserId));
        set({ papers: mappedPapers, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  fetchPaperById: async (id: string) => {
    // 1. Check local cache
    const existing = get().papers.find((p) => p.id === id || p.doi === id);
    if (existing) return existing;

    // 2. Query Supabase
    try {
      const currentUserId = useAuthStore.getState().user?.id;
      const { data, error } = await supabase
        .from('papers')
        .select(`
          *,
          authors:paper_authors(author_name, author_order, affiliation),
          paper_topics(topic:topics(name)),
          bookmarks!left(user_id)
        `)
        .or(`id.eq.${id},doi.eq.${id}`)
        .maybeSingle();

      if (error || !data) return null;

      const paper: Paper = mapSupabasePaper(data, currentUserId);

      set((state) => ({
        papers: [paper, ...state.papers.filter((p) => p.id !== paper.id)],
      }));

      return paper;
    } catch {
      return null;
    }
  },

  toggleSavePaper: async (paperId, currentUserId) => {
    const isCurrentlySaved = get().savedPaperIds.has(paperId);
    const nextSaved = new Set(get().savedPaperIds);
    if (isCurrentlySaved) {
      nextSaved.delete(paperId);
    } else {
      nextSaved.add(paperId);
    }

    // 1. Optimistic update
    set((state) => ({
      papers: state.papers.map((p) => {
        if (p.id === paperId) {
          return {
            ...p,
            isSaved: !isCurrentlySaved,
            savesCount: isCurrentlySaved ? Math.max(0, p.savesCount - 1) : p.savesCount + 1,
          };
        }
        return p;
      }),
      savedPaperIds: nextSaved,
    }));

    // 2. Real API mutation
    const userId = currentUserId || useAuthStore.getState().user.id;
    const res = await apiToggleBookmark({ paperId }, isCurrentlySaved, userId);

    // 3. Rollback if error
    if (!res.success) {
      console.warn('[usePaperStore] Save paper mutation failed, rolling back:', res.error);
      const rollbackSaved = new Set(get().savedPaperIds);
      if (isCurrentlySaved) {
        rollbackSaved.add(paperId);
      } else {
        rollbackSaved.delete(paperId);
      }
      set((state) => ({
        papers: state.papers.map((p) => {
          if (p.id === paperId) {
            return {
              ...p,
              isSaved: isCurrentlySaved,
              savesCount: isCurrentlySaved ? p.savesCount + 1 : Math.max(0, p.savesCount - 1),
            };
          }
          return p;
        }),
        savedPaperIds: rollbackSaved,
      }));
    }
  },
  toggleLikePaper: (paperId) =>
    set((state) => ({
      papers: state.papers.map((p) => {
        if (p.id === paperId) {
          const isLiked = !p.isLiked;
          return {
            ...p,
            isLiked,
            likesCount: isLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
          };
        }
        return p;
      }),
    })),
  getPaperById: (id) => get().papers.find((p) => p.id === id || (p.doi && p.doi === id)),
  getPaperByDoi: (doi) => get().papers.find((p) => p.doi && p.doi.toLowerCase() === doi.toLowerCase()),
  addPaper: (paper) =>
    set((state) => ({
      papers: [
        paper,
        ...state.papers.filter((p) => p.id !== paper.id && (!paper.doi || p.doi !== paper.doi)),
      ],
    })),
  searchPapers: (query) => {
    const q = query.toLowerCase().trim();
    if (!q) return get().papers;
    return get().papers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.abstract.toLowerCase().includes(q) ||
        p.journal.toLowerCase().includes(q) ||
        (p.doi && p.doi.toLowerCase().includes(q)) ||
        p.authors.some((a) => a.name.toLowerCase().includes(q)) ||
        p.topics.some((t) => t.toLowerCase().includes(q))
    );
  },
}));
